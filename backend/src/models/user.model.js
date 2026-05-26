import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    pinnedChats: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true },
);

//for removing unverified users in 24 hours from database
userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // 24 ghante
    partialFilterExpression: { isVerified: false },
  },
);

const User = mongoose.model("User", userSchema);

export default User;
