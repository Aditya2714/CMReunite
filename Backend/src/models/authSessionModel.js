const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenId: { type: String, required: true, unique: true },
    userAgent: { type: String, trim: true, default: "Unknown device" },
    ipAddress: { type: String, trim: true, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date,
  },
  { timestamps: true }
);

authSessionSchema.index({ user: 1, revokedAt: 1, createdAt: -1 });

module.exports = mongoose.model("AuthSession", authSessionSchema);
