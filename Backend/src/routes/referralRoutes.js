const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  createReferralRequest,
  getReferralRequests,
  updateReferralStatus,
} = require("../controllers/referralController");

const router = express.Router();

router.use(checkAuth);
router.get("/", asyncHandler(getReferralRequests));
router.post("/", asyncHandler(createReferralRequest));
router.patch("/:referralId", asyncHandler(updateReferralStatus));

module.exports = router;
