const mongoose = require("mongoose");

const chatroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: "Name is required"
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    required: "Operator is required!",
    ref: "Operator",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: "user is required!",
    ref: "User",
  },
});

module.exports = mongoose.model("Chatroom", chatroomSchema);