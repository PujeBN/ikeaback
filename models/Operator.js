const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: "Email is required!",
    },
    password: {
      type: String,
      required: "Password is required!",
      minlength: 6
    },
    phone: {
        type: String,
        required: "Required",
        minlength: 8
    },
    firstname: {
        type: String,
        required: "Required"
    },
    lastname: {
        type: String,
        required: "Required"
    },
    avatar: {
        type: String,
        required: "Required",
        default: "operator.png"
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

module.exports = mongoose.model("Operator", operatorSchema);