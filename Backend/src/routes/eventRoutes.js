const asyncHandler = require("../middlewares/asyncHandler");
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

router.post("/create", require("../middlewares/eventAccess"), asyncHandler(createEventController));
router.get("/all", require("../middlewares/eventAccess"), asyncHandler(getAllEventsController));
router.post("/:id/register", require("../middlewares/eventAccess"), asyncHandler(toggleEventRegistrationController));
router.post("/:id/check-in", require("../middlewares/eventAccess"), asyncHandler(checkInEventAttendee));
router.patch("/:id", require("../middlewares/eventAccess"), asyncHandler(updateEventController));
router.delete("/:id", require("../middlewares/eventAccess"), asyncHandler(deleteEventController));

module.exports = router;
