const access = require("../services/departmentAccess");
const { analytics } = require("../services/platformAnalytics");
const User = require("../models/user");
const { randomUUID } = require("node:crypto");
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
const { REJECTION_REASONS, rejectionLabel, rejectionMessage } = require("../utils/rejectionReasons");

const requireAdmin = (req, res) => {
  if (!access.managementRole(req.user)) {
    res.status(403).json({ status: "fail", message: "Admin access required" });
    return false;
  }
  return true;
};

const getAdminOverview = async (req, res) => {
  try {
    const data = await analytics(req.user);
    const total = (key) => data.departments.reduce((sum, row) => sum + (row[key] || 0), 0);
    const scope = access.managementFilter(req.user);
    const ids = await Alumni.distinct("user", scope);
    const validIds = await User.distinct("_id", { _id: { $in: ids }, role: "alumni" });
    const profileFilter = { ...scope, user: { $in: validIds } };
    const eventIds = await Event.distinct("_id", scope);
    const jobFilter = access.isSuper(req.user) ? {} : { author: { $in: validIds } };
    const requestFilter = access.isSuper(req.user) ? {} : { requester: { $in: validIds } };
    const registrationFilter = { event: { $in: eventIds } };
    const pairFilter = access.isSuper(req.user) ? {} : { requester: { $in: validIds }, recipient: { $in: validIds } };
    const group = async (Model, filter, field) => (await Model.aggregate([{ $match: filter }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { _id: 1 } }])).map((item) => ({ label: item._id || "Not added", count: item.count }));
    const [jobs, announcements, recognitions, alumniByBatch, jobsByStatus, eventsByType, announcementsByAudience, recentAlumni, recentEvents, recentJobs, recentAnnouncements, acceptedConnections, mentorships, completedMentorships, referrals, successfulReferrals, eventRegistrations, attendedEvents, messages] = await Promise.all([
      Job.countDocuments(jobFilter), Announcement.countDocuments(scope), Recognition.countDocuments(scope),
      group(Alumni, profileFilter, "endYear"), group(Job, jobFilter, "status"), group(Event, scope, "type"), group(Announcement, scope, "scope"),
      Alumni.find(profileFilter).select("firstName lastName email branch endYear company designation createdAt").sort({ createdAt: -1 }).limit(5),
      Event.find(scope).select("title date type attendees createdAt").sort({ createdAt: -1 }).limit(5),
      Job.find(jobFilter).select("title company status vacancy createdAt").sort({ createdAt: -1 }).limit(5),
      Announcement.find(scope).select("title scope createdAt").sort({ createdAt: -1 }).limit(5),
      Connection.countDocuments({ ...pairFilter, status: "accepted" }), Mentorship.countDocuments(requestFilter), Mentorship.countDocuments({ ...requestFilter, status: "completed" }),
      Referral.countDocuments(requestFilter), Referral.countDocuments({ ...requestFilter, status: { $in: ["successful", "selected"] } }),
      EventRegistration.countDocuments({ ...registrationFilter, status: { $in: ["registered", "attended"] } }), EventRegistration.countDocuments({ ...registrationFilter, status: "attended" }),
      Message.countDocuments(access.isSuper(req.user) ? {} : { sender: { $in: validIds }, recipient: { $in: validIds } }),
    ]);
    res.json({ status: "success", data: { overview: {
      users: data.totals.alumni + data.totals.admins, alumni: data.totals.alumni, admins: data.totals.admins, events: data.totals.events, jobs, announcements, recognitions,
      pendingAlumni: total("pending"), approvedAlumniUsers: total("approved"), rejectedAlumniUsers: total("rejected"),
      engagement: { acceptedConnections, mentorships, completedMentorships, mentorshipCompletionRate: mentorships ? Math.round(completedMentorships / mentorships * 100) : 0, referrals, successfulReferrals, referralSuccessRate: referrals ? Math.round(successfulReferrals / referrals * 100) : 0, eventRegistrations, attendedEvents, attendanceRate: eventRegistrations ? Math.round(attendedEvents / eventRegistrations * 100) : 0, messages },
      breakdowns: { alumniByBranch: data.departments.map((row) => ({ label: row.code, count: row.alumni })), alumniByBatch, jobsByStatus, eventsByType, announcementsByAudience, registrationGrowth: [] },
      recent: { alumni: recentAlumni, events: recentEvents, jobs: recentJobs, announcements: recentAnnouncements }, departmentAnalytics: data,
    } } });
  } catch (error) { throw error; }
};

const getManagedAlumni = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
  const filter = access.managementFilter(req.user);
  const [alumni, total] = await Promise.all([Alumni.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Alumni.countDocuments(filter)]);
  res.json({ status: "success", data: { alumni, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

const getUsersForAdmin = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { role } = req.query;
    const query = { role: "alumni", ...access.managementFilter(req.user) };
    if (role && role !== "alumni") return res.status(403).json({ status: "fail", message: "Only alumni management is available here" });
    const users = await User.find(query).select("-password").sort({ _id: -1 });

    return res.status(200).json({
      status: "success",
      results: users.length,
      data: { users },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("adminController.failed", error);
    throw error;
  }
};

const getPendingAlumni = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const pendingUsers = await User.find({
      ...access.managementFilter(req.user),
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
    require("../utils/operationalLog").failure("adminController.failed", error);
    throw error;
  }
};

const updateUserApproval = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { isApproved, approvalStatus } = req.body;
    if (approvalStatus !== undefined && !["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ status: "fail", message: "Invalid approval status" });
    }
    if (approvalStatus === undefined && typeof isApproved !== "boolean") {
      return res.status(400).json({ status: "fail", message: "An approval decision is required" });
    }
    const nextStatus = approvalStatus || (isApproved ? "approved" : "rejected");
    if (!["approved", "rejected"].includes(nextStatus) ||
        (isApproved !== undefined && (typeof isApproved !== "boolean" || isApproved !== (nextStatus === "approved")))) {
      return res.status(400).json({ status: "fail", message: "Invalid or conflicting approval decision" });
    }
    const rejecting = nextStatus === "rejected";
    const reason = rejecting ? req.body.rejectionReason : "";
    const rawComments = rejecting ? req.body.rejectionComments : "";
    if (rejecting && !rejectionLabel(reason)) {
      return res.status(400).json({ status: "fail", message: "Select a valid rejection reason" });
    }
    if (rawComments !== undefined && typeof rawComments !== "string") {
      return res.status(400).json({ status: "fail", message: "Comments must be text" });
    }
    const comments = (rawComments || "").trim();
    if (comments.length > 2000 || (reason === "other" && !comments)) {
      return res.status(400).json({ status: "fail", message: "Comments are required for Other and must not exceed 2000 characters" });
    }
    if (!rejecting && req.body.verificationNote !== undefined &&
        (typeof req.body.verificationNote !== "string" || req.body.verificationNote.length > 2000)) {
      return res.status(400).json({ status: "fail", message: "Verification note must be text up to 2000 characters" });
    }
    const note = rejecting ? rejectionMessage(reason, comments) : (req.body.verificationNote || "").trim();
    if (!/^[a-f\d]{24}$/i.test(req.params.userId)) {
      return res.status(400).json({ status: "fail", message: "Invalid alumni user ID" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: "alumni", ...access.managementFilter(req.user) },
      {
        isApproved: nextStatus === "approved",
        approvalStatus: nextStatus,
        rejectionReason: reason,
        rejectionComments: comments,
        approvalReviewedBy: req.user._id,
        approvalReviewedAt: new Date(),
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
          verificationNote: note,
          verifiedAt: nextStatus === "approved" ? new Date() : null,
          verifiedBy: req.user._id,
        }
      );
    }
    require("../services/discoveryPolicy").invalidateDiscovery();
    await access.audit(req.user, `alumni.${nextStatus}`, user._id, user.department);
    await notify({
      recipient: user._id,
      type: "account",
      title: `Account ${nextStatus}`,
      message:
        nextStatus === "approved"
          ? "Your alumni account has been verified and approved."
          : `Your alumni verification was not approved. Reason: ${note}`,
      link: "/profile",
      // Each review needs its own key for the existing unique notification index.
      metadata: { approvalStatus: nextStatus, reminderKey: `account-review:${randomUUID()}` },
    });

    enqueue("account-status-email", async () => {
      if (nextStatus === "approved") {
        await sendApprovalEmail(user.email, user.name);
      } else if (nextStatus === "rejected") {
        await sendRejectionEmail(user.email, user.name, rejectionLabel(reason), comments);
      }
    });

    return res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("adminController.failed", error);
    throw error;
  }
};

const csvCell = (value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;

const exportEngagementReport = async (req, res) => {
  const data = await analytics(req.user);
  const rows = [["Department", "Alumni", "Approved", "Pending", "Rejected", "Events"], ...data.departments.map((row) => [row.code, row.alumni, row.approved, row.pending, row.rejected, row.events])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  await access.audit(req.user, "report.exported", "department-report", req.user.department);
  res.set("Content-Type", "text/csv").set("Content-Disposition", "attachment; filename=department-report.csv").send(csv);
};

const getRejectionReasons = (req, res) => res.json({ status: "success", data: { reasons: REJECTION_REASONS } });

module.exports = {
  getManagedAlumni,
  getRejectionReasons,
  exportEngagementReport,
  getAdminOverview,
  getPendingAlumni,
  getUsersForAdmin,
  updateUserApproval,
};
