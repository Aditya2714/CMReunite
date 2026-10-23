const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  createMentorshipRequest,
  getMentors,
  getMentorshipRequests,
  updateMentorshipStatus,
  addMentorshipMilestone,
} = require("../controllers/mentorshipController");

const router = express.Router();

router.use(checkAuth);
router.get("/", asyncHandler(getMentorshipRequests));
router.get("/mentors", asyncHandler(getMentors));
router.post("/", asyncHandler(createMentorshipRequest));
router.patch("/:requestId", asyncHandler(updateMentorshipStatus));
router.post("/:requestId/progress", asyncHandler(addMentorshipMilestone));

module.exports = router;
