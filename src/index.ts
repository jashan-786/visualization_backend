import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import connectdb, { connectbackupdb } from "./db/connection";
import { AdminModel, ConnectionModel } from "./db/models";
import autheticateMiddlware from "./middleware";
import jwt from "jsonwebtoken";
import cors from "cors";
import mongoose, { connection, Connection, connections, Mongoose, ObjectId, Types } from "mongoose";
import cron from "node-cron";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import fs from "fs";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
connectdb();


//cron for backup

cron.schedule('0 0 * * *', async () => {
  console.log('Running DB replication...');

  try {

    const admins= await AdminModel.find({});
    const users= await ConnectionModel.find({});

 const connection= await connectbackupdb()
 await connection?.BackupAdminModel.deleteMany({});
 await connection?.BackupAdminModel.insertMany(admins);

 await connection?.BackupConnectionModel.deleteMany({});
 await connection?.BackupConnectionModel.insertMany(users);
 console.log("Backup completed successfully");

 await connection?.con.close();
  } catch (error) {
    console.error('Error in backup:', error);
  }
});

function toGraphData(connections: any, currentNode: any, description:any , name: any ,email: string, phoneNumber: string,  entityType?: string ): any {

  console.log("CurrendtNode", currentNode.toString());
  console.log("Connections");
  console.log(connections);
  if (!currentNode || !connections) {
    return { nodes: [], edges: [] };
  }

  const nodes: any = [];
  const edges: any = [];
  

  // Add the current node
  nodes.push({
    id: currentNode,
    label: name || 'Unknown',
    x: Math.random() * 10,
    y: Math.random() * 10,
    size: 20,
    type: entityType,
    color: entityType === "Workplace"  ? "blue" : "red",
    description:  description,
    email: email,
    phoneNumber: phoneNumber
    
  });

  
  // Add connected nodes and their edges
  connections.forEach((connection: any) => {

    
    if (!connection?.connectionId?._id) return; // Skip invalid connections

    nodes.push({
      id: connection.connectionId._id,
      label: connection.connectionId.username ,
      x: Math.random() * 10,
      y: Math.random() * 10,
      size: 20,
       color:  connection.connectionId.entityType === "Workplace"  ? "blue" : "red",
      description: connection.connectionId.description,
      email: connection.connectionId.email,
      phoneNumber: connection.connectionId.phoneNumber,
      type: entityType,

    });
    
    edges.push({ 
      source: currentNode,
      target: connection.connectionId._id, 
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
            { phoneNumber: connect.mainPhone },
            { $setOnInsert: { phoneNumber: connect.mainPhone, email: connect.mainUserEmail, username: connect.mainUserName, entityType: connect.entityType } },
            { new: true, upsert: true }
          );

          // Find or create connected user atomically
          let conUser = await ConnectionModel.findOneAndUpdate(
            { phoneNumber: connect.conPhone },
            { $setOnInsert: { phoneNumber: connect.conPhone, email: connect.conUserEmail, username: connect.conUserName } },
            { new: true, upsert: true }
          );

          const id = conUser._id;
          console.log("User ID:", id);

          // First check if the connection already exists, update if found
          let updatedUser1 = await ConnectionModel.findOneAndUpdate(
            { _id: id, "connections.connectionId": mainUser._id },
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
              // { $push: { connections: { _id: mainUser._id, name: mainUser.username, connection: connect.connection } } },
              { $push: { connections: { connectionId: mainUser._id, connection: connect.connection } } },
              
               { new: true, runValidators: true }
            );
          }

          console.log("Updated User 1:", updatedUser1);

          // Check if the second user has the connection
          let updatedUser2 = await ConnectionModel.findOneAndUpdate(
            { _id: mainUser._id, "connections.connectionId": id },
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
            //  { $push: { connections: { _id: id, name: conUser.username, connection: connect.connection } } },
            { $push: { connections: { connectionId: id,  connection: connect.connection } } },
             
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
// not used too much
// get connections of a current user
app.get("/api/v1/connections", autheticateMiddlware, async (req, res): Promise<any> => {
    try {
        const users = await ConnectionModel.find()
            .populate("connections", "username email description enityType phoneNumber" ) 
            .lean(); // Use lean() for better performance when you only need JSON data

        if (!users?.length) {
            return res.status(200).json({ data: { nodes: [], edges: [] } });
        }

        // Use reduce instead of forEach for better performance and cleaner code
        const output = users.reduce((acc: any, user: any) => {
          if (!user?.username) {
            return acc; // Skip this iteration if username is null
          }
          
          const { nodes, edges } = toGraphData(user.connections, user._id, user.description, user.username , user.email, user.phoneNumber, user.entityType as string);
          
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
        "connections.connectionId" , "username email description entityType phoneNumber" 
      );

      console.log("user")
      console.log(user)
      console.log(user);
      if (user == null || user.connections == null) {
        return res.status(404).json({ connections: [] });
      } else {
        const { nodes, edges } = toGraphData(user.connections, user.id,  user.description , user.username, user.email, user.phoneNumber, user.entityType as string);
        return res.status(200).json({ data: { nodes, edges } });
      }
    }
  );

// route for search by query prams 
app.get(
  "/api/v1/search",
  autheticateMiddlware,
  async (req, res): Promise<any> => {
     const { name, email , phoneNumber} = req.query;

     console.log(name, email)

     if(name ==  "" && email == "" && phoneNumber == ""){

      const users = await ConnectionModel.find().populate("connections.connectionId" , "username email description entityType phoneNumber").lean();
      const output = {
        nodes: [] as any[],
        edges: [] as any []
      }
      console.log("users")
      console.log(users)
      users.forEach((user) => {
        console.log("Connections")
        console.log(user.connections) 
        let data = toGraphData(user.connections, user._id , user.description , user.username, user.email, user.phoneNumber, user.entityType as string)
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
        { email: { $regex: email, $options: "i" } },
        { phoneNumber: { $regex: phoneNumber, $options: "i" } },
      ]
    }).populate("connections.connectionId" , "username email description entityType phoneNumber").lean();
      
 
    console.log(userData);
    if (userData == null || userData?.connections == null) {
      return res.status(404).json({ connections: [] });
    } else {
      const data =      toGraphData(userData.connections, userData._id , userData.description , userData.username , userData.email, userData.phoneNumber, userData.entityType as string);
      return res.status(200).json({ data });
    }
  }
);

//route for downloading all connection in one pdf file

app.get("/api/v1/download-connections", autheticateMiddlware, async (req, res): Promise<any> => {

  try{ 
  const connections= await ConnectionModel.find({}).populate("connections.connectionId" , "username email description entityType phoneNumber")
 
    const doc = new PDFDocument();

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=connections.pdf");

    // Pipe the PDF into the response
    doc.pipe(res);

    doc.fontSize(20).text("All Connections", { underline: true });
    doc.moveDown();

    connections.forEach((conn, idx) => {
      doc
        .fontSize(12)
        .text(`#${idx + 1}`)
        .text(`Name: ${conn.username}`)
        .text(`Email: ${conn.email}`)
        .text(`Phone: ${conn.phoneNumber}`)
        .text(`Description: ${conn.description || "N/A"}`)
        .text(`Entity Type: ${conn.entityType || "Normal"}`)
        .text(`Created At: ${conn.createdAt}`)
        .moveDown();



        conn.connections.forEach((connection: any) => {
          if (connection.connectionId) {
            doc
              .fontSize(10)
              .text(`  - Connected to: ${connection.connectionId.username}`)
              .text(`    Email: ${connection.connectionId.email}`)
              .text(`    Phone: ${connection.connectionId.phoneNumber}`)
              .text(`    Description: ${connection.connectionId.description || "N/A"}`)
              .text(`    Entity Type: ${connection.connectionId.entityType || "Normal"}`)
              .moveDown();
          }
  
          doc.moveDown(); 
        }
      )
     
   // Add some space between connections
    
  
   

  })

  doc.end(); // Finalize PDF

}
catch(error){
  console.log(error)
  return res.status(500).json({ message: "Internal server error", error: (error as any).message });


}

})
// add user
app.post("/api/v1/addUser", autheticateMiddlware, async (req: Request, res: Response): Promise<any> => {
  const {  email, username, description, entityType, phoneNumber } = req.body;
  console.log( email, username, description, entityType, phoneNumber);

  try{
  const user1 = await ConnectionModel.findOne({ phoneNumber});
  if(user1){
    console.log("user already exists")
      return res.status(200).json({ message: "user already exists" });

  }
  const user = await ConnectionModel.create({ email, username, description, entityType , phoneNumber });
  return res.status(201).json({ user });
}
catch(error){
  return res.status(500).json({ message: "Internal server error", error: (error as any).message });
}
})

// update user
app.post("/api/v1/updateUser", autheticateMiddlware, async (req: Request, res: Response): Promise<any> => {

  const { prevPhone, newPhone, email, username, description, entityType } =req.body;

  console.log(prevPhone, newPhone, email, username, description, entityType);
  try {
    // Find the user to update
    const userToUpdate = await ConnectionModel.findOne({ phoneNumber: prevPhone });
    if (!userToUpdate) {
      return res.status(400).json({ message: "user not exists" });
    }

    // Update the main user
    const updatedUser = await ConnectionModel.findByIdAndUpdate(
      userToUpdate._id, 
      { phoneNumber: newPhone , email, username, description,entityType }, 
      { new: true }
    );
    

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: (error as any).message });
  }
});


// delete user
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
