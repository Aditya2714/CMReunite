const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} = require("../controllers/notificationController");

const router = express.Router();
router.use(checkAuth);
router.get("/", getNotifications);
router.get("/preferences", getNotificationPreferences);
router.patch("/preferences", updateNotificationPreferences);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
