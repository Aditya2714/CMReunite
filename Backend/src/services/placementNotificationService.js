const { randomUUID } = require("node:crypto");
const { Job } = require("../models/job");
const { sendPlacementJobEmail } = require("../utils/emailHelper");
const MAX_ATTEMPTS = 3;
const LEASE_MS = 120000;
let running = false;
let timer;

const placementEmailConfig = () => {
  const enabled = process.env.PLACEMENT_JOB_EMAIL_ENABLED === "true";
  const recipient = String(process.env.PLACEMENT_OFFICE_EMAIL || "").trim();
  let frontendUrl;
  try {
    const url = new URL(process.env.FRONTEND_URL || "");
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) frontendUrl = url.origin;
  } catch { /* Missing configuration keeps delivery disabled. */ }
  const ready = enabled && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient) &&
    Boolean(require("../utils/emailTransport").isConfigured() && frontendUrl);
  return { status: !enabled ? "disabled" : ready ? "enabled" : "not_configured", ready, recipient, frontendUrl };
};

const initialPlacementNotification = (fields, author) => {
  const config = placementEmailConfig();
  if (!config.ready) return { status: "disabled", attempts: 0 };
  return {
    status: "pending", attempts: 0, nextAttemptAt: new Date(), recipient: config.recipient,
    frontendUrl: config.frontendUrl,
    snapshot: { ...fields, alumniName: author.name || author.email, alumniEmail: author.email },
  };
};

// Atomic MongoDB claims protect against concurrent workers. State survives process restarts.
const processPlacementNotifications = async ({ now = new Date(), batchSize = 10 } = {}) => {
  if (running || !placementEmailConfig().ready) return;
  running = true;
  try {
    await Job.updateMany({
      "placementNotification.status": "processing",
      "placementNotification.lockUntil": { $lte: now },
      "placementNotification.attempts": { $gte: MAX_ATTEMPTS },
    }, { $set: { "placementNotification.status": "failed", "placementNotification.lastErrorCode": "WORKER_INTERRUPTED" } });
    for (let index = 0; index < batchSize; index++) {
      if (!placementEmailConfig().ready) break;
      const claimToken = randomUUID();
      const job = await Job.findOneAndUpdate({
        "placementNotification.attempts": { $lt: MAX_ATTEMPTS },
        $or: [
          { "placementNotification.status": { $in: ["pending", "retry"] }, "placementNotification.nextAttemptAt": { $lte: now } },
          { "placementNotification.status": "processing", "placementNotification.lockUntil": { $lte: now } },
        ],
      }, { $set: {
        "placementNotification.status": "processing",
        "placementNotification.claimToken": claimToken,
        "placementNotification.lockUntil": new Date(now.getTime() + LEASE_MS),
      }, $inc: { "placementNotification.attempts": 1 } }, { new: true })
        .select("+placementNotification");
      if (!job) break;
      const notification = job.placementNotification;
      const ownership = { _id: job._id, "placementNotification.claimToken": claimToken };
      try {
        await sendPlacementJobEmail(job);
        await Job.updateOne(ownership, { $set: {
          "placementNotification.status": "sent", "placementNotification.sentAt": new Date(),
          "placementNotification.lastErrorCode": "",
        }, $unset: { "placementNotification.lockUntil": 1, "placementNotification.claimToken": 1, "placementNotification.nextAttemptAt": 1 } });
      } catch (error) {
        const exhausted = notification.attempts >= MAX_ATTEMPTS;
        await Job.updateOne(ownership, { $set: {
          "placementNotification.status": exhausted ? "failed" : "retry",
          "placementNotification.lastErrorCode": String(error.code || "EMAIL_SEND_FAILED").slice(0, 80),
          "placementNotification.nextAttemptAt": new Date(now.getTime() + 30000 * 2 ** (notification.attempts - 1)),
        }, $unset: { "placementNotification.lockUntil": 1, "placementNotification.claimToken": 1 } });
        console.error("Placement email attempt failed", { jobId: String(job._id), attempt: notification.attempts, code: error.code || "EMAIL_SEND_FAILED" });
      }
    }
  } finally { running = false; }
};
const wakePlacementNotifications = () => setImmediate(() => {
  processPlacementNotifications().catch((error) => console.error("Placement email worker failed:", error.code || error.name));
});
const startPlacementNotificationWorker = () => {
  if (timer) return;
  wakePlacementNotifications();
  timer = setInterval(wakePlacementNotifications, 15000);
  timer.unref();
};
const stopPlacementNotificationWorker = () => { clearInterval(timer); timer = undefined; };
const drain = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (running && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  if (running) require("../utils/operationalLog").failure("shutdown.placement_unfinished", { code: "PLACEMENT_LEASE_RETAINS_WORK" });
};
module.exports = { drain, placementEmailConfig, initialPlacementNotification, processPlacementNotifications, wakePlacementNotifications, startPlacementNotificationWorker, stopPlacementNotificationWorker };
