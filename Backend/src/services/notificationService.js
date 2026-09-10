const Notification = require("../models/notificationModel");
const { emitToUser } = require("./realtimeService");
const User = require("../models/user");
const { sendNotificationEmail } = require("../utils/emailHelper");
const { enqueue } = require("./jobQueue");

const insideQuietHours = (preferences, date = new Date()) => {
  const [startHour, startMinute] = (preferences?.quietHoursStart || "22:00").split(":").map(Number);
  const [endHour, endMinute] = (preferences?.quietHoursEnd || "07:00").split(":").map(Number);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
};

const notify = async ({ recipient, type, title, message, link = "", metadata = {} }) => {
  if (!recipient) return null;
  const user = await User.findById(recipient).select("email notificationPreferences").lean();
  const preferences = user?.notificationPreferences;
  if (preferences?.categories?.[type] === false) return null;
  if (preferences?.email && preferences?.digest === "instant" && !insideQuietHours(preferences)) {
    enqueue("notification-email", () => sendNotificationEmail(user.email, title, message, link));
  }
  if (preferences?.inApp === false) return null;
  const notification = await Notification.create({
    recipient,
    type,
    title,
    message,
    link,
    metadata,
  });
  emitToUser(recipient, "notification:new", notification);
  return notification;
};

const notifyMany = async (recipients, notification) => {
  const items = await Notification.insertMany(
    [...new Set(recipients.map(String))].map((recipient) => ({
      recipient,
      ...notification,
    }))
  );
  items.forEach((item) => emitToUser(item.recipient, "notification:new", item));
  return items;
};

module.exports = { notify, notifyMany };
