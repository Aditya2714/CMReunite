const Alumni = require("../models/alumniModel");
const Referral = require("../models/referralModel");
const User = require("../models/user");
const { notify } = require("../services/notificationService");

const getRequesterName = async (user) => {
  const profile = await Alumni.findOne({ user: user._id });
  return (
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email
  );
};

const getReferralRequests = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? {}
        : { $or: [{ requester: req.user._id }, { assignedTo: req.user._id }] };
    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      results: referrals.length,
      data: { referrals },
    });
  } catch (error) {
    console.error("Error fetching referral requests:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const createReferralRequest = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can request referrals" });
    }

    const { targetRole, company, reason, resumeUrl = "", jobUrl = "", deadline } = req.body;
    if (!targetRole || !company || !reason) {
      return res.status(400).json({ status: "fail", message: "Role, company, and reason are required" });
    }

    const referral = await Referral.create({
      requester: req.user._id,
      requesterName: await getRequesterName(req.user),
      requesterEmail: req.user.email,
      targetRole,
      company,
      reason,
      resumeUrl,
      jobUrl,
      deadline,
      status: "requested",
      statusHistory: [{ status: "requested", changedBy: req.user._id }],
    });

    return res.status(201).json({
      status: "success",
      message: "Referral request submitted",
      data: { referral },
    });
  } catch (error) {
    console.error("Error creating referral request:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const updateReferralStatus = async (req, res) => {
  try {
    const { status, adminNote = "", referrerNote, interviewAt, assignedTo } = req.body;
    const allowedStatuses = ["pending", "reviewing", "assigned", "shared", "successful", "requested", "under_review", "referred", "interviewing", "selected", "rejected", "withdrawn"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ status: "fail", message: "Invalid referral status" });
    }

    const referral = await Referral.findById(req.params.referralId);
    if (!referral) {
      return res.status(404).json({ status: "fail", message: "Referral request not found" });
    }
    const isAdmin = req.user.role === "admin";
    const isRequester = referral.requester.toString() === req.user._id.toString();
    const isAssignee = referral.assignedTo?.toString() === req.user._id.toString();
    if (!isAdmin && !(isRequester && status === "withdrawn") && !isAssignee) {
      return res.status(403).json({ status: "fail", message: "You cannot update this referral" });
    }
    if (assignedTo !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ status: "fail", message: "Only admin can assign referrals" });
      }
      const assignee = await User.findOne({
        _id: assignedTo,
        role: "alumni",
        isApproved: true,
      });
      if (!assignee) {
        return res.status(404).json({ status: "fail", message: "Approved alumni assignee not found" });
      }
      referral.assignedTo = assignee._id;
      referral.assignedToName = assignee.name || assignee.email;
      referral.status = "assigned";
      await notify({
        recipient: assignee._id,
        type: "referral",
        title: "Referral request assigned",
        message: `A ${referral.targetRole} referral request for ${referral.company} was assigned to you.`,
        link: "/career-referrals",
        metadata: { referralId: referral._id },
      });
    } else if (status !== undefined) {
      referral.status = status;
    }
    if (isAdmin) referral.adminNote = adminNote;
    if (referrerNote !== undefined && (isAssignee || isAdmin)) referral.referrerNote = referrerNote;
    if (interviewAt !== undefined && (isAssignee || isAdmin)) referral.interviewAt = interviewAt;
    referral.statusHistory.push({
      status: referral.status,
      note: adminNote,
      changedBy: req.user._id,
    });
    await referral.save();
    if (!isRequester) {
      await notify({
        recipient: referral.requester,
        type: "referral",
        title: "Referral request updated",
        message: `${referral.targetRole} at ${referral.company} is now ${referral.status}.`,
        link: "/career-referrals",
        metadata: { referralId: referral._id, status: referral.status },
      });
    }

    return res.status(200).json({
      status: "success",
      data: { referral },
    });
  } catch (error) {
    console.error("Error updating referral status:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createReferralRequest,
  getReferralRequests,
  updateReferralStatus,
};
