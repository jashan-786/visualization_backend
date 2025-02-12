import mongoose, { connect, Schema } from "mongoose";
// degining the user schema

//user schema
const adminSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

// username: { type: String, required: true },


const connectionSchema = new Schema({
  
  email: { type: String, required: true },
  username: { type: String, required: true },
  connections: [
    {
      id: {
        type: Schema.Types.ObjectId,
        ref: "connectionSchema",
        required: false,
        default: null,
      },
      name:  { type: String , required : true},
      connection: { type: String, required: false },
    },
  ],
});


const ConnectionModel = mongoose.model("Connection", connectionSchema);
const AdminModel = mongoose.model("Admin", adminSchema);

export { AdminModel,ConnectionModel };
