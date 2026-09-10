const { cookieOptions, getProfile } = require("./loginController");
const { serializeUser } = require("../utils/serializeUser");
const User = require("../models/user");
const AuthSession = require("../models/authSessionModel");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/emailHelper");
const { enqueue } = require("../services/jobQueue");
const jwt = require("jsonwebtoken");

const getCurrentUser = async (req, res) => {
  const profile = await getProfile(req.user);
  return res.status(200).json({
    status: "success",
    data: { user: serializeUser(req.user, profile) },
  });
};

const logout = async (req, res) => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    if (decoded?.jti) {
      await AuthSession.updateOne({ tokenId: decoded.jti }, { revokedAt: new Date() });
    }
  } catch {
    // Always clear an invalid or expired cookie.
  }
  res.clearCookie("jwt", cookieOptions());
  return res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

const changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.verifyPassword(req.body.currentPassword))) {
    return res.status(401).json({ status: "fail", message: "Current password is incorrect" });
  }
  if (await user.verifyPassword(req.body.newPassword)) {
    return res.status(400).json({ status: "fail", message: "New password must be different" });
  }
  user.password = req.body.newPassword;
  user.passwordChangedAt = new Date();
  await user.save();
  await AuthSession.updateMany(
    { user: user._id, tokenId: { $ne: req.auth?.jti }, revokedAt: null },
    { revokedAt: new Date() }
  );
  return res.status(200).json({ status: "success", message: "Password changed. Other sessions were signed out." });
};

const forgotPassword = async (req, res) => {
  const response = {
    status: "success",
    message: "If an approved account exists, password-reset instructions have been sent.",
  };
  const user = await User.findOne({ email: req.body.email.toLowerCase(), isApproved: true });
  if (!user) return res.status(200).json(response);
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  enqueue("password-reset-email", () => sendPasswordResetEmail(user.email, user.name, token));
  return res.status(200).json(response);
};

const resetPassword = async (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");
  if (!user) return res.status(400).json({ status: "fail", message: "Reset link is invalid or expired" });
  user.password = req.body.newPassword;
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  await AuthSession.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  return res.status(200).json({ status: "success", message: "Password reset. Sign in with your new password." });
};

const listSessions = async (req, res) => {
  const sessions = await AuthSession.find({ user: req.user._id, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({
    status: "success",
    data: {
      sessions: sessions.map((session) => ({
        ...session,
        tokenId: undefined,
        current: session.tokenId === req.auth?.jti,
        active: !session.revokedAt,
      })),
    },
  });
};

const revokeSession = async (req, res) => {
  const session = await AuthSession.findOneAndUpdate(
    { _id: req.params.sessionId, user: req.user._id },
    { revokedAt: new Date() },
    { new: true }
  );
  if (!session) return res.status(404).json({ status: "fail", message: "Session not found" });
  if (session.tokenId === req.auth?.jti) res.clearCookie("jwt", cookieOptions());
  return res.status(200).json({ status: "success", message: "Session signed out" });
};

const logoutAll = async (req, res) => {
  await AuthSession.updateMany({ user: req.user._id, revokedAt: null }, { revokedAt: new Date() });
  res.clearCookie("jwt", cookieOptions());
  return res.status(200).json({ status: "success", message: "Signed out from every device" });
};

module.exports = {
  changePassword,
  forgotPassword,
  getCurrentUser,
  listSessions,
  logout,
  logoutAll,
  resetPassword,
  revokeSession,
};
