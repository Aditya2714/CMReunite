// Test-only child-process entry point for verifying real worker restart recovery.
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const original = nodemailer.createTransport.bind(nodemailer);
nodemailer.createTransport = () => original({ host: "127.0.0.1", port: Number(process.env.TEST_SMTP_PORT), ignoreTLS: true });
(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI);
  const { processPlacementNotifications } = require("../../src/services/placementNotificationService");
  await processPlacementNotifications();
  await mongoose.disconnect();
})().catch((error) => { console.error(error); process.exit(1); });
