const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  target: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  details: { type: Object, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: -1, _id: -1 });
// No application endpoint or service supports changing/deleting audit records.
module.exports = mongoose.model("AuditLog", schema);
