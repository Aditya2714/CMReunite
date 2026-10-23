const Alumni = require("../models/alumniModel");
const ContributionCampaign = require("../models/contributionCampaignModel");

const getUserName = async (user) => {
  if (user.role !== "alumni") return user.name || user.email;

  const profile = await Alumni.findOne({ user: user._id });
  return (
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email
  );
};

const formatCampaign = (campaign) => {
  const object = campaign.toObject();
  const pledgedAmount = object.pledges.reduce(
    (total, pledge) => total + Number(pledge.amount || 0),
    0
  );

  return {
    ...object,
    pledgedAmount,
    pledgeCount: object.pledges.length,
  };
};

const getContributionCampaigns = async (req, res) => {
  try {
    const campaigns = await ContributionCampaign.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      data: { campaigns: campaigns.map(formatCampaign) },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("contributionController.failed", error);
    throw error;
  }
};

const createContributionCampaign = async (req, res) => {
  try {
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ status: "fail", message: "Only admin can create contribution campaigns" });
    }

    const { title, purpose, targetAmount } = req.body;
    if (!title || !purpose) {
      return res.status(400).json({ status: "fail", message: "Title and purpose are required" });
    }

    const campaign = await ContributionCampaign.create({
      title,
      purpose,
      targetAmount: Number(targetAmount) || 0,
      createdBy: req.user._id,
      department: req.user.department,
      scope: req.user.role === "super_admin" ? "platform" : "department",
    });

    await require("../services/departmentAccess").audit(req.user, "contribution.created", campaign._id, campaign.department);
    return res.status(201).json({
      status: "success",
      data: { campaign: formatCampaign(campaign) },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("contributionController.failed", error);
    throw error;
  }
};

const pledgeContribution = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can pledge contributions" });
    }

    const { amount, note = "" } = req.body;
    const pledgeAmount = Number(amount);
    if (!pledgeAmount || pledgeAmount <= 0) {
      return res.status(400).json({ status: "fail", message: "Valid contribution amount is required" });
    }

    const campaign = await ContributionCampaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ status: "fail", message: "Contribution campaign not found" });
    }

    campaign.pledges.push({
      contributor: req.user._id,
      contributorName: await getUserName(req.user),
      amount: pledgeAmount,
      note,
    });
    await campaign.save();

    return res.status(200).json({
      status: "success",
      message: "Contribution pledge recorded",
      data: { campaign: formatCampaign(campaign) },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("contributionController.failed", error);
    throw error;
  }
};

module.exports = {
  createContributionCampaign,
  getContributionCampaigns,
  pledgeContribution,
};
