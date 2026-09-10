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
  role: z.enum(["alumni", "admin"]),
});
const passwordRule = z.string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[0-9]/, "Password needs a number")
  .regex(/[^A-Za-z0-9]/, "Password needs a symbol");

router.post("/login", validate(loginSchema), loginController);
router.post("/forgot-password", validate(z.object({ email: z.string().trim().email() })), forgotPassword);
router.post("/reset-password", validate(z.object({
  token: z.string().min(32).max(128),
  newPassword: passwordRule,
})), resetPassword);
router.get("/me", checkAuth, getCurrentUser);
router.post("/logout", logout);
router.post("/change-password", checkAuth, validate(z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordRule,
})), changePassword);
router.get("/sessions", checkAuth, listSessions);
router.delete("/sessions/:sessionId", checkAuth, revokeSession);
router.post("/logout-all", checkAuth, logoutAll);

module.exports = router;
