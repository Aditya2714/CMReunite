const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  createContributionCampaign,
  getContributionCampaigns,
  pledgeContribution,
} = require("../controllers/contributionController");

const router = express.Router();

router.use(checkAuth);
router.get("/", getContributionCampaigns);
router.post("/", createContributionCampaign);
router.post("/:campaignId/pledge", pledgeContribution);

module.exports = router;
