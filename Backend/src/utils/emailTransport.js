const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  ...(process.env.SMTP_HOST ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", requireTLS: process.env.SMTP_REQUIRE_TLS !== "false" } : { service: "gmail" }),
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  ...(process.env.EMAIL_USER && (process.env.SMTP_PASSWORD || process.env.EMAIL_PASS) ? { auth: { user: process.env.EMAIL_USER, pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS } } : {}),
});

const isConfigured = () => Boolean(process.env.EMAIL_USER && (process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || (process.env.NODE_ENV !== "production" && process.env.SMTP_HOST)));
module.exports = { transporter, isConfigured };
