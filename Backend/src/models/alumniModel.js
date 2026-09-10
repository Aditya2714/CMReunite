const mongoose = require("mongoose");

const AlumniSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      default: "alumni",
    },
    startYear: {
      type: Number,
      required: true,
    },
    endYear: {
      type: Number,
      required: true,
    },
    degree: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, trim: true, default: "" },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    education: [
      {
        startYear: String,
        endYear: String,
        course: String,
        school: String,
      },
    ],
    workExperiences: [
      {
        startYear: String,
        endYear: String,
        company: String,
        workTitle: String,
        industry: String,
      },
    ],
    mobileNumber: Number,
    socialProfiles: {
      facebook: {
        type: String,
        default: "https://www.facebook.com/",
      },
      linkedin: {
        type: String,
        default: "https://www.linkedin.com/",
      },
    },
    imageUrl: String,
    fileType: String,
    originalFileName: String,
    company: String,
    designation: {
      type: String,
      required: [true, "Current designation is required"],
    },
    domain: {
      type: String,
      required: [true, "Working domain is required"],
    },
    location: String,
    bio: String,
    skills: [String],
  },
  {
    timestamps: true,
  }
);

AlumniSchema.index({ verified: 1, branch: 1, endYear: -1 });
AlumniSchema.index({ company: 1, designation: 1 });
AlumniSchema.index({
  firstName: "text",
  lastName: "text",
  company: "text",
  designation: "text",
  skills: "text",
});

const Alumni = mongoose.model("Alumni", AlumniSchema);
module.exports = Alumni;
