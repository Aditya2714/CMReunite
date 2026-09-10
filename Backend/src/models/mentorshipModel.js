const mongoose = require("mongoose");

const mentorshipSchema = new mongoose.Schema(
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
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    mentorName: {
      type: String,
      trim: true,
      default: "Not assigned",
    },
    mentorEmail: {
      type: String,
      trim: true,
      default: "",
    },
    topic: {
      type: String,
      trim: true,
      required: true,
    },
    mode: {
      type: String,
      trim: true,
      default: "Flexible",
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    goal: { type: String, trim: true, default: "" },
    expectedOutcome: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "scheduled", "completed", "rejected", "cancelled"],
      default: "pending",
    },
    scheduledAt: Date,
    meetingLink: { type: String, trim: true, default: "" },
    sessionNotes: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, trim: true, default: "" },
    completedAt: Date,
    milestones: [
      {
        title: { type: String, trim: true, required: true },
        completed: { type: Boolean, default: false },
        completedAt: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    progressNotes: [
      {
        body: { type: String, trim: true, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        authorName: { type: String, trim: true, default: "Member" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    adminNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

mentorshipSchema.index({ requester: 1, createdAt: -1 });
mentorshipSchema.index({ mentor: 1, createdAt: -1 });

const Mentorship = mongoose.model("Mentorship", mentorshipSchema);

module.exports = Mentorship;
