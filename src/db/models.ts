import mongoose, { connect, Schema } from "mongoose";
// degining the user schema

//user schema
const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  // "password": {type: String, required: true},
  connections: [
    {
      id: {
        type: Schema.Types.ObjectId,
        ref: "userSchema",
        required: false,
        default: null,
      },
      connection: { type: String, required: false },
    },
  ],
});

const UserModel = mongoose.model("User", userSchema);

export { UserModel };
