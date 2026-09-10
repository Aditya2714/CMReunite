const Notification = require("../models/notificationModel");
const EventRegistration = require("../models/eventRegistrationModel");
const Mentorship = require("../models/mentorshipModel");
const Referral = require("../models/referralModel");

const createReminder = async (recipient, type, title, message, link, reminderKey) => {
  try {
    await Notification.updateOne(
      { recipient, "metadata.reminderKey": reminderKey },
      { $setOnInsert: { recipient, type, title, message, link, metadata: { reminderKey } } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const createDueReminders = async (userId) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const [registrations, sessions, referrals] = await Promise.all([
    EventRegistration.find({ user: userId, status: "registered" }).populate({
      path: "event", match: { date: { $gte: now, $lte: horizon } }, select: "title date",
    }).lean(),
    Mentorship.find({
      $or: [{ requester: userId }, { mentor: userId }],
      status: "scheduled", scheduledAt: { $gte: now, $lte: horizon },
    }).lean(),
    Referral.find({
      requester: userId,
      status: { $nin: ["selected", "successful", "rejected", "withdrawn"] },
      deadline: { $gte: now, $lte: horizon },
    }).lean(),
  ]);
  await Promise.all([
    ...registrations.filter((item) => item.event).map((item) => createReminder(
      userId, "event", "Upcoming event", `${item.event.title} starts within 48 hours.`, "/events", `event-${item.event._id}`
    )),
    ...sessions.map((item) => createReminder(
      userId, "mentorship", "Mentorship session reminder", `${item.topic} is scheduled within 48 hours.`, "/mentorship", `mentorship-${item._id}-${item.scheduledAt.toISOString()}`
    )),
    ...referrals.map((item) => createReminder(
      userId, "referral", "Referral deadline approaching", `${item.targetRole} at ${item.company} closes within 48 hours.`, "/career-referrals", `referral-${item._id}-${item.deadline.toISOString()}`
    )),
  ]);
};

const getNotifications = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  await createDueReminders(req.user._id);
  const filter = { recipient: req.user._id };
  if (req.query.type && req.query.type !== "all") filter.type = req.query.type;
  if (req.query.unread === "true") filter.readAt = null;
  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    Notification.countDocuments(filter),
  ]);
  return res.status(200).json({
    status: "success",
    data: {
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

const getNotificationPreferences = async (req, res) => res.status(200).json({
  status: "success",
  data: { preferences: req.user.notificationPreferences },
});

const updateNotificationPreferences = async (req, res) => {
  try {
    const allowed = ["inApp", "email", "digest", "quietHoursStart", "quietHoursEnd", "categories"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[`notificationPreferences.${field}`] = req.body[field];
    });
    const user = await req.user.constructor.findByIdAndUpdate(req.user._id, { $set: updates }, {
      new: true, runValidators: true,
    });
    return res.status(200).json({ status: "success", data: { preferences: user.notificationPreferences } });
  } catch (error) {
    return res.status(400).json({ status: "fail", message: error.message || "Invalid notification preferences" });
  }
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) {
    return res.status(404).json({ status: "fail", message: "Notification not found" });
  }
  return res.status(200).json({ status: "success", data: { notification } });
};

const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { readAt: new Date() }
  );
  return res.status(200).json({ status: "success", message: "Notifications marked as read" });
};

module.exports = { getNotifications, getNotificationPreferences, markAllNotificationsRead, markNotificationRead, updateNotificationPreferences };
