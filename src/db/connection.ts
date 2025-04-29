import mongoose from "mongoose";
import { AdminModel, adminSchema, connectionSchema } from "./models";

const connectdb = async () => {
  try {
    const con = await mongoose.connect(
      `mongodb+srv://hsiskesks:AT2HQJgdC0NksiB3@cluster0.eggov.mongodb.net/visualization` as string
    );

    console.log(`MongoDB connected: ${con.connection.host}`);
  } catch (err) {
    console.log(err);
  }
};

export const connectbackupdb = async () => {
  try {
    const con = await mongoose.createConnection(
      `mongodb+srv://hsiskesks:AT2HQJgdC0NksiB3@cluster0.eggov.mongodb.net/visualizationbackup` as string
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
