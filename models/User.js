const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: "Name is required!",
    },
    email: {
      type: String,
      required: "Email is required!",
    },
    password: {
      type: String,
      required: "Password is required!",
      minlength: 6
    },
    avatar: {
      type: String,
      required: "Avatar is required!",
      default: "user.png"
    },
    phone: {
      type: String,
      required: "Phone is required!",
      minlength: 8
    },
    Register: {
      type: String,
      required: "Register is required!",
    },
    Address: {
      type: String,
    },
    Signature: {
      type: String,
      required: "Signature is required!",
    },
    Online: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);