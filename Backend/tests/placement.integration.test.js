const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
const { startSmtpCapture } = require("./helpers/smtpCapture");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-placement-tests-only";
let mongo, smtp, app, alumni, admin;
const User = require("../src/models/user");
const { Job } = require("../src/models/job");
let service;
const token = (user) => `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
const input = { title: "Software Engineer", company: "Example Inc", location: "Bengaluru", type: "Full-time", description: "JavaScript role. Apply through the alumni network.", vacancy: 2, status: "Open" };
const create = (body = input, user = alumni) => request(app).post("/jobs/create").set("Authorization", token(user)).send(body);
const stored = (id) => Job.findById(id).select("+placementNotification");
const waitForStatus = async (id, statuses) => {
  for (let i = 0; i < 300; i++) {
    const job = await stored(id);
    if (statuses.includes(job.placementNotification.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Notification did not reach expected status");
};
const decode = (mail) => mail.replace(/=\r\n/g, "").replace(/=([A-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
beforeAll(async () => {
  smtp = await startSmtpCapture();
  const realTransport = nodemailer.createTransport.bind(nodemailer);
  jest.spyOn(nodemailer, "createTransport").mockImplementation(() => realTransport({ host: "127.0.0.1", port: smtp.port, secure: false, ignoreTLS: true }));
  app = require("../app");
  service = require("../src/services/placementNotificationService");
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
beforeEach(async () => {
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "true";
  process.env.PLACEMENT_OFFICE_EMAIL = "placement@example.com";
  process.env.EMAIL_USER = "sender@example.com";
  process.env.EMAIL_PASS = "local-test-only";
  process.env.FRONTEND_URL = "https://alumni.example.com";
  smtp.messages.length = 0;
  Object.assign(smtp.controls, { attempts: 0, failuresRemaining: 0, rejectAll: false });
  alumni = await User.create({ name: "Alumni Poster", email: "alumni@example.com", role: "alumni", password: "StrongPass123!", isApproved: true });
  admin = await User.create({ email: "admin@example.com", role: "admin", password: "StrongPass123!" });
});
afterEach(async () => {
  service.stopPlacementNotificationWorker();
  // All enabled creation tests explicitly wait for the asynchronous worker to settle.
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); await smtp?.close(); jest.restoreAllMocks(); });

test("successful alumni creation queues and delivers all job details to local SMTP", async () => {
  const response = await create(); expect(response.status).toBe(201);
  expect(response.body.data.placementNotification.status).toBe("queued");
  expect(response.body.data.job.placementNotification).toBeUndefined();
  const job = await waitForStatus(response.body.data.job._id, ["sent"]);
  expect(job.placementNotification.attempts).toBe(1); expect(job.placementNotification.sentAt).toBeInstanceOf(Date);
  expect(smtp.messages).toHaveLength(1);
  const email = decode(smtp.messages[0]);
  for (const value of ["To: placement@example.com", "From: sender@example.com", "Software Engineer", "Example Inc", "Bengaluru", "Full-time", input.description, "Alumni Poster", "alumni@example.com", `https://alumni.example.com/community-posts?type=job#post-${job._id}`, "Vacancies: 2"]) expect(email).toContain(value);
  const all = await request(app).get("/jobs/all").set("Authorization", token(alumni));
  expect(all.body.data.jobs[0].placementNotification).toBeUndefined();
});
test.each(["false", "", "TRUE"])("disabled flag %s keeps posting operational and sends nothing", async (flag) => {
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = flag;
  const response = await create(); expect(response.status).toBe(201);
  expect(response.body.data.placementNotification.status).toBe("disabled");
  expect((await stored(response.body.data.job._id)).placementNotification.status).toBe("disabled");
  await service.processPlacementNotifications(); expect(smtp.controls.attempts).toBe(0);
});
test.each(["EMAIL_USER", "EMAIL_PASS", "PLACEMENT_OFFICE_EMAIL", "FRONTEND_URL"])("missing %s never blocks posting or pretends to queue mail", async (key) => {
  delete process.env[key];
  const settings = await request(app).get("/jobs/placement-notification-status").set("Authorization", token(alumni));
  expect(settings.body.data.status).toBe("not_configured");
  const response = await create(); expect(response.status).toBe(201); expect(response.body.data.placementNotification.status).toBe("disabled");
  await service.processPlacementNotifications(); expect(smtp.controls.attempts).toBe(0);
});
test.each(["bad-address", "first@example.com,second@example.com", "Name <placement@example.com>"])("invalid recipient %s disables mail", async (recipient) => {
  process.env.PLACEMENT_OFFICE_EMAIL = recipient;
  expect(service.placementEmailConfig().status).toBe("not_configured");
  const response = await create(); expect(response.status).toBe(201);
  expect(response.body.data.placementNotification.status).toBe("disabled");
});
test("status endpoint is authenticated and never reveals credentials or recipient", async () => {
  expect((await request(app).get("/jobs/placement-notification-status")).status).toBe(401);
  const response = await request(app).get("/jobs/placement-notification-status").set("Authorization", token(alumni));
  expect(response.body).toEqual({ status: "success", data: { status: "enabled" } });
});
test.each([
  { ...input, title: "  " }, { ...input, description: "" }, { ...input, vacancy: 0 },
  { ...input, vacancy: "2" }, { ...input, company: {} }, { ...input, title: "a".repeat(201) },
])("invalid job has no database or email side effects: %j", async (body) => {
  expect((await create(body)).status).toBe(400);
  expect(await Job.countDocuments()).toBe(0); expect(smtp.controls.attempts).toBe(0);
});
test("authentication, role and approval checks run before job/email creation", async () => {
  expect((await request(app).post("/jobs/create").send(input)).status).toBe(401);
  expect((await create(input, admin)).status).toBe(403);
  await User.updateOne({ _id: alumni._id }, { isApproved: false });
  expect((await create()).status).toBe(403);
  expect(await Job.countDocuments()).toBe(0); expect(smtp.controls.attempts).toBe(0);
});
test("clients cannot override notification recipient, snapshot or status", async () => {
  const response = await create({ ...input, placementNotification: { recipient: "attacker@example.com", status: "sent" } });
  const job = await waitForStatus(response.body.data.job._id, ["sent"]);
  expect(job.placementNotification.recipient).toBe("placement@example.com");
});
test("edit/delete do not generate more mail and notification internals are immutable through patch", async () => {
  const response = await create(); const id = response.body.data.job._id;
  await waitForStatus(id, ["sent"]);
  const patch = await request(app).patch(`/jobs/${id}`).set("Authorization", token(alumni)).send({ title: "Updated", placementNotification: { status: "pending" } });
  expect(patch.status).toBe(200); expect(patch.body.data.job.placementNotification).toBeUndefined();
  await service.processPlacementNotifications(); expect(smtp.messages).toHaveLength(1);
  expect((await request(app).delete(`/jobs/${id}`).set("Authorization", token(alumni))).status).toBe(200);
  await service.processPlacementNotifications(); expect(smtp.messages).toHaveLength(1);
});
test("SMTP failure preserves job; retry is persisted, delayed and eventually sent once", async () => {
  smtp.controls.failuresRemaining = 1;
  const response = await create(); expect(response.status).toBe(201);
  const id = response.body.data.job._id;
  let job = await waitForStatus(id, ["retry"]);
  expect(job.placementNotification.lastErrorCode).toBe("EMESSAGE"); expect(smtp.messages).toHaveLength(0);
  await service.processPlacementNotifications(); expect(smtp.controls.attempts).toBe(1);
  await service.processPlacementNotifications({ now: new Date(job.placementNotification.nextAttemptAt.getTime() + 1) });
  job = await stored(id); expect(job.placementNotification.status).toBe("sent");
  expect(job.placementNotification.attempts).toBe(2); expect(smtp.messages).toHaveLength(1);
});
test("retries stop at three attempts and preserve failed status", async () => {
  smtp.controls.rejectAll = true;
  const response = await create(), id = response.body.data.job._id;
  let job = await waitForStatus(id, ["retry"]);
  for (let i = 0; i < 2; i++) {
    await service.processPlacementNotifications({ now: new Date(job.placementNotification.nextAttemptAt.getTime() + 1) });
    job = await stored(id);
  }
  expect(job.placementNotification.status).toBe("failed"); expect(job.placementNotification.attempts).toBe(3);
  await service.processPlacementNotifications({ now: new Date(Date.now() + 3600000) });
  expect(smtp.controls.attempts).toBe(3); expect(await Job.countDocuments()).toBe(1);
});
test("disabled posts and legacy jobs are not sent retroactively", async () => {
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "false";
  await create(); await Job.create({ ...input, createdBy: alumni._id });
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "true";
  await service.processPlacementNotifications(); expect(smtp.messages).toHaveLength(0);
});
test("worker starts on server boot and processes durable pending work", async () => {
  await Job.create({ ...input, createdBy: alumni._id, placementNotification: service.initialPlacementNotification(input, alumni) });
  service.startPlacementNotificationWorker();
  const id = (await Job.findOne())._id;
  await waitForStatus(id, ["sent"]); expect(smtp.messages).toHaveLength(1);
});
test("a fresh worker process recovers pending and expired claims; concurrent workers do not double-send", async () => {
  const first = await Job.create({ ...input, createdBy: alumni._id, placementNotification: service.initialPlacementNotification(input, alumni) });
  const second = await Job.create({ ...input, createdBy: alumni._id, placementNotification: { ...service.initialPlacementNotification(input, alumni), status: "processing", attempts: 1, lockUntil: new Date(Date.now() - 1000), claimToken: "old-worker" } });
  const runWorker = () => promisify(execFile)(process.execPath, [path.join(__dirname, "helpers/runPlacementWorker.js")], { env: { ...process.env, TEST_MONGO_URI: mongo.getUri(), TEST_SMTP_PORT: String(smtp.port) }, timeout: 30000 });
  await Promise.all([runWorker(), runWorker()]);
  expect((await stored(first._id)).placementNotification.status).toBe("sent");
  expect((await stored(second._id)).placementNotification.status).toBe("sent");
  expect(smtp.messages).toHaveLength(2);
});
test("unexpired claim is respected; exhausted expired claim becomes failed", async () => {
  await Job.create({ ...input, createdBy: alumni._id, placementNotification: { ...service.initialPlacementNotification(input, alumni), status: "processing", attempts: 1, lockUntil: new Date(Date.now() + 120000) } });
  const exhausted = await Job.create({ ...input, createdBy: alumni._id, placementNotification: { ...service.initialPlacementNotification(input, alumni), status: "processing", attempts: 3, lockUntil: new Date(Date.now() - 1000) } });
  await service.processPlacementNotifications(); expect(smtp.messages).toHaveLength(0);
  expect((await stored(exhausted._id)).placementNotification.status).toBe("failed");
});
test("email uses creation snapshot, escapes HTML and retains a stable Message-ID", async () => {
  const fields = { ...input, title: "<script>alert(1)</script>", description: '<img src=x onerror="bad()">' };
  const job = await Job.create({ ...fields, createdBy: alumni._id, placementNotification: service.initialPlacementNotification(fields, alumni) });
  await Job.updateOne({ _id: job._id }, { title: "Edited before delivery" });
  await service.processPlacementNotifications();
  const email = decode(smtp.messages[0]); const html = email.slice(email.indexOf('<div style='));
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;img"); expect(html).not.toContain("Edited before delivery");
  expect(email).toContain(`Message-ID: <placement-job-${job._id}@cmrunite.local>`);
});
