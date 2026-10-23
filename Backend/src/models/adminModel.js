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
  mobileNumber: {
    type: String,
    trim: true,
    maxlength: 30,
    default: "",
  },
  officialDesignation: {
    type: String,
    enum: [
      "",
      "Head of Department",
      "Professor",
      "Associate Professor",
      "Assistant Professor",
      "Placement Officer",
      "Department Coordinator",
      "Administrative Staff",
      "Other",
    ],
    default: "",
  },
  customDesignation: {
    type: String,
    trim: true,
    maxlength: 100,
    default: "",
  },
  imageUrl: String,
  fileType: String,
  originalFileName: String,
});

var Admin = mongoose.model("Admin", AdminSchema);
module.exports = { Admin };
