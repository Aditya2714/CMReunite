// Dedicated test server: disposable database and loopback SMTP, never loaded by production.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const nodemailer = require("nodemailer");
const { startSmtpCapture } = require("./smtpCapture");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "rejection-browser-tests-only";
process.env.EMAIL_USER = "test@localhost.invalid";
const User = require("../../src/models/user");
const Department = require("../../src/models/departmentModel");
const Alumni = require("../../src/models/alumniModel");
(async () => {
  const smtp = await startSmtpCapture();
  const originalTransport = nodemailer.createTransport.bind(nodemailer);
  nodemailer.createTransport = () => originalTransport({ host: "127.0.0.1", port: smtp.port, ignoreTLS: true });
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();
  const department = await Department.create({ code: "CSE", name: "Computer Science" });
  await User.create({ email: "admin@example.com", password: "StrongPass123!", role: "admin", department: department._id, name: "Test Admin" });
  for (const name of ["Dropdown", "Custom", "Cancel", "Approval", "Mobile"]) {
    const user = await User.create({ name: `${name} Alumni`, email: `${name.toLowerCase()}@example.com`, password: "StrongPass123!", role: "alumni", department: department._id, isApproved: false, approvalStatus: "pending" });
    await Alumni.create({ department: department._id, user: user._id, email: user.email, firstName: name, lastName: "Alumni", startYear: 2020, endYear: 2024, degree: "BE", branch: "CSE", rollNumber: name, designation: "Engineer", domain: "Software" });
  }
  const app = require("../../app");
  // Read-only test diagnostics, bound only to loopback on this test server.
  app.get("/__test/state", async (req, res) => res.json({ users: await User.find().select("-password").lean(), profiles: await Alumni.find().lean(), emails: smtp.messages }));
  const server = app.listen(4000, "127.0.0.1", () => console.log("Rejection E2E backend ready"));
  const shutdown = async () => { server.close(); await mongoose.disconnect(); await mongo.stop(); await smtp.close(); process.exit(0); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
})().catch((error) => { console.error(error); process.exit(1); });
