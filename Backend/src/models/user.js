const mongoose = require("mongoose");
const {
  hashPassword,
  isPasswordHash,
  verifyPassword: verifyPasswordValue,
} = require("../utils/password");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false   // optional (since you're not sending it currently)
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ["alumni", "admin", "college"],
    default: "alumni"
  },
  isApproved: {
    type: Boolean,
    default: true   // ✅ CHANGED HERE
  },
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved"
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ["network", "members", "private"],
      default: "members",
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    allowMessages: {
      type: String,
      enum: ["connections", "members", "none"],
      default: "connections",
    },
    allowConnections: { type: Boolean, default: true },
    mentorshipAvailable: { type: Boolean, default: true },
  },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  notificationPreferences: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    digest: {
      type: String,
      enum: ["instant", "daily", "weekly", "off"],
      default: "instant",
    },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "07:00" },
    categories: {
      event: { type: Boolean, default: true },
      mentorship: { type: Boolean, default: true },
      referral: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      connection: { type: Boolean, default: true },
      announcement: { type: Boolean, default: true },
    },
  },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  passwordChangedAt: Date,
}, { timestamps: true });

userSchema.pre("save", async function hashUserPassword() {
  if (!this.isModified("password") || isPasswordHash(this.password)) return;
  this.password = await hashPassword(this.password);
});

userSchema.methods.verifyPassword = async function verifyUserPassword(candidatePassword) {
  return verifyPasswordValue(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
