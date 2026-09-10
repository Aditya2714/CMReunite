const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3,
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

otpSchema.index({ email: 1, createdAt: -1 });

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
