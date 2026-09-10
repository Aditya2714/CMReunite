const jwt = require("jsonwebtoken");
const User = require("../models/user");
const AuthSession = require("../models/authSessionModel");

const checkAuth = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies?.jwt || bearerToken;

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in! Please log in to get access.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.jti) {
      const session = await AuthSession.findOne({
        tokenId: decoded.jti,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!session) {
        return res.status(401).json({ status: "fail", message: "Session has been revoked or expired" });
      }
      session.lastSeenAt = new Date();
      await session.save();
      req.authSession = session;
    }
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token no longer exists.",
      });
    }

    req.user = user;
    req.auth = decoded;
    next();
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(401).json({
      status: "fail",
      message: "Invalid or expired login session",
    });
  }
};

module.exports = checkAuth;
