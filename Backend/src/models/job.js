// models/Job.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      default: "Not specified",
    },
    location: {
      type: String,
      default: "Not specified",
    },
    type: {
      type: String,
      default: "Full-time",
    },
    status: {
      type: String,
      default: "Open",
    },
    vacancy: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model
      required: true,
    },
    // Add more fields as needed
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = { Job };
