const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const { Admin } = require("../models/adminModel");
const Event = require("../models/eventModel");
const { Job } = require("../models/job");
const Announcement = require("../models/announcementModel");
const Recognition = require("../models/recognitionModel");
const { sendApprovalEmail, sendRejectionEmail } = require("../utils/emailHelper");
const { notify } = require("../services/notificationService");
const { enqueue } = require("../services/jobQueue");
const Mentorship = require("../models/mentorshipModel");
const Referral = require("../models/referralModel");
const Message = require("../models/messageModel");
const EventRegistration = require("../models/eventRegistrationModel");
const Connection = require("../models/connectionModel");

const requireAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ status: "fail", message: "Admin access required" });
    return false;
  }
  return true;
};

const getAdminOverview = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const [
      users,
      alumni,
      admins,
      events,
      jobs,
      announcements,
      recognitions,
      pendingAlumni,
      approvedAlumniUsers,
      rejectedAlumniUsers,
      alumniByBranch,
      alumniByBatch,
      jobsByStatus,
      eventsByType,
      announcementsByAudience,
      recentAlumni,
      recentEvents,
      recentJobs,
      recentAnnouncements,
      acceptedConnections,
      mentorships,
      completedMentorships,
      referrals,
      successfulReferrals,
      eventRegistrations,
      attendedEvents,
      messages,
      registrationGrowth,
    ] = await Promise.all([
      User.countDocuments(),
      Alumni.countDocuments(),
      Admin.countDocuments(),
      Event.countDocuments(),
      Job.countDocuments(),
      Announcement.countDocuments(),
      Recognition.countDocuments(),
      User.countDocuments({
        role: "alumni",
        isApproved: false,
        approvalStatus: { $ne: "rejected" },
      }),
      User.countDocuments({
        role: "alumni",
        isApproved: true,
        approvalStatus: "approved",
      }),
      User.countDocuments({
        role: "alumni",
        approvalStatus: "rejected",
      }),
      Alumni.aggregate([
        { $group: { _id: "$branch", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),
      Alumni.aggregate([
        { $group: { _id: "$endYear", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 6 },
      ]),
      Job.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Event.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),
      Announcement.aggregate([
        { $group: { _id: "$audience", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 6 },
      ]),
      Alumni.find()
        .select("firstName lastName email branch endYear company designation createdAt")
        .sort({ createdAt: -1 })
        .limit(5),
      Event.find().select("title date type attendees createdAt").sort({ createdAt: -1 }).limit(5),
      Job.find().select("title company status vacancy createdAt").sort({ createdAt: -1 }).limit(5),
      Announcement.find().select("title audience createdAt").sort({ createdAt: -1 }).limit(5),
      Connection.countDocuments({ status: "accepted" }),
      Mentorship.countDocuments(),
      Mentorship.countDocuments({ status: "completed" }),
      Referral.countDocuments(),
      Referral.countDocuments({ status: { $in: ["successful", "selected"] } }),
      EventRegistration.countDocuments({ status: { $in: ["registered", "attended"] } }),
      EventRegistration.countDocuments({ status: "attended" }),
      Message.countDocuments(),
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) } } },
        { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        overview: {
          users,
          alumni,
          admins,
          events,
          jobs,
          announcements,
          recognitions,
          pendingAlumni,
          approvedAlumniUsers,
          rejectedAlumniUsers,
          engagement: {
            acceptedConnections,
            mentorships,
            completedMentorships,
            mentorshipCompletionRate: mentorships ? Math.round((completedMentorships / mentorships) * 100) : 0,
            referrals,
            successfulReferrals,
            referralSuccessRate: referrals ? Math.round((successfulReferrals / referrals) * 100) : 0,
            eventRegistrations,
            attendedEvents,
            attendanceRate: eventRegistrations ? Math.round((attendedEvents / eventRegistrations) * 100) : 0,
            messages,
          },
          breakdowns: {
            alumniByBranch: alumniByBranch.map((item) => ({
              label: item._id || "Not added",
              count: item.count,
            })),
            alumniByBatch: alumniByBatch.map((item) => ({
              label: item._id || "Not added",
              count: item.count,
            })),
            jobsByStatus: jobsByStatus.map((item) => ({
              label: item._id || "Not added",
              count: item.count,
            })),
            eventsByType: eventsByType.map((item) => ({
              label: item._id || "Not added",
              count: item.count,
            })),
            announcementsByAudience: announcementsByAudience.map((item) => ({
              label: item._id || "Not added",
              count: item.count,
            })),
            registrationGrowth: registrationGrowth.map((item) => ({
              label: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
              count: item.count,
            })),
          },
          recent: {
            alumni: recentAlumni,
            events: recentEvents,
            jobs: recentJobs,
            announcements: recentAnnouncements,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getUsersForAdmin = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query).select("-password").sort({ _id: -1 });

    return res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getPendingAlumni = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const pendingUsers = await User.find({
      role: "alumni",
      isApproved: false,
      approvalStatus: { $ne: "rejected" },
    })
      .select("-password")
      .sort({ _id: -1 });

    const userIds = pendingUsers.map((user) => user._id);
    const profiles = await Alumni.find({ user: { $in: userIds } });
    const profileByUser = profiles.reduce((map, profile) => {
      map[profile.user.toString()] = profile;
      return map;
    }, {});

    const alumni = pendingUsers.map((user) => ({
      ...user.toObject(),
      profile: profileByUser[user._id.toString()] || null,
    }));

    return res.status(200).json({
      status: "success",
      results: alumni.length,
      data: { alumni },
    });
  } catch (error) {
    console.error("Error fetching pending alumni:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const updateUserApproval = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { isApproved, approvalStatus } = req.body;
    const nextStatus = approvalStatus || (isApproved ? "approved" : "rejected");

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        isApproved: nextStatus === "approved",
        approvalStatus: nextStatus,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    if (user.role === "alumni") {
      await Alumni.findOneAndUpdate(
        { user: user._id },
        {
          verified: nextStatus === "approved",
          verificationStatus: nextStatus === "approved" ? "verified" : nextStatus,
          verificationNote: req.body.verificationNote || "",
          verifiedAt: nextStatus === "approved" ? new Date() : null,
          verifiedBy: req.user._id,
        }
      );
    }
    await notify({
      recipient: user._id,
      type: "account",
      title: `Account ${nextStatus}`,
      message:
        nextStatus === "approved"
          ? "Your alumni account has been verified and approved."
          : "Your alumni verification was not approved. Contact the administrator for details.",
      link: "/profile",
      metadata: { approvalStatus: nextStatus },
    });

    enqueue("account-status-email", async () => {
      if (nextStatus === "approved") {
        await sendApprovalEmail(user.email, user.name);
      } else if (nextStatus === "rejected") {
        await sendRejectionEmail(user.email, user.name);
      }
    });

    return res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    console.error("Error updating user approval:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const csvCell = (value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;

const exportEngagementReport = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [
    users,
    alumni,
    mentorships,
    completedMentorships,
    referrals,
    successfulReferrals,
    eventRegistrations,
    attendedEvents,
    messages,
  ] = await Promise.all([
    User.countDocuments(),
    Alumni.countDocuments(),
    Mentorship.countDocuments(),
    Mentorship.countDocuments({ status: "completed" }),
    Referral.countDocuments(),
    Referral.countDocuments({ status: { $in: ["successful", "selected"] } }),
    EventRegistration.countDocuments(),
    EventRegistration.countDocuments({ status: "attended" }),
    Message.countDocuments(),
  ]);
  const rows = [
    ["Metric", "Value"],
    ["Generated at", new Date().toISOString()],
    ["Registered users", users],
    ["Alumni profiles", alumni],
    ["Mentorship requests", mentorships],
    ["Completed mentorships", completedMentorships],
    ["Referral requests", referrals],
    ["Successful referrals", successfulReferrals],
    ["Event registrations", eventRegistrations],
    ["Event attendance", attendedEvents],
    ["Direct messages", messages],
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="cmreunite-engagement-${Date.now()}.csv"`);
  return res.status(200).send(csv);
};

module.exports = {
  exportEngagementReport,
  getAdminOverview,
  getPendingAlumni,
  getUsersForAdmin,
  updateUserApproval,
};
