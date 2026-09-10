const mongoose = require("mongoose");

const pledgeSchema = new mongoose.Schema(
  {
    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contributorName: {
      type: String,
      trim: true,
      default: "Alumni",
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const contributionCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    purpose: {
      type: String,
      trim: true,
      required: true,
    },
    targetAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pledges: [pledgeSchema],
  },
  { timestamps: true }
);

const ContributionCampaign = mongoose.model(
  "ContributionCampaign",
  contributionCampaignSchema
);

module.exports = ContributionCampaign;
