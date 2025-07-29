import mongoose, { connect, Schema } from "mongoose";
// degining the user schema

//user schema
export const adminSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// username: { type: String, required: true },


// const connectionSchema = new Schema({
  
//   email: { type: String, required: true },
//   username: { type: String, required: true },
//   description: { type: String, required: false },
//   connections: [
//     {
//       _id: {
//         type: Schema.Types.ObjectId,
//         ref: "Connection",
//         required: false,
//         default: null,
//       }
//       // ,
//       // name:  { type: String , required : true},
//       // connection: { type: String, required: false },
//     },
//   ],
// });


export const connectionSchema = new Schema({
  phoneNumber: { type: String, required: true },
  email: { type: String, required: false },
  username: { type: String, required: false },
  description: { type: String, required: false },
  entityType: { type:String, enum:  ["Normal", "Workplace"], default: "Normal", required: false },
  connections: [
    {
      connectionId: {
        type: Schema.Types.ObjectId,
        ref: "Connection",
        required: false,
        default: null,
      },
      // ,
      // name:  { type: String , required : true},
       connection: { type: String, required: false },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});


const ConnectionModel = mongoose.model("Connection", connectionSchema);
const AdminModel = mongoose.model("Admin", adminSchema);

export { AdminModel,ConnectionModel };
