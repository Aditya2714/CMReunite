const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-with-sufficient-length";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CORS_ORIGIN = "http://localhost:5173";

const app = require("../app");
const User = require("../src/models/user");
const Alumni = require("../src/models/alumniModel");
const { Job } = require("../src/models/job");
const OTP = require("../src/models/otpModel");

let mongo;

const alumniPayload = {
  email: "alumni@example.com",
  password: "StrongPass123!",
  role: "alumni",
  firstName: "Test",
  lastName: "Alumni",
  startYear: 2020,
  endYear: 2024,
  degree: "bachelor",
  branch: "CSE",
  rollNumber: "TEST001",
  designation: "Engineer",
  domain: "Software",
  linkedinUrl: "https://www.linkedin.com/",
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
 const department = await require("../src/models/departmentModel").create({ code: "CSE", name: "Computer Science" });
 alumniPayload.department = String(department._id);
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("public registration creates a pending alumni account with a hashed password", async () => {
  await OTP.create({
    email: alumniPayload.email,
    otp: "123456",
    expiresAt: new Date(Date.now() + 60000),
    verified: true,
  });
  const response = await request(app).post("/register").send(alumniPayload);
  expect(response.status).toBe(201);

  const user = await User.findOne({ email: alumniPayload.email }).select("+password");
  expect(user.role).toBe("alumni");
  expect(user.isApproved).toBe(false);
  expect(user.approvalStatus).toBe("pending");
  expect(user.password).not.toBe(alumniPayload.password);
  expect(await user.verifyPassword(alumniPayload.password)).toBe(true);

  const profile = await Alumni.findOne({ user: user._id }).lean();
  expect(profile.password).toBeUndefined();
});

test("public registration rejects administrator role escalation", async () => {
  await OTP.create({
    email: "admin-attempt@example.com",
    otp: "123456",
    expiresAt: new Date(Date.now() + 60000),
    verified: true,
  });
  const response = await request(app)
    .post("/register")
    .send({ ...alumniPayload, email: "admin-attempt@example.com", role: "admin" });

  expect(response.status).toBe(400);
  expect(await User.countDocuments()).toBe(0);
});

test("login and session responses never expose a password", async () => {
  const user = await User.create({
    name: "Approved Alumni",
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
    isApproved: true,
    approvalStatus: "approved",
  });
  await Alumni.create({ ...alumniPayload, user: user._id, email: alumniPayload.email });

  const agent = request.agent(app);
  const login = await agent.post("/auth/login").send({
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
  });

  expect(login.status).toBe(200);
  expect(JSON.stringify(login.body)).not.toContain("password");

  const session = await agent.get("/auth/me");
  expect(session.status).toBe(200);
  expect(JSON.stringify(session.body)).not.toContain("password");
});

test("unapproved alumni cannot log in", async () => {
  await User.create({
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
    isApproved: false,
    approvalStatus: "pending",
  });
  const response = await request(app).post("/auth/login").send({
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
  });
  expect(response.status).toBe(403);
});

test("non-admin users cannot access administrator endpoints", async () => {
  const user = await User.create({
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
    isApproved: true,
    approvalStatus: "approved",
  });
  const agent = request.agent(app);
  await agent.post("/auth/login").send({
    email: alumniPayload.email,
    password: alumniPayload.password,
    role: "alumni",
  });
  const response = await agent.get("/admin/overview");
  expect(response.status).toBe(403);
  expect(user.role).toBe("alumni");
});

test("an alumni user cannot update another alumni user's job", async () => {
  const owner = await User.create({
    email: "owner@example.com",
    password: alumniPayload.password,
    role: "alumni",
    isApproved: true,
  });
  const attacker = await User.create({
    email: "attacker@example.com",
    password: alumniPayload.password,
    role: "alumni",
    isApproved: true,
  });
  const job = await Job.create({
    title: "Original",
    description: "Original description",
    createdBy: owner._id,
  });

  const agent = request.agent(app);
  await agent.post("/auth/login").send({
    email: attacker.email,
    password: alumniPayload.password,
    role: "alumni",
  });
  const csrf = (await agent.get("/auth/csrf")).body.data.csrfToken;
  const response = await agent.patch(`/jobs/${job._id}`).set("X-CSRF-Token", csrf).send({ title: "Hijacked" });
  expect(response.status).toBe(404);
  expect((await Job.findById(job._id)).title).toBe("Original");
});
