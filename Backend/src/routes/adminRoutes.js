const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const allowRoles = require("../middlewares/allowRoles");
const {
  getAdminOverview,
  getPendingAlumni,
  getUsersForAdmin,
  updateUserApproval,
  exportEngagementReport,
} = require("../controllers/adminController");

const router = express.Router();

router.use(checkAuth);
router.use(allowRoles("admin"));
router.get("/overview", getAdminOverview);
router.get("/reports/export", exportEngagementReport);
router.get("/pending-alumni", getPendingAlumni);
router.get("/users", getUsersForAdmin);
router.patch("/users/:userId/approval", updateUserApproval);

module.exports = router;
