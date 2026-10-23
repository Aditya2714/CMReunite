const Notification = require("../models/notificationModel");
const realtime = require("./realtimeService");
const User = require("../models/user");
const email = require("../utils/emailHelper");
const queue = require("./jobQueue");
const { failure, context } = require("../utils/operationalLog");
const insideQuietHours = (preferences, date = new Date()) => {
  const [sh, sm] = (preferences?.quietHoursStart || "22:00").split(":").map(Number);
  const [eh, em] = (preferences?.quietHoursEnd || "07:00").split(":").map(Number);
  const minutes = date.getHours() * 60 + date.getMinutes(), start = sh * 60 + sm, end = eh * 60 + em;
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
};
// Secondary delivery is deliberately best effort. Primary business writes stay authoritative.
const notify = async ({ recipient, type, title, message, link = "", metadata = {}, skipEmail = false }) => {
  if (!recipient) return null;
  try {
    const user = await User.findOne({ _id: recipient, isActive: { $ne: false } }).select("email notificationPreferences").lean();
    if (!user) return null;
    const preferences = user.notificationPreferences;
    if (preferences?.categories?.[type] === false) return null;
    const keyed = metadata.reminderKey !== undefined;
    if (keyed && (typeof metadata.reminderKey !== "string" || !metadata.reminderKey.trim())) throw Object.assign(new Error(), { code: "INVALID_REMINDER_KEY" });
    let notification = null;
    // Keyed claims are recorded even when in-app delivery is disabled, so email cannot duplicate.
    if (keyed || preferences?.inApp !== false) {
      try { notification = await Notification.create({ recipient, type, title, message, link, metadata: { ...metadata, ...(preferences?.inApp === false ? { suppressInApp: true } : {}) }, ...(preferences?.inApp === false ? { readAt: new Date() } : {}) }); }
      catch (error) {
        if (keyed && error.code === 11000 && await Notification.exists({ recipient, "metadata.reminderKey": metadata.reminderKey })) return null;
        throw error;
      }
    }
    if (!skipEmail && preferences?.email && preferences?.digest === "instant" && !insideQuietHours(preferences)) {
      const requestContext = context.getStore();
      queue.enqueue("notification-email", () => context.run(requestContext || {}, async () => {
        try { await email.sendNotificationEmail(user.email, title, message, link); } catch (error) { failure("notification.email_failed", error, { recipientId: recipient }); }
      }));
    }
    if (notification && preferences?.inApp !== false) {
      try { realtime.emitToUser(recipient, "notification:new", notification); } catch (error) { failure("notification.realtime_failed", error, { notificationId: notification._id }); }
    }
    return notification;
  } catch (error) { failure("notification.delivery_failed", error, { recipientId: recipient }); return null; }
};
const notifyMany = async (recipients, notification) => Promise.all([...new Set(recipients.map(String))].map((recipient) => notify({ ...notification, recipient })));
module.exports = { notify, notifyMany };
