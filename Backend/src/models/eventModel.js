const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    default: "10:00 AM",
  },
  type: {
    type: String,
    default: "Campus Event",
  },
  attendees: {
    type: Number,
    default: 0,
  },
  capacity: {
    type: Number,
    min: 1,
    default: 100,
  },
  registrationDeadline: Date,
  isRegistrationOpen: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
