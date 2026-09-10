const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  role: {
    type: String,
    default: "admin",
  },
  imageUrl: String,
  fileType: String,
  originalFileName: String,
});

var Admin = mongoose.model("Admin", AdminSchema);
module.exports = { Admin };
