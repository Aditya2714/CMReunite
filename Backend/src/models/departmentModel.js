const mongoose = require("mongoose");
module.exports = mongoose.model("Department", new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, immutable: true },
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  operationLock: { token: String, until: Date },
}, { timestamps: true }));
