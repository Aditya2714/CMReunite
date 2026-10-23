// Local-only disposable test server; never loaded in production.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "directory-browser-tests-only";
process.env.PLACEMENT_JOB_EMAIL_ENABLED = "false";
const { seedDirectoryFixtures } = require("./directoryFixtures");
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();
  await seedDirectoryFixtures();
  const app = require("../../app");
  app.get("/__test/ready", (req, res) => res.json({ status: "ready" }));
  const server = app.listen(4000, "127.0.0.1", () => console.log("Directory E2E backend ready"));
  const stop = async () => { server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
})().catch((error) => { console.error(error); process.exit(1); });
