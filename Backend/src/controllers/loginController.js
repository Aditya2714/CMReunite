const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const { Admin } = require("../models/adminModel");
const { serializeUser } = require("../utils/serializeUser");
const AuthSession = require("../models/authSessionModel");
const crypto = require("crypto");

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: Number(process.env.JWT_COOKIE_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000,
});

const signToken = (userId, tokenId) =>
  jwt.sign({ id: userId, jti: tokenId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30m",
  });

const getProfile = (user) => {
  if (user.role === "alumni") return Alumni.findOne({ user: user._id });
  if (user.role === "admin") return Admin.findOne({ user: user._id });
  return null;
};

const loginController = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), role }).select("+password");

    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email, password, or role",
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        status: "fail",
        message:
          user.approvalStatus === "rejected"
            ? "Alumni registration was rejected by admin"
            : "Your account is awaiting admin approval",
      });
    }

    // Transparently upgrade legacy plaintext User passwords.
    if (!user.password.startsWith("$2")) {
      user.password = password;
      await user.save();
    }

    const tokenId = crypto.randomUUID();
    const token = signToken(user._id, tokenId);
    const decodedToken = jwt.decode(token);
    await AuthSession.create({
      user: user._id,
      tokenId,
      userAgent: req.get("user-agent") || "Unknown device",
      ipAddress: req.ip,
      expiresAt: new Date(decodedToken.exp * 1000),
    });
    const profile = await getProfile(user);
    res.cookie("jwt", token, cookieOptions());

    return res.status(200).json({
      status: "success",
      user: serializeUser(user, profile),
      // Preserve the existing frontend response shape during migration.
      [role]: serializeUser(user, profile),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Server error during login",
    });
  }
};

module.exports = { cookieOptions, getProfile, loginController };
