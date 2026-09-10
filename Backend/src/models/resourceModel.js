const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      type: String,
      trim: true,
      default: "Alumni",
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      trim: true,
      default: "Career",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Resource = mongoose.model("Resource", resourceSchema);

module.exports = Resource;
