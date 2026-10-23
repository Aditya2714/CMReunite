const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getAdminOverview,
  getRejectionReasons,
  getPendingAlumni,
  getUsersForAdmin,
  updateUserApproval,
  exportEngagementReport,
} = require("../controllers/adminController");

const router = express.Router();

router.use(checkAuth);
router.use(require("../services/departmentAccess").managementGuard);
router.get("/alumni-records", asyncHandler(require("../controllers/adminController").getManagedAlumni));
router.get("/overview", asyncHandler(getAdminOverview));
router.get("/rejection-reasons", asyncHandler(getRejectionReasons));
router.get("/reports/export", asyncHandler(exportEngagementReport));
router.get("/pending-alumni", asyncHandler(getPendingAlumni));
router.get("/users", asyncHandler(getUsersForAdmin));
router.patch("/users/:userId/approval", asyncHandler(updateUserApproval));

module.exports = router;
