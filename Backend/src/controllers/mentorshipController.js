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

    const approvedUsers = await User.find({
      role: "alumni",
      isApproved: true,
      "privacy.mentorshipAvailable": { $ne: false },
      blockedUsers: { $ne: req.user._id },
      _id: { $ne: req.user._id, $nin: req.user.blockedUsers || [] },
    }).select("_id");
    const mentors = await Alumni.find({
      user: { $in: approvedUsers.map((user) => user._id) },
      verified: true,
    })
      .sort({ firstName: 1, lastName: 1 })
      .limit(100);

    return res.status(200).json({
      status: "success",
      results: mentors.length,
      data: { mentors: mentors.map(formatMentor) },
    });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getMentorshipRequests = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const requests = await Mentorship.find().sort({ createdAt: -1 });

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
    console.error("Error fetching mentorship requests:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
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

    const mentorProfile = await Alumni.findById(mentorId);
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
    console.error("Error creating mentorship request:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const addMentorshipMilestone = async (req, res) => {
  try {
    const request = await Mentorship.findById(req.params.requestId);
    if (!request) return res.status(404).json({ status: "fail", message: "Mentorship request not found" });
    const isParticipant = [request.requester, request.mentor]
      .filter(Boolean).some((id) => id.toString() === req.user._id.toString());
    if (!isParticipant && req.user.role !== "admin") {
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
    return res.status(200).json({ status: "success", data: { request } });
  } catch (error) {
    console.error("Mentorship progress update failed:", error);
    return res.status(500).json({ status: "fail", message: "Unable to update mentorship progress" });
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

    const isAdmin = req.user.role === "admin";
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
    console.error("Error updating mentorship status:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createMentorshipRequest,
  getMentors,
  getMentorshipRequests,
  updateMentorshipStatus,
  addMentorshipMilestone,
};
