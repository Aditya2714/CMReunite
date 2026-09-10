const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  createReferralRequest,
  getReferralRequests,
  updateReferralStatus,
} = require("../controllers/referralController");

const router = express.Router();

router.use(checkAuth);
router.get("/", getReferralRequests);
router.post("/", createReferralRequest);
router.patch("/:referralId", updateReferralStatus);

module.exports = router;
