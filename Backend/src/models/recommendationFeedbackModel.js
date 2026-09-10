const mongoose = require("mongoose");

const recommendationFeedbackSchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recommendedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mode: {
      type: String,
      enum: ["network", "mentor", "referral"],
      default: "network",
    },
    action: {
      type: String,
      enum: ["relevant", "not_relevant", "hidden", "connected", "mentorship_requested"],
      required: true,
    },
    score: { type: Number, min: 0, max: 1 },
    modelVersion: { type: String, default: "unknown" },
  },
  { timestamps: true }
);

recommendationFeedbackSchema.index(
  { viewer: 1, recommendedUser: 1, mode: 1 },
  { unique: true }
);

module.exports = mongoose.model("RecommendationFeedback", recommendationFeedbackSchema);
