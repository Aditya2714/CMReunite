const asyncHandler = require("../middlewares/asyncHandler");
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
router.get("/", asyncHandler(getNotifications));
router.get("/preferences", asyncHandler(getNotificationPreferences));
router.patch("/preferences", asyncHandler(updateNotificationPreferences));
router.patch("/read-all", asyncHandler(markAllNotificationsRead));
router.patch("/:id/read", asyncHandler(markNotificationRead));

module.exports = router;
