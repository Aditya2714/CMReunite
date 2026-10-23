const asyncHandler = require("../middlewares/asyncHandler");
// routes/jobRoutes.js
const express = require("express");
const router = express.Router();
const {
  createJobController,
  getPlacementNotificationStatus,
  deleteJobController,
  getAllJobsController,
  updateJobController,
} = require("../controllers/jobController");

const checkAuth = require("../middlewares/checkAuth");

// Assuming you have middleware for authentication
router.get("/placement-notification-status", asyncHandler(checkAuth), asyncHandler(getPlacementNotificationStatus));
router.post("/create", asyncHandler(checkAuth), asyncHandler(createJobController));
router.get("/all", asyncHandler(checkAuth), asyncHandler(getAllJobsController));
router.patch("/:id", asyncHandler(checkAuth), asyncHandler(updateJobController));
router.delete("/:id", asyncHandler(checkAuth), asyncHandler(deleteJobController));

module.exports = router;
