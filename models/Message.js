const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatroom: {
    type: mongoose.Schema.Types.ObjectId,
    required: "Chatroom is required!",
    ref: "Chatroom",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
    required: "Message is required!",
  },
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Operator",
  },
  file:{
    type: String,
  },
  file_type:{
    type: String,
  },
  seen: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true,
}
);

module.exports = mongoose.model("Message", messageSchema);