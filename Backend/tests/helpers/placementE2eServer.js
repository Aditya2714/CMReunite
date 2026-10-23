// Dedicated loopback-only test harness. Production startup never loads this file.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const nodemailer = require("nodemailer");
const { startSmtpCapture } = require("./smtpCapture");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "placement-browser-tests-only";
process.env.EMAIL_USER = "sender@example.com";
process.env.EMAIL_PASS = "local-test-only";
process.env.PLACEMENT_JOB_EMAIL_ENABLED = "false";
process.env.PLACEMENT_OFFICE_EMAIL = "placement@example.com";
process.env.FRONTEND_URL = "http://127.0.0.1:5173";
(async () => {
  const smtp = await startSmtpCapture();
  const original = nodemailer.createTransport.bind(nodemailer);
  nodemailer.createTransport = () => original({ host: "127.0.0.1", port: smtp.port, ignoreTLS: true });
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();
  const User = require("../../src/models/user");
  await User.create({ email: "poster@example.com", password: "StrongPass123!", role: "alumni", name: "Test Alumni Poster", isApproved: true });
  const poster = await User.findOne({ email: "poster@example.com" });
  await User.create({ email: "reader@example.com", password: "StrongPass123!", role: "alumni", name: "Reader Alumni", isApproved: true });
  const date = new Date("2020-01-02T00:00:00Z");
  await mongoose.connection.collection("jobs").insertOne({ _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"), title: "Migrated job", description: "Historical job description", createdBy: poster._id, company: "Legacy Co", type: "Full-time", vacancy: 1, status: "Open", createdAt: date, updatedAt: date, placementNotification: { status: "sent", attempts: 1, sentAt: date } });
  await mongoose.connection.collection("stories").insertOne({ _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"), title: "Migrated story", content: "Historical story content", author: poster._id, authorName: "Original Story Author", tag: "Campus Memory", createdAt: date, updatedAt: date });
  const app = require("../../app");
  await require("../../src/services/migrateCommunityPosts").migrateCommunityPosts();
  const Post = require("../../src/models/postModel");
  const { Job } = require("../../src/models/job");
  const worker = require("../../src/services/placementNotificationService");
  app.get("/__test/state", async (req, res) => res.json({ posts: await Post.find().lean(), jobs: await Job.find().select("+placementNotification").lean(), emails: smtp.messages, attempts: smtp.controls.attempts }));
  app.post("/__test/config", (req, res) => {
    process.env.PLACEMENT_JOB_EMAIL_ENABLED = req.body.enabled ? "true" : "false";
    process.env.EMAIL_PASS = req.body.missingCredentials ? "" : "local-test-only";
    smtp.controls.failuresRemaining = req.body.failuresRemaining || 0;
    res.json({ status: worker.placementEmailConfig().status });
  });
  app.post("/__test/run-worker", async (req, res) => {
    await worker.processPlacementNotifications({ now: new Date(Date.now() + 3600000) });
    res.json({ status: "complete" });
  });
  worker.startPlacementNotificationWorker();
  const server = app.listen(4000, "127.0.0.1", () => console.log("Placement E2E backend ready"));
  const shutdown = async () => { worker.stopPlacementNotificationWorker(); server.close(); await mongoose.disconnect(); await mongo.stop(); await smtp.close(); process.exit(0); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
})().catch((error) => { console.error(error); process.exit(1); });
