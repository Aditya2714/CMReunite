const express = require("express");
const router = express.Router();

const registerRoute = require("./registerRoute");
const loginRoute = require("./loginRoute");
const alumniListRoute = require("./alumniListRoute");
const jobRoutes = require("./jobRoutes");
const eventRoutes = require("./eventRoutes");
const bulkImportRoute = require("./bulkImportRoute");
const profileRoutes = require("./profileRoutes");
const alumniRoutes = require("./alumniRoutes");
const adminRoutes = require("./adminRoutes");
const announcementRoutes = require("./announcementRoutes");
const recognitionRoutes = require("./recognitionRoutes");
const connectionRoutes = require("./connectionRoutes");
const mentorshipRoutes = require("./mentorshipRoutes");
const referralRoutes = require("./referralRoutes");
const communityRoutes = require("./communityRoutes");
const contributionRoutes = require("./contributionRoutes");
const publicEventRoutes = require("./publicEventRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const notificationRoutes = require("./notificationRoutes");
const messageRoutes = require("./messageRoutes");
const assistantRoutes = require("./assistantRoutes");
const networkRoutes = require("./networkRoutes");

// ✅ root test
router.get("/", (req, res) => {
  console.log("Server is up and running.");
  res.send("Server is up and running.");
});

// ✅ routes
router.use("/register", registerRoute);
router.use("/event", publicEventRoutes);
router.use("/event", eventRoutes);
router.use("/auth", loginRoute);   // 👉 IMPORTANT
router.use("/jobs", jobRoutes);
router.use("/bulk", bulkImportRoute);
router.use("/profile", profileRoutes);
router.use("/alumni", alumniRoutes);
router.use("/admin", adminRoutes);
router.use("/announcements", announcementRoutes);
router.use("/recognition", recognitionRoutes);
router.use("/connections", connectionRoutes);
router.use("/mentorship", mentorshipRoutes);
router.use("/referrals", referralRoutes);
router.use("/community", communityRoutes);
router.use("/contributions", contributionRoutes);
router.use("/ml", recommendationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/messages", messageRoutes);
router.use("/assistant", assistantRoutes);
router.use("/network", networkRoutes);
router.use("/", alumniListRoute);

module.exports = router;
