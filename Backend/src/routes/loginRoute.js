const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const { z } = require("zod");
const checkAuth = require("../middlewares/checkAuth");
const validate = require("../middlewares/validate");
const { loginController } = require("../controllers/loginController");
const {
  changePassword,
  forgotPassword,
  getCurrentUser,
  listSessions,
  logout,
  logoutAll,
  resetPassword,
  revokeSession,
} = require("../controllers/authController");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  role: z.enum(["alumni", "admin", "super_admin"]),
});
const passwordRule = z.string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[0-9]/, "Password needs a number")
  .regex(/[^A-Za-z0-9]/, "Password needs a symbol");

router.post("/login", validate(loginSchema), asyncHandler(loginController));
router.post("/forgot-password", validate(z.object({ email: z.string().trim().email() })), asyncHandler(forgotPassword));
router.post("/reset-password", validate(z.object({
  token: z.string().min(32).max(128),
  newPassword: passwordRule,
})), asyncHandler(resetPassword));
router.get("/me", asyncHandler(checkAuth), asyncHandler(getCurrentUser));
router.post("/logout", asyncHandler(logout));
router.post("/change-password", asyncHandler(checkAuth), validate(z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordRule,
})), asyncHandler(changePassword));
router.get("/sessions", asyncHandler(checkAuth), asyncHandler(listSessions));
router.delete("/sessions/:sessionId", asyncHandler(checkAuth), asyncHandler(revokeSession));
router.post("/logout-all", asyncHandler(checkAuth), asyncHandler(logoutAll));

module.exports = router;
