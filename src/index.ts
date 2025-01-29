import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import connectdb from "./db/connection";
import { UserModel } from "./db/models";
import autheticateMiddlware from "./middleware";
import jwt from "jsonwebtoken";
import cors from "cors";
import { ObjectId, Types } from "mongoose";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
connectdb();

function toGraphData(connections: any, curretNode: any): any {
  const nodes: any = [];
  const edges: any = [];
  nodes.push({
    id: curretNode,
    label: "Me",
    x: Math.random() * 10,
    y: Math.random() * 10,
    size: 10,
    color: "red",
  });
  connections.forEach((connection: any) => {
    nodes.push({
      id: connection.id,
      label: connection.connection,
      x: Math.random() * 10,
      y: Math.random() * 10,
      size: 10,
      color: "red",
    });
    edges.push({ source: nodes[0].id, target: connection.id, color: "gray" });
  });

  return { nodes, edges };
}
// Routes
// add a user to the database
app.post("/", async (req, res): Promise<any> => {
  const { username, email } = req.body;
  console.log(req.body);

  // create a user

  // if user exists
  const user = await UserModel.findOne({ email });
  let token = null;

  if (user) token = jwt.sign({ userId: user._id }, "2131d");

  if (user) {
    return res.status(400).json({ message: "user already}) exists", token });
  }

  try {
    const newuser = await UserModel.create({ username, email });
    return res
      .status(200)
      .json({ message: "user created successfully", token });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "user not created" });
  }
});

// adding a connection to a user

app.post(
  "/connection",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    const connect = req.body;

    console.log(req.body);
    // Add your logic here,
    const conId = connect.email;
    const conUser = await UserModel.findOne({ email: conId });

    const id = conUser ? conUser._id : null;
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.body.userId,
      { $push: { connections: { id, connection: connect.connection } } },
      { new: true, runValidators: true }
    );

    console.log(updatedUser);

    if (updatedUser) {
      return res.status(200).json({ message: "connection added successfully" });
    } else {
      return res.status(400).json({ message: "connection not added" });
    }
  }
);

app.get(
  "/connections",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    const email = req.query.email as string;
    console.log(email);
    const user = await UserModel.findOne({ email }).populate("connections");
    if (user == null || user.connections == null) {
      return res.status(404).json({ connections: [] });
    } else {
      const data = toGraphData(user.connections, user._id);
      return res.status(200).json({ data });
    }
  }
);
// get particular user connections by id
app.get(
  "/connections/:id",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    const { id } = req.params;
    console.log(id);

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const user = await UserModel.findById(id as unknown as ObjectId).populate(
      "connections"
    );
    console.log(user);
    if (user == null || user.connections == null) {
      return res.status(404).json({ connections: [] });
    } else {
      const data = toGraphData(user.connections, user._id);
      return res.status(200).json({ data });
    }
  }
);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
