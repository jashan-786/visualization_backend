import mongoose from "mongoose";

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

export default connectdb;
