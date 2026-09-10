const mongoose = require("mongoose");

const forumReplySchema = new mongoose.Schema(
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
    message: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

const forumTopicSchema = new mongoose.Schema(
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
    category: {
      type: String,
      trim: true,
      default: "Careers",
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    replies: [forumReplySchema],
  },
  { timestamps: true }
);

const ForumTopic = mongoose.model("ForumTopic", forumTopicSchema);

module.exports = ForumTopic;
