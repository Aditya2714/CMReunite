const mongoose = require("mongoose");

const recognitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    achievement: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      default: "Not added",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      default: "",
    },
    originalFileName: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Achievement",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Recognition = mongoose.model("Recognition", recognitionSchema);

module.exports = Recognition;
