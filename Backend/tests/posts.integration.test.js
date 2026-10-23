const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { startSmtpCapture } = require("./helpers/smtpCapture");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "community-posts-integration-only";
const Post = require("../src/models/postModel");
const User = require("../src/models/user");
const { Job } = require("../src/models/job");
const { migrateCommunityPosts } = require("../src/services/migrateCommunityPosts");
let app, mongo, smtp, owner, other;
const token = (user) => `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
const story = { postType: "story", title: "My alumni journey", content: "A meaningful story", category: "Career Journey" };
const job = { postType: "job", title: "Frontend Engineer", content: "React role", company: "Example", location: "Bengaluru", employmentType: "Full-time", vacancy: 2, status: "Open" };
const publish = (body, user = owner) => request(app).post("/posts").set("Authorization", token(user)).send(body);
const list = (query = "") => request(app).get(`/posts${query}`).set("Authorization", token(owner));
const waitSent = async (id) => {
  for (let i = 0; i < 200; i++) {
    const document = await Job.findById(id).select("+placementNotification");
    if (document.placementNotification.status === "sent") return document;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Email did not send");
};
beforeAll(async () => {
  smtp = await startSmtpCapture();
  const original = nodemailer.createTransport.bind(nodemailer);
  jest.spyOn(nodemailer, "createTransport").mockImplementation(() => original({ host: "127.0.0.1", port: smtp.port, ignoreTLS: true }));
  app = require("../app");
  mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
});
beforeEach(async () => {
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "false";
  process.env.EMAIL_USER = "sender@example.com"; process.env.EMAIL_PASS = "test-only";
  process.env.PLACEMENT_OFFICE_EMAIL = "placement@example.com";
  process.env.FRONTEND_URL = "https://alumni.example.com";
  smtp.messages.length = 0;
  owner = await User.create({ email: "owner@example.com", name: "Owner Alumni", role: "alumni", password: "StrongPass123!" });
  other = await User.create({ email: "other@example.com", name: "Other Alumni", role: "alumni", password: "StrongPass123!" });
});
afterEach(async () => { await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))); });
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); await smtp?.close(); jest.restoreAllMocks(); });
test("one API stores both types and filters/paginates the shared feed", async () => {
  const first = await publish(story); expect(first.status).toBe(201);
  const second = await publish(job); expect(second.status).toBe(201);
  expect((await Post.countDocuments())).toBe(2);
  expect((await list()).body.data.posts).toHaveLength(2);
  expect((await list("?postType=story")).body.data.posts.map((p) => p.postType)).toEqual(["story"]);
  const jobs = await list("?postType=job&limit=1"); expect(jobs.body.data.posts[0].company).toBe("Example");
  expect(jobs.body.data.posts[0].canManage).toBe(true);
  expect((await list("?limit=1&page=2")).body.data.posts).toHaveLength(1);
  expect((await list("?postType=unknown")).status).toBe(400);
  expect((await list("?page=-1")).status).toBe(400);
  expect((await list("?limit=500")).status).toBe(400);
});
test("only new jobs send placement emails; stories, edits, and deletions do not", async () => {
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "true";
  const result = await publish(story); expect(result.body.data.placementNotification.status).toBe("not_applicable");
  const created = await publish(job); const id = created.body.data.post._id;
  await waitSent(id); expect(smtp.messages).toHaveLength(1);
  const email = smtp.messages[0].replace(/=\r\n/g, "");
  expect(email).toContain(`/community-posts?type=3Djob#post-${id}`);
  expect((await request(app).patch(`/posts/${id}`).set("Authorization", token(owner)).send({ title: "Updated role" })).status).toBe(200);
  expect((await request(app).delete(`/posts/${id}`).set("Authorization", token(owner))).status).toBe(200);
  await require("../src/services/placementNotificationService").processPlacementNotifications();
  expect(smtp.messages).toHaveLength(1);
});
test.each([story, job])("owner can edit/delete $postType; another member cannot", async (body) => {
  const id = (await publish(body)).body.data.post._id;
  expect((await request(app).patch(`/posts/${id}`).set("Authorization", token(other)).send({ title: "Hijacked" })).status).toBe(403);
  expect((await request(app).delete(`/posts/${id}`).set("Authorization", token(other))).status).toBe(403);
  expect((await request(app).patch(`/posts/${id}`).set("Authorization", token(owner)).send({ title: "Edited by owner" })).status).toBe(200);
  expect((await Post.findById(id)).title).toBe("Edited by owner");
  expect((await request(app).delete(`/posts/${id}`).set("Authorization", token(owner))).status).toBe(200);
  expect(await Post.findById(id)).toBeNull();
});
test("post type is immutable in both directions and client author/notification injection is rejected", async () => {
  for (const body of [story, job]) {
    const id = (await publish(body)).body.data.post._id;
    const result = await request(app).patch(`/posts/${id}`).set("Authorization", token(owner)).send({ postType: body.postType === "job" ? "story" : "job" });
    expect(result.status).toBe(400); expect((await Post.findById(id)).postType).toBe(body.postType);
  }
  expect((await publish({ ...story, author: other._id })).status).toBe(400);
  expect((await publish({ ...job, placementNotification: { status: "sent" } })).status).toBe(400);
});
test.each([{ ...story, title: " " }, { ...story, content: "" }, { ...job, company: "" }, { ...job, vacancy: 0 }, { ...job, vacancy: "2" }, { ...story, company: "Wrong fields" }, { ...job, category: "Wrong fields" }, { title: "Missing type", content: "Text" }])("type-specific validation rejects %j without saving", async (body) => {
  expect((await publish(body)).status).toBe(400); expect(await Post.countDocuments()).toBe(0); expect(smtp.messages).toHaveLength(0);
});
test("authenticated read/detail and role/approval enforcement", async () => {
  expect((await request(app).get("/posts")).status).toBe(401);
  expect((await request(app).post("/posts").send(story)).status).toBe(401);
  const admin = await User.create({ email: "admin@example.com", password: "StrongPass123!", role: "admin" });
  expect((await publish(story, admin)).status).toBe(403);
  await User.updateOne({ _id: owner._id }, { isApproved: false });
  expect((await publish(story)).status).toBe(403);
  expect((await request(app).get("/posts/invalid").set("Authorization", token(other))).status).toBe(400);
  expect((await request(app).get(`/posts/${new mongoose.Types.ObjectId()}`).set("Authorization", token(other))).status).toBe(404);
});
test("legacy job and story APIs use unified storage", async () => {
  const oldJob = await request(app).post("/jobs/create").set("Authorization", token(owner)).send({ title: "Old client", description: "Still supported", company: "Example" });
  const oldStory = await request(app).post("/community/stories").set("Authorization", token(owner)).send({ title: "Old story client", content: "Still supported", tag: "Achievement" });
  expect(oldJob.status).toBe(201); expect(oldStory.status).toBe(201);
  expect(await Post.countDocuments()).toBe(2);
  expect(await mongoose.connection.collection("jobs").countDocuments()).toBe(0);
  expect(await mongoose.connection.collection("stories").countDocuments()).toBe(0);
});
test("migration preserves IDs, authors, timestamps and email state; reruns preserve edits/deletions", async () => {
  const jobId = new mongoose.Types.ObjectId(), storyId = new mongoose.Types.ObjectId();
  const date = new Date("2024-01-02T10:00:00Z");
  await mongoose.connection.collection("jobs").insertOne({ _id: jobId, title: "Legacy role", description: "Original description", createdBy: owner._id, createdAt: date, updatedAt: date, company: "Legacy Co", placementNotification: { status: "sent", attempts: 2, sentAt: date } });
  await mongoose.connection.collection("stories").insertOne({ _id: storyId, title: "Legacy story", content: "Original story", author: other._id, authorName: "Original author", tag: "Campus Memory", createdAt: date, updatedAt: date });
  expect((await migrateCommunityPosts()).imported).toBe(2);
  const migrated = await Job.findById(jobId).select("+placementNotification");
  expect(String(migrated.author)).toBe(String(owner._id)); expect(migrated.createdAt).toEqual(date);
  expect(migrated.placementNotification.status).toBe("sent"); expect(migrated.placementNotification.attempts).toBe(2);
  expect((await Post.findById(storyId)).category).toBe("Campus Memory");
  await Post.updateOne({ _id: storyId }, { title: "Edited after migration" });
  await Post.deleteOne({ _id: jobId });
  expect((await migrateCommunityPosts()).imported).toBe(0);
  expect(await Post.findById(jobId)).toBeNull(); expect((await Post.findById(storyId)).title).toBe("Edited after migration");
  expect(await mongoose.connection.collection("jobs").countDocuments()).toBe(1);
  expect(smtp.messages).toHaveLength(0);
});
test("migration never mails disabled/old posts and preserves pending work", async () => {
  const date = new Date();
  const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const service = require("../src/services/placementNotificationService");
  process.env.PLACEMENT_JOB_EMAIL_ENABLED = "true";
  await mongoose.connection.collection("jobs").insertMany([
    { _id: ids[0], title: "No previous notification", description: "Old", createdBy: owner._id, createdAt: date, updatedAt: date },
    { _id: ids[1], title: "Queued before migration", description: "Old", createdBy: owner._id, createdAt: date, updatedAt: date, placementNotification: service.initialPlacementNotification({ title: "Queued before migration", description: "Old", company: "Co", location: "City", type: "Full-time", vacancy: 1, status: "Open" }, owner) },
  ]);
  await migrateCommunityPosts(); await service.processPlacementNotifications();
  expect(smtp.messages).toHaveLength(1); expect((await waitSent(ids[1])).placementNotification.attempts).toBe(1);
});
test("migration ID collision stops safely without overwriting either source", async () => {
  const id = (await publish(story)).body.data.post._id;
  await mongoose.connection.collection("jobs").insertOne({ _id: new mongoose.Types.ObjectId(id), title: "Collision", description: "Do not overwrite", createdBy: owner._id });
  await expect(migrateCommunityPosts()).rejects.toThrow(/collision/);
  expect((await Post.findById(id)).title).toBe(story.title);
});
test("partial edits preserve omitted job values and do not reset category", async () => {
  const original = { ...job, employmentType: "Internship", vacancy: 7, status: "Closed", location: "Remote" };
  const id = (await publish(original)).body.data.post._id;
  const edited = await request(app).patch(`/posts/${id}`).set("Authorization", token(owner)).send({ title: "New title only" });
  expect(edited.status).toBe(200);
  expect(edited.body.data.post).toMatchObject({ company: "Example", employmentType: "Internship", vacancy: 7, status: "Closed", location: "Remote" });
  const storyId = (await publish({ ...story, category: "Achievement" })).body.data.post._id;
  const result = await request(app).patch(`/posts/${storyId}`).set("Authorization", token(owner)).send({ content: "Updated content" });
  expect(result.body.data.post.category).toBe("Achievement");
});
