const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
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
    tag: {
      type: String,
      trim: true,
      default: "Career Journey",
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

const Story = mongoose.model("Story", storySchema);

module.exports = Story;
