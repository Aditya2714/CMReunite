const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { startSmtpCapture } = require("./helpers/smtpCapture");
const { REJECTION_REASONS } = require("../src/utils/rejectionReasons");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-rejection-test-secret";
process.env.EMAIL_USER = "test@localhost.invalid";
let mongo, smtp, app, admin, pending;
const User = require("../src/models/user");
const Department = require("../src/models/departmentModel");
const Alumni = require("../src/models/alumniModel");
const Notification = require("../src/models/notificationModel");
const { getQueueStatus } = require("../src/services/jobQueue");
const password = "StrongPass123!";
const settleQueue = async () => {
  for (let i = 0; i < 200; i++) {
    const queue = getQueueStatus();
    if (!queue.processing && !queue.pending) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Email queue did not settle");
};
const token = (user) => `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
const reject = (body, user = admin, id = pending._id) => request(app).patch(`/admin/users/${id}/approval`).set("Authorization", token(user)).send(body);
const login = (pass = password) => request(app).post("/auth/login").send({ email: pending.email, password: pass, role: "alumni" });
beforeAll(async () => {
  smtp = await startSmtpCapture();
  const realTransport = nodemailer.createTransport.bind(nodemailer);
  jest.spyOn(nodemailer, "createTransport").mockImplementation(() => realTransport({ host: "127.0.0.1", port: smtp.port, secure: false, ignoreTLS: true }));
  app = require("../app");
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
beforeEach(async () => {
  smtp.messages.length = 0;
  const department = await Department.create({ code: "CSE", name: "Computer Science" });
  admin = await User.create({ email: "admin@example.com", password, role: "admin", department: department._id });
  pending = await User.create({ name: "Test Alumni", email: "pending@example.com", password, role: "alumni", department: department._id, isApproved: false, approvalStatus: "pending" });
  await Alumni.create({ department: department._id, user: pending._id, email: pending.email, firstName: "Test", lastName: "Alumni", startYear: 2020, endYear: 2024, degree: "BE", branch: "CSE", rollNumber: "TEST001", designation: "Engineer", domain: "Software" });
});
afterEach(async () => {
  await settleQueue();
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); await smtp?.close(); jest.restoreAllMocks(); });
test("reason list contains exactly the five approved choices and is admin-only", async () => {
  expect((await request(app).get("/admin/rejection-reasons")).status).toBe(401);
  expect((await request(app).get("/admin/rejection-reasons").set("Authorization", token(pending))).status).toBe(403);
  const result = await request(app).get("/admin/rejection-reasons").set("Authorization", token(admin));
  expect(result.status).toBe(200);
  expect(result.body.data.reasons).toEqual(REJECTION_REASONS);
  expect(result.body.data.reasons).toHaveLength(5);
});
test.each(REJECTION_REASONS)("rejecting with $value persists reason, comments, reviewer, notification and SMTP email", async ({ value, label }) => {
  const result = await reject({ approvalStatus: "rejected", rejectionReason: value, rejectionComments: "  Please verify your details.  " });
  expect(result.status).toBe(200);
  const stored = await User.findById(pending._id);
  expect(stored.isApproved).toBe(false);
  expect(stored.approvalStatus).toBe("rejected");
  expect(stored.rejectionReason).toBe(value);
  expect(stored.rejectionComments).toBe("Please verify your details.");
  expect(String(stored.approvalReviewedBy)).toBe(String(admin._id));
  expect(stored.approvalReviewedAt).toBeInstanceOf(Date);
  expect(JSON.stringify(result.body)).not.toContain("password");
  const profile = await Alumni.findOne({ user: pending._id });
  expect(profile.verificationStatus).toBe("rejected");
  expect(profile.verificationNote).toContain(label);
  expect(profile.verificationNote).toContain(stored.rejectionComments);
  expect((await Notification.findOne({ recipient: pending._id })).message).toContain(stored.rejectionComments);
  await settleQueue();
  expect(smtp.messages).toHaveLength(1);
  const email = smtp.messages[0].replace(/=\r\n/g, "").replace(/=([A-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  expect(email).toContain("To: pending@example.com");
  expect(email).toContain("Please verify your details.");
  expect(email).toContain(label.split(" — ")[0]);
  const denied = await login();
  expect(denied.status).toBe(403);
  expect(denied.body.message).toContain(label);
  expect(denied.body.message).toContain(stored.rejectionComments);
  expect(denied.headers["set-cookie"]).toBeUndefined();
  expect((await request(app).get("/admin/pending-alumni").set("Authorization", token(admin))).body.data.alumni).toHaveLength(0);
});
test.each([
  ["missing reason", { approvalStatus: "rejected" }],
  ["unknown reason", { approvalStatus: "rejected", rejectionReason: "anything" }],
  ["Other without comments", { approvalStatus: "rejected", rejectionReason: "other" }],
  ["Other with whitespace", { approvalStatus: "rejected", rejectionReason: "other", rejectionComments: "  \n " }],
  ["non-text comments", { approvalStatus: "rejected", rejectionReason: "other", rejectionComments: {} }],
  ["oversized comments", { approvalStatus: "rejected", rejectionReason: "usn_mismatch", rejectionComments: "a".repeat(2001) }],
  ["missing decision", {}],
  ["conflicting decision", { isApproved: true, approvalStatus: "rejected", rejectionReason: "usn_mismatch" }],
  ["unknown status", { approvalStatus: "pending" }],
  ["non-boolean decision", { isApproved: "false" }],
])("invalid rejection: %s leaves database and emails unchanged", async (_, body) => {
  expect((await reject(body)).status).toBe(400);
  expect((await User.findById(pending._id)).approvalStatus).toBe("pending");
  expect(await Notification.countDocuments()).toBe(0);
  await settleQueue(); expect(smtp.messages).toHaveLength(0);
});
test("predefined reason permits empty comments", async () => {
  expect((await reject({ isApproved: false, rejectionReason: "duplicate_registration" })).status).toBe(200);
  expect((await User.findById(pending._id)).rejectionComments).toBe("");
});
test("2000-character comments are accepted", async () => {
  expect((await reject({ isApproved: false, rejectionReason: "other", rejectionComments: "x".repeat(2000) })).status).toBe(200);
});
test("unprivileged and unauthenticated callers cannot reject", async () => {
  expect((await request(app).patch(`/admin/users/${pending._id}/approval`).send({ isApproved: false })).status).toBe(401);
  expect((await reject({ isApproved: false, rejectionReason: "usn_mismatch" }, pending)).status).toBe(403);
});
test("cannot change an admin or a missing/invalid user", async () => {
  const body = { isApproved: false, rejectionReason: "usn_mismatch" };
  expect((await reject(body, admin, admin._id)).status).toBe(404);
  expect((await reject(body, admin, new mongoose.Types.ObjectId())).status).toBe(404);
  expect((await reject(body, admin, "invalid-id")).status).toBe(400);
  expect((await User.findById(admin._id)).isApproved).toBe(true);
});
test("email HTML escapes comments and names; wrong passwords do not disclose reasons", async () => {
  await User.updateOne({ _id: pending._id }, { name: "<img src=x>" });
  await reject({ isApproved: false, rejectionReason: "other", rejectionComments: '<script>alert("test")</script> & details' });
  await settleQueue();
  const email = smtp.messages[0].replace(/=\r\n/g, "").replace(/=([A-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const html = email.slice(email.indexOf('<div style='));
  expect(html).toContain("&lt;script&gt;"); expect(html).toContain("&lt;img src=x&gt;");
  expect(html).not.toContain("<script>");
  const denied = await login("wrong-password");
  expect(denied.status).toBe(401); expect(denied.body.message).not.toContain("details");
});
test("approval still works and clears old rejection fields", async () => {
  await reject({ isApproved: false, rejectionReason: "other", rejectionComments: "Correct your details" });
  await settleQueue();
  const result = await reject({ isApproved: true, verificationNote: "Verified after correction" });
  expect(result.status).toBe(200);
  const stored = await User.findById(pending._id);
  expect(stored.rejectionReason).toBe(""); expect(stored.rejectionComments).toBe("");
  expect((await Alumni.findOne({ user: pending._id })).verificationNote).toBe("Verified after correction");
  expect((await login()).status).toBe(200);
});
test("legacy rejection without a reason has a helpful fallback", async () => {
  await User.updateOne({ _id: pending._id }, { approvalStatus: "rejected" });
  const result = await login();
  expect(result.status).toBe(403); expect(result.body.message).toContain("Contact the administrator");
});
