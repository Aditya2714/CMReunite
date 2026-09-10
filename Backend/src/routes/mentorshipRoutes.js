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
router.get("/", getMentorshipRequests);
router.get("/mentors", getMentors);
router.post("/", createMentorshipRequest);
router.patch("/:requestId", updateMentorshipStatus);
router.post("/:requestId/progress", addMentorshipMilestone);

module.exports = router;
