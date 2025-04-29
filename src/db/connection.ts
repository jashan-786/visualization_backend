import mongoose from "mongoose";
import { AdminModel, adminSchema, connectionSchema } from "./models";
import dotenv from "dotenv";
dotenv.config();
const connectdb = async () => {
  try {
    const con = await mongoose.connect(
      `mongodb+srv://hsiskesks:${process.env.MONGO_PASS}@cluster0.eggov.mongodb.net/visualization` as string
    );

    console.log(`MongoDB connected: ${con.connection.host}`);
  } catch (err) {
    console.log(err);
  }
};

export const connectbackupdb = async () => {
  try {
    const con = await mongoose.createConnection(
     `mongodb+srv://hsiskesks:${process.env.MONGO_PASS}@cluster0.eggov.mongodb.net/visualizationbackup` as string
    );

    console.log(`MongoDB connected backup:`);

    const BackupAdminModel= con.model("AdminBackup", adminSchema);
    const BackupConnectionModel = con.model("ConnectionsBackup", connectionSchema);

    return {con, BackupAdminModel, BackupConnectionModel};
  } catch (err) {
    console.log(err);
  }
};

export default connectdb;
