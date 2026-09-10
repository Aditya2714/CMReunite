const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["account", "mentorship", "referral", "event", "announcement", "message", "connection", "system"],
      default: "system",
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: "" },
    readAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, "metadata.reminderKey": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
