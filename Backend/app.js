require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const path = require("path");
const requestContext = require("./src/middlewares/requestContext");
const { getHealth } = require("./src/controllers/healthController");

require("./src/config/production").loadSecrets();
require("./src/config/production").validateProduction();
const app = express();
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(value => value.trim()));

/* ---------------- MIDDLEWARE ---------------- */

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(requestContext);

const allowedOrigins = (process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(cookieParser());
app.get("/auth/csrf", require("./src/middlewares/csrf").issue);
app.use(require("./src/middlewares/csrf").protect);

// Announcement files use the same audience checks as the feed, before static serving.
app.use("/uploads/announcements", cookieParser(), require("./src/middlewares/checkAuth"), require("./src/controllers/announcementController").serveAttachment);

// Static files
app.use(express.static(`${__dirname}/public`));

// Cookies
app.use(cookieParser());
app.get("/internal/status", (req, res) => {
  const crypto = require("node:crypto"), expected = process.env.MONITOR_TOKEN;
  const actual = req.get("Authorization")?.replace(/^Bearer /, "") || "";
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return res.sendStatus(404);
  return res.json(require("./src/services/metrics").snapshot());
});
app.get("/health/live", (req, res) => res.json({ status: "ok" }));
app.get("/health/ready", (req, res) => {
  const ready = require("mongoose").connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
});
app.get("/health", require("./src/middlewares/asyncHandler")(getHealth));
app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "docs/openapi.yaml"));
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: "fail", message: "Too many attempts. Please try again later." },
});
app.use([
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
  "/register",
  "/otp/send",
  "/otp/verify",
], authLimiter);

/* ---------------- ROUTES ---------------- */

const router = require("./src/routes");
const otpRoutes = require("./src/routes/otpRoutes");
app.use("/", router);
app.use("/otp", otpRoutes);

app.use(require("./src/middlewares/asyncHandler").errorHandler);

module.exports = app;
