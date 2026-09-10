const { test } = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const { hashPassword, isPasswordHash, verifyPassword } = require("../src/utils/password");
const { cleanObject, serializeUser } = require("../src/utils/serializeUser");
const allowRoles = require("../src/middlewares/allowRoles");
const validate = require("../src/middlewares/validate");

test("password helpers hash and verify credentials", async () => {
  const hash = await hashPassword("StrongPass123!");
  assert.notEqual(hash, "StrongPass123!");
  assert.equal(isPasswordHash(hash), true);
  assert.equal(await verifyPassword("StrongPass123!", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("legacy plaintext passwords can be verified for login-time migration", async () => {
  assert.equal(await verifyPassword("legacy-password", "legacy-password"), true);
  assert.equal(await verifyPassword("wrong", "legacy-password"), false);
});

test("serializers remove password fields from users and profiles", () => {
  const user = {
    _id: "user-id",
    name: "User",
    email: "user@example.com",
    role: "alumni",
    password: "secret",
    isApproved: true,
    approvalStatus: "approved",
  };
  assert.equal(cleanObject(user).password, undefined);
  assert.equal(serializeUser(user, { password: "duplicated-secret" }).password, undefined);
});

test("role middleware rejects unauthorized users", () => {
  let statusCode;
  let nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  allowRoles("admin")({ user: { role: "alumni" } }, res, () => {
    nextCalled = true;
  });
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);
});

test("validation middleware returns field-level errors", () => {
  let statusCode;
  let responseBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };
  validate(z.object({ role: z.literal("alumni") }))(
    { body: { role: "admin" } },
    res,
    () => {}
  );
  assert.equal(statusCode, 400);
  assert.equal(responseBody.errors[0].field, "role");
});
