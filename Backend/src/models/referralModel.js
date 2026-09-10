const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requesterName: {
      type: String,
      trim: true,
      default: "Alumni",
    },
    requesterEmail: {
      type: String,
      trim: true,
      required: true,
    },
    targetRole: {
      type: String,
      trim: true,
      required: true,
    },
    company: {
      type: String,
      trim: true,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedToName: { type: String, trim: true, default: "" },
    resumeUrl: { type: String, trim: true, default: "" },
    jobUrl: { type: String, trim: true, default: "" },
    deadline: Date,
    status: {
      type: String,
      enum: ["pending", "reviewing", "assigned", "shared", "successful", "requested", "under_review", "referred", "interviewing", "selected", "rejected", "withdrawn"],
      default: "pending",
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
    referrerNote: { type: String, trim: true, default: "" },
    interviewAt: Date,
    statusHistory: [
      {
        status: String,
        note: { type: String, default: "" },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

referralSchema.index({ requester: 1, createdAt: -1 });
referralSchema.index({ assignedTo: 1, createdAt: -1 });

const Referral = mongoose.model("Referral", referralSchema);

module.exports = Referral;
