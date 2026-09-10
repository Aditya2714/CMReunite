const { test } = require("node:test");
const assert = require("node:assert/strict");
const Mentorship = require("../src/models/mentorshipModel");
const Referral = require("../src/models/referralModel");
const Event = require("../src/models/eventModel");
const EventRegistration = require("../src/models/eventRegistrationModel");
const Message = require("../src/models/messageModel");
const cache = require("../src/services/cacheService");
const User = require("../src/models/user");
const AuthSession = require("../src/models/authSessionModel");

const objectId = "507f1f77bcf86cd799439011";
const secondObjectId = "507f191e810c19729de860ea";

test("mentorship supports scheduled sessions and feedback", async () => {
  const request = new Mentorship({
    requester: objectId,
    requesterEmail: "requester@example.com",
    mentor: secondObjectId,
    topic: "Interview Prep",
    message: "Please help me prepare.",
    status: "scheduled",
    scheduledAt: new Date(),
    rating: 5,
  });
  await request.validate();
  assert.equal(request.status, "scheduled");
  assert.equal(request.rating, 5);
});

test("mentorship ratings reject values outside one to five", async () => {
  const request = new Mentorship({
    requester: objectId,
    requesterEmail: "requester@example.com",
    topic: "Career Guidance",
    message: "Guidance needed.",
    rating: 6,
  });
  await assert.rejects(request.validate(), /rating/);
});

test("mentorship tracks goals, milestones, and progress notes", async () => {
  const request = new Mentorship({
    requester: objectId,
    requesterEmail: "requester@example.com",
    mentor: secondObjectId,
    topic: "Career Guidance",
    message: "Help me plan my transition.",
    goal: "Move into cloud engineering",
    milestones: [{ title: "Review learning roadmap", createdBy: objectId }],
    progressNotes: [{ body: "Roadmap shared", author: secondObjectId }],
  });
  await request.validate();
  assert.equal(request.milestones[0].completed, false);
  assert.equal(request.progressNotes[0].body, "Roadmap shared");
});

test("referrals preserve assignment and status history", async () => {
  const referral = new Referral({
    requester: objectId,
    requesterEmail: "requester@example.com",
    targetRole: "Software Engineer",
    company: "Example",
    reason: "Relevant experience",
    assignedTo: secondObjectId,
    status: "assigned",
    statusHistory: [{ status: "assigned", changedBy: objectId }],
  });
  await referral.validate();
  assert.equal(referral.statusHistory.length, 1);
});

test("referrals support the interview application pipeline", async () => {
  for (const status of ["requested", "under_review", "referred", "interviewing", "selected"]) {
    const referral = new Referral({
      requester: objectId,
      requesterEmail: "requester@example.com",
      targetRole: "Engineer",
      company: "Example",
      reason: "Relevant experience",
      status,
    });
    await referral.validate();
    assert.equal(referral.status, status);
  }
});

test("events reject invalid capacities", async () => {
  const event = new Event({
    title: "Alumni Meet",
    date: new Date(),
    location: "Campus",
    description: "Annual alumni gathering",
    capacity: 0,
    createdBy: objectId,
  });
  await assert.rejects(event.validate(), /capacity/);
});

test("event registrations support waitlist and attendance states", async () => {
  for (const status of ["registered", "waitlisted", "attended"]) {
    const registration = new EventRegistration({
      event: objectId,
      user: secondObjectId,
      status,
    });
    await registration.validate();
    assert.equal(registration.status, status);
  }
});

test("direct messages enforce a maximum message length", async () => {
  const message = new Message({
    conversation: objectId,
    sender: objectId,
    recipient: secondObjectId,
    body: "x".repeat(2001),
  });
  await assert.rejects(message.validate(), /body/);
});

test("short-lived cache stores and invalidates recommendation entries", () => {
  cache.set("recommendations:test:network:10", { status: "success" }, 1000);
  assert.equal(cache.get("recommendations:test:network:10").status, "success");
  cache.removeByPrefix("recommendations:test:");
  assert.equal(cache.get("recommendations:test:network:10"), null);
});

test("users receive privacy-safe contact defaults", async () => {
  const user = new User({
    email: "privacy@example.com",
    password: "StrongPass123!",
    role: "alumni",
  });
  await user.validate();
  assert.equal(user.privacy.showEmail, false);
  assert.equal(user.privacy.showPhone, false);
  assert.equal(user.privacy.allowMessages, "connections");
  assert.equal(user.privacy.allowConnections, true);
});

test("privacy settings reject unsupported visibility modes", async () => {
  const user = new User({
    email: "invalid-privacy@example.com",
    password: "StrongPass123!",
    privacy: { profileVisibility: "everyone-on-earth" },
  });
  await assert.rejects(user.validate(), /profileVisibility/);
});

test("users receive configurable notification defaults", async () => {
  const user = new User({
    email: "notifications@example.com",
    password: "StrongPass123!",
  });
  await user.validate();
  assert.equal(user.notificationPreferences.digest, "instant");
  assert.equal(user.notificationPreferences.categories.mentorship, true);
  assert.equal(user.notificationPreferences.quietHoursStart, "22:00");
});

test("authentication sessions require a unique token and expiry", async () => {
  const session = new AuthSession({
    user: objectId,
    tokenId: "session-token-id",
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: "Test Browser",
  });
  await session.validate();
  assert.equal(session.revokedAt, undefined);
  assert.equal(session.userAgent, "Test Browser");
});

test("password reset credentials stay excluded by default", () => {
  assert.equal(User.schema.path("passwordResetTokenHash").options.select, false);
  assert.equal(User.schema.path("passwordResetExpiresAt").options.select, false);
});
