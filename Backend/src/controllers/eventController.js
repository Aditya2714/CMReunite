const Event = require("../models/eventModel");
const EventRegistration = require("../models/eventRegistrationModel");
const crypto = require("crypto");
const { notify } = require("../services/notificationService");

const createEventController = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }
    const {
      title,
      date,
      location,
      description,
      time,
      type,
      capacity,
      registrationDeadline,
    } = req.body;

    if (!title || !date || !location || !description) {
      return res.status(400).json({
        status: "fail",
        message: "Title, date, location, and description are required",
      });
    }

    const event = await Event.create({
      title,
      date,
      location,
      description,
      time,
      type,
      attendees: 0,
      capacity,
      registrationDeadline,
      createdBy: req.user._id,
    });

    res.status(201).json({
      status: "success",
      data: {
        event,
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
    });
  }
};

const getAllEventsController = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("createdBy", "name email role")
      .sort({ date: 1 });
    const registrations = await EventRegistration.find({ user: req.user._id });
    const registrationByEvent = new Map(
      registrations.map((registration) => [registration.event.toString(), registration])
    );
    const eventsWithRegistration = events.map((event) => ({
      ...event.toObject(),
      isRegistered: ["registered", "attended"].includes(
        registrationByEvent.get(event._id.toString())?.status
      ),
      registrationStatus: registrationByEvent.get(event._id.toString())?.status || null,
      checkInCode: registrationByEvent.get(event._id.toString())?.checkInCode || null,
    }));

    res.status(200).json({
      status: "success",
      data: {
        events: eventsWithRegistration,
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
    });
  }
};

const toggleEventRegistrationController = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can register for events" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ status: "fail", message: "Event not found" });
    }
    if (!event.isRegistrationOpen) {
      return res.status(400).json({ status: "fail", message: "Registration is closed" });
    }
    if (event.registrationDeadline && event.registrationDeadline < new Date()) {
      return res.status(400).json({ status: "fail", message: "Registration deadline has passed" });
    }

    const existingRegistration = await EventRegistration.findOne({
      event: event._id,
      user: req.user._id,
    });

    if (existingRegistration) {
      if (existingRegistration.status === "attended") {
        return res.status(400).json({
          status: "fail",
          message: "Attendance has already been recorded and cannot be cancelled",
        });
      }
      await EventRegistration.findByIdAndDelete(existingRegistration._id);
      const releasedSeat = ["registered", "attended"].includes(existingRegistration.status);
      if (releasedSeat) {
        event.attendees = Math.max((event.attendees || 0) - 1, 0);
      }
      const promoted = releasedSeat
        ? await EventRegistration.findOneAndUpdate(
            { event: event._id, status: "waitlisted" },
            {
              status: "registered",
              checkInCode: crypto.randomBytes(6).toString("hex").toUpperCase(),
            },
            { new: true, sort: { createdAt: 1 } }
          )
        : null;
      if (promoted) {
        event.attendees += 1;
        await notify({
          recipient: promoted.user,
          type: "event",
          title: "Moved off the event waitlist",
          message: `A place is now available for ${event.title}.`,
          link: "/events",
          metadata: { eventId: event._id },
        });
      }
      await event.save();

      return res.status(200).json({
        status: "success",
        message: "Event registration cancelled",
        data: { event: { ...event.toObject(), isRegistered: false } },
      });
    }

    const isFull = event.attendees >= event.capacity;
    const registration = await EventRegistration.create({
      event: event._id,
      user: req.user._id,
      status: isFull ? "waitlisted" : "registered",
      checkInCode: isFull ? undefined : crypto.randomBytes(6).toString("hex").toUpperCase(),
    });
    if (!isFull) event.attendees = (event.attendees || 0) + 1;
    await event.save();

    return res.status(200).json({
      status: "success",
      message: isFull ? "Event is full; you have joined the waitlist" : "Event registered successfully",
      data: {
        event: {
          ...event.toObject(),
          isRegistered: !isFull,
          registrationStatus: registration.status,
          checkInCode: registration.checkInCode,
        },
      },
    });
  } catch (error) {
    console.error("Error updating event registration:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const updateEventController = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const allowedFields = [
      "title",
      "date",
      "location",
      "description",
      "time",
      "type",
      "capacity",
      "registrationDeadline",
      "isRegistrationOpen",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const event = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({ status: "fail", message: "Event not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { event },
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const deleteEventController = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ status: "fail", message: "Event not found" });
    }
    await EventRegistration.deleteMany({ event: event._id });

    return res.status(200).json({
      status: "success",
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const checkInEventAttendee = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }
    const code = String(req.body.checkInCode || "").trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ status: "fail", message: "Check-in code is required" });
    }
    const registration = await EventRegistration.findOneAndUpdate(
      { event: req.params.id, checkInCode: code, status: "registered" },
      { status: "attended", checkedInAt: new Date() },
      { new: true }
    ).populate("user", "name email");
    if (!registration) {
      return res.status(404).json({ status: "fail", message: "Valid registration not found" });
    }
    await notify({
      recipient: registration.user._id,
      type: "event",
      title: "Event attendance confirmed",
      message: `Your attendance has been recorded.`,
      link: "/events",
      metadata: { eventId: req.params.id },
    });
    return res.status(200).json({ status: "success", data: { registration } });
  } catch (error) {
    console.error("Event check-in failed:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getUpcomingEventsController = async (req, res) => {
  try {
    const events = await Event.find({ date: { $gte: new Date() } })
      .select("title date location time type")
      .sort({ date: 1 })
      .limit(10);

    res.status(200).json({
      status: "success",
      data: { events },
    });
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createEventController,
  deleteEventController,
  getAllEventsController,
  toggleEventRegistrationController,
  updateEventController,
  getUpcomingEventsController,
  checkInEventAttendee,
};
