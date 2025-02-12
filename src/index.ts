import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import connectdb from "./db/connection";
import { AdminModel, ConnectionModel } from "./db/models";
import autheticateMiddlware from "./middleware";
import jwt from "jsonwebtoken";
import cors from "cors";
import { Connection, ObjectId, Types } from "mongoose";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
connectdb();

function toGraphDataByCurrentNode(connections: any, curretNode: any): any {
  const nodes: any = [];
  const edges: any = [];

  console.log("connections ")
  console.log(connections)
  nodes.push({
    id: curretNode,
    label:  "Me",
    x: Math.random() * 10,
    y: Math.random() * 10,
    size: 3,
    color: "red",
  });
  connections.forEach((connection: any) => {

    console.log("connection")
    console.log( connection)
    nodes.push({
      id: connection.id,
      label: connection.name,
      x: Math.random() * 10,
      y: Math.random() * 10,
      size: 20,
      color: "red",
    });
    edges.push({ source: nodes[0].id, target: connection.id, label: connection.connection, color: "gray" });
  });

  return { nodes, edges };
}

function toGraphData(connections: any): any {
  const nodes: any = [];
  const edges: any = [];

  console.log("connections ")
  console.log(connections)

  connections.forEach((connection: any) => {

    console.log("connection")
    console.log( connection)
    nodes.push({
      id: connection.id,
      label: connection.name,
      x: Math.random() * 10,
      y: Math.random() * 10,
      size: 20,
      color: "red",
    });
    edges.push({ source: nodes[0].id, target: connection.id, label: connection.connection, color: "gray" });
  });

  return { nodes, edges };
}
// Routes
// add a user to the database
app.post("/api/v1/signup", async (req, res): Promise<any> => {
  const { username, email, password } = req.body;
  console.log(req.body);

  // create a user

  // if user exists
  const user = await AdminModel.findOne({ email });

  if (user) {
    return res.status(400).json({ message: "user already}) exists" });
  }

  try {
    const newuser = await AdminModel.create({ username, email, password });
    return res.status(200).json({ message: "user created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "user not created" });
  }
});

// sign in a user
app.post("/api/v1/signin", async (req, res): Promise<any> => {
  const { email, password } = req.body;
  console.log("here");
  console.log(req.body);

  // create a user

  // if user exists
  const user = await AdminModel.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "user does not exist" });
  }
  let token = null;

  token = jwt.sign({ userId: user._id ,  userName: user.username }, "2131d");

  try {
    res

      .status(200)

      .json({ token });
    console.log(res);
    return res;
  } catch (error) {
    console.log("here");
    console.log(error);
    return res.status(400).json({ message: "user not signed in" });
  }
});

// adding a connection to a user

app.post(
  "/api/v1/addconnection",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    try {
      const connect = req.body;
      console.log("body ", req.body);

      // Find user by email if not present create a new one
      let mainUser = await ConnectionModel.findOne({ email: req.body.mainUserEmail });
      if (!mainUser) {
        const newUser = await ConnectionModel.create({ email: req.body.mainUserEmail , username: req.body.mainUserName });
        mainUser = newUser;
      }

      // Find user by email if not present create a new one
      let conUser = await ConnectionModel.findOne({ email: req.body.conUserEmail });
      if (!conUser) {
        const newUser = await ConnectionModel.create({ email: req.body.conUserEmail , username: req.body.conUserName });
        conUser = newUser;
      }

      const id = conUser._id;
      console.log("User ID:", id);

      // First check if the connection already exists, update if found
      let updatedUser1 = await ConnectionModel.findOneAndUpdate(
        { _id: id, "connections.id":  mainUser._id },
        { $set: { "connections.$.connection": connect.connection } },
        { new: true, runValidators: true }
      );

      // If no existing connection, push a new connection
      if (!updatedUser1) {
        updatedUser1 = await ConnectionModel.findByIdAndUpdate(
          id,
          { $push: { connections: { id: mainUser._id, name: connect.mainUserName, connection: connect.connection } } },
          { new: true, runValidators: true }
        );
      }

      console.log("Updated User 1:", updatedUser1);

      // Check if the second user (req.body.userId) has the connection
      let updatedUser2 = await ConnectionModel.findOneAndUpdate(
        { _id: mainUser._id, "connections.id": id },
        { $set: { "connections.$.connection": connect.connection } },
        { new: true, runValidators: true }
      );

      // If no existing connection, push a new connection
      if (!updatedUser2) {
        updatedUser2 = await  ConnectionModel.findByIdAndUpdate(
          mainUser._id,
          { $push: { connections: { id: id, name: connect.conUserName,  connection: connect.connection } } },
          { new: true, runValidators: true }
        );
      }

      console.log("Updated User 2:", updatedUser2);

      if (updatedUser1 || updatedUser2) {
        return res.status(200).json({ message: "Connection added successfully" });
      } else {
        return res.status(400).json({ message: "Connection not added" });
      }
    } catch (error) {
      console.error("Error adding connection:", error);
      return res.status(500).json({ message: "Internal server error", error: (error as any).message  });
    }
  }
);

// get connections of a current user
app.get("/api/v1/connections", autheticateMiddlware, async (req, res): Promise<any> => {
    const users = await ConnectionModel.find().populate("connections");
    if (!users || users.length === 0) {
      return res.status(404).json({ connections: [] });
    }

    // Combine all users' connections into one dataset
    const allConnections = users.flatMap(user => user.connections || []);
    const data = toGraphData(allConnections);
    return res.status(200).json({ data });
});

// get particular user connections by id
app.get(
  "/api/v1/connections/:id",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    const { id } = req.params;
    console.log(id);

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const user = await ConnectionModel.findById(id as unknown as ObjectId).populate(
      "connections"
    );
    console.log(user);
    if (user == null || user.connections == null) {
      return res.status(404).json({ connections: [] });
    } else {
      const data = toGraphDataByCurrentNode(user.connections, user._id);
      return res.status(200).json({ data });
    }
  }
);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
