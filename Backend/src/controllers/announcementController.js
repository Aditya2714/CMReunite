const Announcement = require("../models/announcementModel");
const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const { sendAnnouncementEmail } = require("../utils/emailHelper");

const createAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const { title, message, branch, batch } = req.body;
    const attachmentUrl = req.file ? `/uploads/announcements/${req.file.filename}` : null;
    const attachmentType = req.file
      ? (req.file.mimetype.startsWith("image/") ? "image" : "pdf")
      : null;

    if (!title || !message) {
      return res.status(400).json({
        status: "fail",
        message: "Title and message are required",
      });
    }

    const announcement = await Announcement.create({
      title,
      branch,
      batch,
      message,
      attachmentUrl,
      attachmentType,
      createdBy: req.user._id,
    });

    try {
      let alumniUsers = await User.find({ role: "alumni", isApproved: true }).select("name email");

      const hasBranchFilter = branch && branch !== "All branches";
      const hasBatchFilter = batch && batch !== "All batches";

      if (hasBranchFilter || hasBatchFilter) {
        const alumniQuery = {};
        if (hasBranchFilter) alumniQuery.branch = branch;
        if (hasBatchFilter) alumniQuery.endYear = parseInt(batch);

        const alumniProfiles = await Alumni.find(alumniQuery).select("user");
        const userIds = alumniProfiles.map((p) => p.user.toString());
        alumniUsers = alumniUsers.filter((u) => userIds.includes(u._id.toString()));
      }

      for (const user of alumniUsers) {
        sendAnnouncementEmail(user.email, user.name, announcement, attachmentUrl, attachmentType).catch(
          (err) => console.error(`Failed to send email to ${user.email}:`, err)
        );
      }

      console.log(`Announcement email triggered to ${alumniUsers.length} alumni`);
    } catch (emailError) {
      console.error("Email trigger error:", emailError);
    }

    return res.status(201).json({
      status: "success",
      data: { announcement },
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      results: announcements.length,
      data: { announcements },
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const allowedFields = ["title", "audience", "message"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ status: "fail", message: "Announcement not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { announcement },
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ status: "fail", message: "Announcement not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
};
