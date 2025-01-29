import mongoose from "mongoose";

const connectdb = async () => {
  try {
    const con = await mongoose.connect("");

    console.log(`MongoDB connected: ${con.connection.host}`);
  } catch (err) {
    console.log(err);
  }
};

export default connectdb;
