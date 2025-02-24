import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import connectdb from "./db/connection";
import { AdminModel, ConnectionModel } from "./db/models";
import autheticateMiddlware from "./middleware";
import jwt from "jsonwebtoken";
import cors from "cors";
import mongoose, { Connection, Mongoose, ObjectId, Types } from "mongoose";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
connectdb();

function toGraphData(connections: any, currentNode: any, name: any): any {
  if (!currentNode || !connections) {
    return { nodes: [], edges: [] };
  }

  const nodes: any = [];
  const edges: any = [];

  // Find the connection type for the current node
  const nodeConnection = connections.find((conn: any) => conn.id === currentNode)?.connection;

  // Add the current node
  nodes.push({
    id: currentNode,
    label: name || 'Unknown',
    x: Math.random() * 10,
    y: Math.random() * 10,
    size: 20,
    color: nodeConnection === "Workplace"  ? "blue" : "red",
    description: "hello"
  });

  // Add connected nodes and their edges
  connections.forEach((connection: any) => {
    if (!connection?.id) return; // Skip invalid connections

    nodes.push({
      id: connection.id,
      label: connection.name || 'Unknown',
      x: Math.random() * 10,
      y: Math.random() * 10,
      size: 20,
      color: connection.connection === "Workplace" ? "blue" : "red",
      description: connection.description
    });
    edges.push({ 
      source: currentNode,
      target: connection.id, 
      label: connection.connection || '', 
      color: "gray" 
    });
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
      const { connections } = req.body;
      console.log(connections);
       let  present = false
      await Promise.all(
        connections.map(async (connection: any) => {
          const connect = connection;
          console.log("connect", connect);

          // Find or create main user atomically
          let mainUser = await ConnectionModel.findOneAndUpdate(
            { email: connect.mainUserEmail },
            { $setOnInsert: { email: connect.mainUserEmail, username: connect.mainUserName } },
            { new: true, upsert: true }
          );

          // Find or create connected user atomically
          let conUser = await ConnectionModel.findOneAndUpdate(
            { email: connect.conUserEmail },
            { $setOnInsert: { email: connect.conUserEmail, username: connect.conUserName } },
            { new: true, upsert: true }
          );

          const id = conUser._id;
          console.log("User ID:", id);

          // First check if the connection already exists, update if found
          let updatedUser1 = await ConnectionModel.findOneAndUpdate(
            { _id: id, "connections.id": mainUser._id },
            { $set: { "connections.$.connection": connect.connection } },
            { new: true, runValidators: true }
          );
          if(updatedUser1){
            present = true
          }
          // If no existing connection, push a new connection
          if (!updatedUser1) {
            updatedUser1 = await ConnectionModel.findByIdAndUpdate(
              id,
              { $push: { connections: { id: mainUser._id, name: mainUser.username, connection: connect.connection } } },
              { new: true, runValidators: true }
            );
          }

          console.log("Updated User 1:", updatedUser1);

          // Check if the second user has the connection
          let updatedUser2 = await ConnectionModel.findOneAndUpdate(
            { _id: mainUser._id, "connections.id": id },
            { $set: { "connections.$.connection": connect.connection } },
            { new: true, runValidators: true }
          );
          if(updatedUser2){
            present = true
          }

          // If no existing connection, push a new connection
          if (!updatedUser2) {
            updatedUser2 = await ConnectionModel.findByIdAndUpdate(
              mainUser._id,
              { $push: { connections: { id: id, name: conUser.username, connection: connect.connection } } },
              { new: true, runValidators: true }
            );
          }

          console.log("Updated User 2:", updatedUser2);
        })
      );

      return res.status(200).json({ message: "Connections added successfully" , present});
    } catch (error) {
      console.error("Error adding connection:", error);
      return res.status(500).json({ message: "Internal server error", error: (error as any).message });
    }
  }
);

// get connections of a current user
app.get("/api/v1/connections", autheticateMiddlware, async (req, res): Promise<any> => {
    try {
        const users = await ConnectionModel.find()
            .populate("connections", "name connection" ) 
            .lean(); // Use lean() for better performance when you only need JSON data

        if (!users?.length) {
            return res.status(200).json({ data: { nodes: [], edges: [] } });
        }

        // Use reduce instead of forEach for better performance and cleaner code
        const output = users.reduce((acc: any, user: any) => {
          if (!user?.username) {
            return acc; // Skip this iteration if username is null
          }
          
          const { nodes, edges } = toGraphData(user.connections, user._id, user.username);
          
          // Use Set to ensure unique nodes and edges
          const uniqueNodes = new Set([...acc.nodes, ...nodes]);
          const uniqueEdges = new Set([...acc.edges, ...edges]);

          return {
            nodes: Array.from(uniqueNodes),
            edges: Array.from(uniqueEdges)
          };
        }, { nodes: [], edges: [] });

        return res.status(200).json({ data: output });
    } catch (error) {
        console.error('Error fetching connections:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch connections',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// get particular user connections by id
app.get(
  "/api/v1/connections/:email",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
    const { email } = req.params;
    console.log(email);
    console.log("hitting here")
    const user = await ConnectionModel.findOne({email:email}).populate(
      "connections"
    );
    console.log("user")
    console.log(user)
    console.log(user);
    if (user == null || user.connections == null) {
      return res.status(404).json({ users: [] });
    } else {
     
      return res.status(200).json({ users: [user] });
    }
  }
);
  // get connections of a user by user lookup

  app.get(
    "/api/v1/connection/:id",
    autheticateMiddlware,
    async (req, res): Promise<any> => {
        const { id } = req.params;
      console.log(id);
  
      if(id == null){
        return res.status(400).json({ message: "id is required" });
      }

      if( typeof id !== "string"){
        return res.status(400).json({ message: "id is not a string" });
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "id is not a valid object id" });
      }
      const user = await ConnectionModel.findOne({ _id: id }).populate(
        "connections"
      );
      console.log("user")
      console.log(user)
      console.log(user);
      if (user == null || user.connections == null) {
        return res.status(404).json({ connections: [] });
      } else {
        const { nodes, edges } = toGraphData(user.connections, user.id, user.username);
        return res.status(200).json({ data: { nodes, edges } });
      }
    }
  );

// route for search by query prams 
app.get(
  "/api/v1/search",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
     const { name, email } = req.query;

     console.log(name, email)

     if(name ==  "" && email == ""){
      const users = await ConnectionModel.find().populate("connections");
      const output = {
        nodes: [] as any[],
        edges: [] as any []
      }
      console.log("users")
      console.log(users)
      users.forEach((user) => {
        let data = toGraphData(user.connections, user.id , user.username)
          let nodes=data.nodes
           
           let edges = data.edges
          
           output.nodes.push(...nodes)
           output.edges.push(...edges)
      });
      
      console.log("output")
      console.log(output)
      return res.status(200).json({ data : output});
     }
    
    const userData = await ConnectionModel.findOne({
      $and: [
        { username: { $regex: name, $options: "i" } },
        { email: { $regex: email, $options: "i" } }
      ]
    });
      
 
    console.log(userData);
    if (userData == null || userData?.connections == null) {
      return res.status(404).json({ connections: [] });
    } else {
      const data =      toGraphData(userData.connections, userData._id , userData.username)
      return res.status(200).json({ data });
    }
  }
);

app.post("/api/v1/addUser", autheticateMiddlware, async (req: Request, res: Response): Promise<any> => {
  const {  email, username, description } = req.body;
  console.log( email, username, description)

  try{
  const user1 = await ConnectionModel.findOne({ email});
  if(user1){
    console.log("user already exists")
      return res.status(201).json({ message: "user already exists" });

  }
  const user = await ConnectionModel.create({ email, username, description });
  return res.status(201).json({ user });
}
catch(error){
  return res.status(500).json({ message: "Internal server error", error: (error as any).message });
}
})

app.post("/api/v1/updateUser", autheticateMiddlware, async (req: Request, res: Response): Promise<any> => {
  const { prevEmail, email, username, description } = req.body;
  console.log(prevEmail, email, username, description);
  try {
    // Find the user to update
    const userToUpdate = await ConnectionModel.findOne({ email: prevEmail });
    if (!userToUpdate) {
      return res.status(400).json({ message: "user not exists" });
    }

    // Update the main user
    const updatedUser = await ConnectionModel.findByIdAndUpdate(
      userToUpdate._id, 
      { email, username, description }, 
      { new: true }
    );

    // Update this user's name in all other users' connections
    await ConnectionModel.updateMany(
      { "connections.id": userToUpdate._id },
      { $set: { "connections.$.name": username } }
    );

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: (error as any).message });
  }
});

app.post("/api/v1/deleteuser", autheticateMiddlware, async (req: Request, res: Response): Promise<any> => {
  const { id } = req.body;
  console.log(id)
  try{
  const user = await ConnectionModel.findByIdAndDelete(id);
  return res.status(200).json({ user });
}
catch(error){
  return res.status(500).json({ message: "Internal server error", error: (error as any).message });
}
})


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
