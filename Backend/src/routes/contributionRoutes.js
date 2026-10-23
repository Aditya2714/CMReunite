const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  createContributionCampaign,
  getContributionCampaigns,
  pledgeContribution,
} = require("../controllers/contributionController");

const router = express.Router();

router.use(checkAuth);
router.get("/", asyncHandler(getContributionCampaigns));
router.post("/", asyncHandler(require("../services/departmentAccess").managementGuard), asyncHandler(createContributionCampaign));
router.post("/:campaignId/pledge", asyncHandler(pledgeContribution));

module.exports = router;
