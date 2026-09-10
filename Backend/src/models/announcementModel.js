const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      default: "All branches",
    },
    batch: {
      type: String,
      default: "All batches",
    },
    message: {
      type: String,
      required: true,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentType: {
      type: String,
      enum: ["image", "pdf", null],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

module.exports = Announcement;
