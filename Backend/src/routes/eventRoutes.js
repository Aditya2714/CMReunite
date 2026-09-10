const express = require("express");
const router = express.Router();
const {
  createEventController,
  deleteEventController,
  getAllEventsController,
  toggleEventRegistrationController,
  updateEventController,
  checkInEventAttendee,
} = require("../controllers/eventController");
const checkAuth = require("../middlewares/checkAuth");

// Assuming you have middleware for authentication
router.use(checkAuth);

router.post("/create", createEventController);
router.get("/all", getAllEventsController);
router.post("/:id/register", toggleEventRegistrationController);
router.post("/:id/check-in", checkInEventAttendee);
router.patch("/:id", updateEventController);
router.delete("/:id", deleteEventController);

module.exports = router;
