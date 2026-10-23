const mongoose = require("mongoose");
const Post = require("./postModel");
const schema = new mongoose.Schema({
  company: { type: String, default: "Not specified" },
  location: { type: String, default: "Not specified" },
  type: { type: String, default: "Full-time" },
  status: { type: String, default: "Open" },
  vacancy: { type: Number, default: 1 },
    placementNotification: {
      type: new mongoose.Schema({
        status: { type: String, enum: ["disabled", "pending", "processing", "retry", "sent", "failed"], default: "disabled" },
        attempts: { type: Number, default: 0 },
        recipient: String,
        frontendUrl: String,
        snapshot: new mongoose.Schema({
          title: String, description: String, company: String, location: String,
          type: String, status: String, vacancy: Number, alumniName: String, alumniEmail: String,
        }, { _id: false }),
        nextAttemptAt: Date, lockUntil: Date, claimToken: String, sentAt: Date, lastErrorCode: String,
      }, { _id: false }),
      select: false,
    },
});
schema.index({ "placementNotification.status": 1, "placementNotification.nextAttemptAt": 1 });
const Job = Post.discriminator("Job", schema, "job");
module.exports = { Job };
