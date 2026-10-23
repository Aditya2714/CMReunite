const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const { sendOtp, verifyOtp } = require("../controllers/otpController");

const router = express.Router();

router.post("/send", asyncHandler(sendOtp));
router.post("/verify", asyncHandler(verifyOtp));

module.exports = router;
