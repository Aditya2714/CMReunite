const access = require("../services/departmentAccess");
const Alumni = require("../models/alumniModel");
const Mentorship = require("../models/mentorshipModel");
const User = require("../models/user");
const { notify } = require("../services/notificationService");

const getRequesterName = async (user) => {
  if (user.role !== "alumni") return user.name || user.email;

  const profile = await Alumni.findOne({ user: user._id });
  return (
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email
  );
};

const formatMentor = (profile) => ({
  id: profile._id,
  userId: profile.user,
  name:
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.email,
  email: profile.email,
  batch: profile.endYear || "Not added",
  branch: profile.branch || "Not added",
  company: profile.company || "Not added",
  designation: profile.designation || "Alumni",
});

const getMentors = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can view mentors" });
    }

    const mentors = (await require("../services/discoveryPolicy").visibleProfiles(req.user, { purpose: "mentor" }, { verified: true })).sort((a, b) => a.firstName.localeCompare(b.firstName)).slice(0, 100);

    return res.status(200).json({
      status: "success",
      results: mentors.length,
      data: { mentors: mentors.map(formatMentor) },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("mentorshipController.failed", error);
    throw error;
  }
};

const getMentorshipRequests = async (req, res) => {
  try {
    if (access.managementRole(req.user)) {
      await access.requireManagement(req.user);
      const ids = await access.departmentUserIds(req.user);
      const requests = await Mentorship.find(ids ? { requester: { $in: ids } } : {}).sort({ createdAt: -1 });

      return res.status(200).json({
        status: "success",
        results: requests.length,
        data: { requests },
      });
    }

    const [sent, received] = await Promise.all([
      Mentorship.find({ requester: req.user._id }).sort({ createdAt: -1 }),
      Mentorship.find({ mentor: req.user._id }).sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      status: "success",
      results: sent.length + received.length,
      data: { requests: sent, sent, received },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("mentorshipController.failed", error);
    throw error;
  }
};

const createMentorshipRequest = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can create mentorship requests" });
    }

    const { topic, mode, message, mentorId, goal = "", expectedOutcome = "" } = req.body;
    if (!topic || !message || !mentorId) {
      return res.status(400).json({ status: "fail", message: "Topic, mentor, and message are required" });
    }

    if (!/^[a-f0-9]{24}$/i.test(String(mentorId))) return res.status(400).json({ status: "fail", message: "Invalid mentor ID" });
    const mentorProfile = await require("../services/discoveryPolicy").requireVisibleProfile(req.user, mentorId, "mentor");
    if (!mentorProfile) {
      return res.status(404).json({ status: "fail", message: "Selected mentor not found" });
    }

    if (mentorProfile.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ status: "fail", message: "You cannot send a mentorship request to yourself" });
    }

    const duplicate = await Mentorship.exists({
      requester: req.user._id,
      mentor: mentorProfile.user,
      topic,
      status: { $in: ["pending", "accepted", "scheduled"] },
    });
    if (duplicate) {
      return res.status(409).json({
        status: "fail",
        message: "An active mentorship request for this topic already exists",
      });
    }

    const requesterName = await getRequesterName(req.user);
    const mentorName =
      [mentorProfile.firstName, mentorProfile.lastName].filter(Boolean).join(" ") ||
      mentorProfile.email;
    const request = await Mentorship.create({
      requester: req.user._id,
      requesterName,
      requesterEmail: req.user.email,
      mentor: mentorProfile.user,
      mentorName,
      mentorEmail: mentorProfile.email,
      topic,
      mode: mode || "Flexible",
      message,
      goal,
      expectedOutcome,
    });
    await notify({
      recipient: mentorProfile.user,
      type: "mentorship",
      title: "New mentorship request",
      message: `${requesterName} requested guidance on ${topic}.`,
      link: "/mentorship",
      metadata: { requestId: request._id },
    });

    return res.status(201).json({
      status: "success",
      message: "Mentorship request submitted",
      data: { request },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("mentorshipController.failed", error);
    throw error;
  }
};

const addMentorshipMilestone = async (req, res) => {
  try {
    const request = await Mentorship.findById(req.params.requestId);
    if (!request) return res.status(404).json({ status: "fail", message: "Mentorship request not found" });
    const isParticipant = [request.requester, request.mentor]
      .filter(Boolean).some((id) => id.toString() === req.user._id.toString());
    if (access.managementRole(req.user)) { await access.requireManagement(req.user); if (!access.isSuper(req.user) && !(await Alumni.exists({ user: request.requester, department: req.user.department }))) access.fail(404, "Mentorship not found in your department"); }
    if (!isParticipant && !access.managementRole(req.user)) {
      return res.status(403).json({ status: "fail", message: "Only mentorship participants can update progress" });
    }
    const { title, note, milestoneId, completed } = req.body;
    if (title?.trim()) {
      request.milestones.push({ title: title.trim(), createdBy: req.user._id });
    }
    if (milestoneId) {
      const milestone = request.milestones.id(milestoneId);
      if (!milestone) return res.status(404).json({ status: "fail", message: "Milestone not found" });
      milestone.completed = completed !== false;
      milestone.completedAt = milestone.completed ? new Date() : undefined;
    }
    if (note?.trim()) {
      request.progressNotes.push({
        body: note.trim(),
        author: req.user._id,
        authorName: await getRequesterName(req.user),
      });
    }
    if (!title?.trim() && !milestoneId && !note?.trim()) {
      return res.status(400).json({ status: "fail", message: "Add a milestone, note, or progress update" });
    }
    await request.save();
    if (access.managementRole(req.user)) await access.audit(req.user, "mentorship.updated", request._id, req.user.department);
    return res.status(200).json({ status: "success", data: { request } });
  } catch (error) {
    require("../utils/operationalLog").failure("mentorshipController.failed", error);
    throw error;
  }
};

const updateMentorshipStatus = async (req, res) => {
  try {
    const {
      status,
      adminNote,
      scheduledAt,
      meetingLink,
      sessionNotes,
      rating,
      feedback,
    } = req.body;
    const statuses = ["pending", "accepted", "scheduled", "completed", "rejected", "cancelled"];
    if (status && !statuses.includes(status)) {
      return res.status(400).json({ status: "fail", message: "Invalid mentorship status" });
    }

    const request = await Mentorship.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ status: "fail", message: "Mentorship request not found" });
    }

    const isAdmin = access.managementRole(req.user);
    if (isAdmin) { await access.requireManagement(req.user); if (!access.isSuper(req.user) && !(await Alumni.exists({ user: request.requester, department: req.user.department }))) access.fail(404, "Mentorship not found in your department"); }
    const isAssignedMentor = request.mentor?.toString() === req.user._id.toString();
    const isRequester = request.requester.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignedMentor && !isRequester) {
      return res.status(403).json({ status: "fail", message: "You cannot update this request" });
    }

    if (status === "cancelled" && !isRequester && !isAdmin) {
      return res.status(403).json({ status: "fail", message: "Only the requester can cancel" });
    }
    if (["accepted", "scheduled", "rejected", "completed"].includes(status) && !isAssignedMentor && !isAdmin) {
      return res.status(403).json({ status: "fail", message: "Only the mentor or admin can set this status" });
    }
    if ((rating !== undefined || feedback !== undefined) && (!isRequester || request.status !== "completed")) {
      return res.status(403).json({ status: "fail", message: "Feedback is available to the requester after completion" });
    }

    if (status) request.status = status;
    if (adminNote !== undefined && isAdmin) request.adminNote = adminNote;
    if (scheduledAt !== undefined && (isAssignedMentor || isAdmin)) {
      request.scheduledAt = scheduledAt;
      request.status = "scheduled";
    }
    if (meetingLink !== undefined && (isAssignedMentor || isAdmin)) request.meetingLink = meetingLink;
    if (sessionNotes !== undefined && (isAssignedMentor || isAdmin)) request.sessionNotes = sessionNotes;
    if (rating !== undefined) request.rating = rating;
    if (feedback !== undefined) request.feedback = feedback;
    if (request.status === "completed" && !request.completedAt) request.completedAt = new Date();
    await request.save();
    if (access.managementRole(req.user)) await access.audit(req.user, "mentorship.updated", request._id, req.user.department);

    const recipient = isRequester ? request.mentor : request.requester;
    await notify({
      recipient,
      type: "mentorship",
      title: "Mentorship request updated",
      message: `${request.topic} is now ${request.status}.`,
      link: "/mentorship",
      metadata: { requestId: request._id, status: request.status },
    });

    return res.status(200).json({
      status: "success",
      data: { request },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("mentorshipController.failed", error);
    throw error;
  }
};

module.exports = {
  createMentorshipRequest,
  getMentors,
  getMentorshipRequests,
  updateMentorshipStatus,
  addMentorshipMilestone,
};
