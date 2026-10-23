const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, alias: "createdBy" },
  authorName: { type: String, trim: true, default: "Alumni" },
  title: { type: String, trim: true, required: true },
  content: { type: String, trim: true, required: true, alias: "description" },
  category: { type: String, trim: true, alias: "tag" },
  legacySource: { type: String, select: false },
}, { timestamps: true, discriminatorKey: "postType", collection: "posts" });
schema.index({ createdAt: -1, _id: -1 });
module.exports = mongoose.model("Post", schema);
