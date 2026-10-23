const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const router = express.Router();
const { getUpcomingEventsController } = require("../controllers/eventController");

// Public endpoint — no auth required
router.get("/upcoming", asyncHandler(getUpcomingEventsController));

module.exports = router;
