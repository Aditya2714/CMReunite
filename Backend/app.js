require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const path = require("path");
const requestContext = require("./src/middlewares/requestContext");
const { getHealth } = require("./src/controllers/healthController");

const app = express();

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
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Static files
app.use(express.static(`${__dirname}/public`));

// Cookies
app.use(cookieParser());
app.get("/health", getHealth);
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

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Unhandled request error:", error.message);
  return res.status(500).json({ status: "fail", message: "Internal Server Error" });
});

module.exports = app;
