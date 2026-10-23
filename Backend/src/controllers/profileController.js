const Alumni = require("../models/alumniModel");
const { Admin } = require("../models/adminModel");
const { serializeUser } = require("../utils/serializeUser");
const Connection = require("../models/connectionModel");
const Mentorship = require("../models/mentorshipModel");
const Referral = require("../models/referralModel");
const EventRegistration = require("../models/eventRegistrationModel");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");

const ADMIN_DESIGNATIONS = new Set([
  "",
  "Head of Department",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Placement Officer",
  "Department Coordinator",
  "Administrative Staff",
  "Other",
]);

const getProfileModel = (role) => {
  if (["admin", "super_admin"].includes(role)) return Admin;
  if (role === "alumni") return Alumni;
  return null;
};

const buildFileUpdates = (req) => {
  if (!req.file) return {};

  return {
    imageUrl: `${process.env.PUBLIC_API_URL || "http://127.0.0.1:4000"}/uploads/profiles/${req.file.filename}`,
    fileType: req.file.mimetype,
    originalFileName: req.file.originalname,
  };
};

const getMyProfile = async (req, res) => {
  try {
    const ProfileModel = getProfileModel(req.user.role);
    const profile = ProfileModel ? await ProfileModel.findOne({ user: req.user._id }) : null;
    if (["admin", "super_admin"].includes(req.user.role)) {
      await req.user.populate("department", "code name");
    }

    return res.status(200).json({
      status: "success",
      data: {
        profile: serializeUser(req.user, profile),
      },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("profileController.failed", error);
    throw error;
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const ProfileModel = getProfileModel(req.user.role);

    if (!ProfileModel) {
      return res.status(400).json({ status: "fail", message: "Profile role is not supported" });
    }

    if (["role", "department", "branch", "isActive", "mustChangePassword"].some((key) => req.body[key] !== undefined)) return res.status(403).json({ status: "fail", message: "Role and department changes require Super Admin" });
    if (["admin", "super_admin"].includes(req.user.role)) {
      const designation = String(req.body.officialDesignation || "").trim();
      const customDesignation = String(req.body.customDesignation || "").trim();
      if (!ADMIN_DESIGNATIONS.has(designation)) {
        return res.status(400).json({ status: "fail", message: "Select a valid official designation" });
      }
      if (designation === "Other" && !customDesignation) {
        return res.status(400).json({ status: "fail", message: "Enter the custom official designation" });
      }
      if (customDesignation.length > 100) {
        return res.status(400).json({ status: "fail", message: "Custom designation cannot exceed 100 characters" });
      }
    }
    const allowedUserFields = ["name", "email"];
    const userUpdates = {};
    allowedUserFields.forEach((field) => {
      if (req.body[field] !== undefined) userUpdates[field] = req.body[field];
    });

    if (Object.keys(userUpdates).length) {
      await req.user.constructor.findByIdAndUpdate(req.user._id, userUpdates, {
        runValidators: true,
      });
    }

    const allowedProfileFields =
      ["admin", "super_admin"].includes(req.user.role)
        ? [
            "adminName",
            "email",
            "mobileNumber",
            "officialDesignation",
            "customDesignation",
            "imageUrl",
            "fileType",
            "originalFileName",
          ]
        : [
            "email",
            "startYear",
            "endYear",
            "degree",
            "rollNumber",
            "firstName",
            "lastName",
            "mobileNumber",
            "imageUrl",
            "fileType",
            "originalFileName",
            "company",
            "designation",
            "location",
            "bio",
            "skills",
            "workExperiences",
            "education",
            "socialProfiles",
          ];

    const profileUpdates = {};
    allowedProfileFields.forEach((field) => {
      if (req.body[field] !== undefined) profileUpdates[field] = req.body[field];
    });

    if (req.body.phone !== undefined) profileUpdates.mobileNumber = req.body.phone;
    if (
      ["admin", "super_admin"].includes(req.user.role) &&
      req.body.officialDesignation !== undefined &&
      req.body.officialDesignation !== "Other"
    ) {
      profileUpdates.customDesignation = "";
    }
    Object.assign(profileUpdates, buildFileUpdates(req));

    let profile = await ProfileModel.findOne({ user: req.user._id });
    if (!profile) {
      profile = await ProfileModel.create({
        user: req.user._id,
        email: req.body.email || req.user.email,
        adminName: req.body.adminName || req.body.name || req.user.name || req.user.email,
        firstName: req.body.firstName || req.user.name || "Alumni",
        startYear: req.body.startYear || 2000,
        endYear: req.body.endYear || 2004,
        degree: req.body.degree || "Not added",
        branch: req.body.branch || "Not added",
        rollNumber: req.body.rollNumber || `ROLL-${req.user._id.toString().slice(-6)}`,
      });
    }

    profile = await ProfileModel.findOneAndUpdate(
      { user: req.user._id },
      profileUpdates,
      { new: true, runValidators: true }
    );
    const updatedUser = await req.user.constructor
      .findById(req.user._id)
      .populate("department", "code name");

    require("../services/discoveryPolicy").invalidateDiscovery();
    return res.status(200).json({
      status: "success",
      data: {
        profile: serializeUser(updatedUser, profile),
      },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("profileController.failed", error);
    throw error;
  }
};

const getPrivacySettings = async (req, res) => res.status(200).json({
  status: "success",
  data: {
    privacy: req.user.privacy,
    blockedUsers: await req.user.constructor
      .find({ _id: { $in: req.user.blockedUsers || [] } })
      .select("name email role"),
  },
});

const updatePrivacySettings = async (req, res) => {
  try {
    const allowed = ["profileVisibility", "showEmail", "showPhone", "allowMessages", "allowConnections", "mentorshipAvailable"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[`privacy.${field}`] = req.body[field];
    });
    const user = await req.user.constructor.findByIdAndUpdate(req.user._id, { $set: updates }, {
      new: true,
      runValidators: true,
    });
    require("../services/discoveryPolicy").invalidateDiscovery();
    return res.status(200).json({ status: "success", data: { privacy: user.privacy } });
  } catch (error) {
    throw error;
  }
};

const updateBlockedUser = async (req, res) => {
  const targetId = req.params.userId;
  if (targetId === req.user._id.toString()) {
    return res.status(400).json({ status: "fail", message: "You cannot block yourself" });
  }
  const target = await req.user.constructor.findById(targetId).select("_id");
  if (!target) return res.status(404).json({ status: "fail", message: "User not found" });
  const operation = req.method === "DELETE"
    ? { $pull: { blockedUsers: target._id } }
    : { $addToSet: { blockedUsers: target._id } };
  await req.user.constructor.findByIdAndUpdate(req.user._id, operation);
  require("../services/discoveryPolicy").invalidateDiscovery();
  return res.status(200).json({
    status: "success",
    message: req.method === "DELETE" ? "User unblocked" : "User blocked",
  });
};

const exportMyData = async (req, res) => {
  const ProfileModel = getProfileModel(req.user.role);
  const [profile, connections, mentorships, referrals, registrations, conversations] = await Promise.all([
    ProfileModel?.findOne({ user: req.user._id }).lean(),
    Connection.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] }).lean(),
    Mentorship.find({ $or: [{ requester: req.user._id }, { mentor: req.user._id }] }).lean(),
    Referral.find({ $or: [{ requester: req.user._id }, { assignedTo: req.user._id }] }).lean(),
    EventRegistration.find({ user: req.user._id }).lean(),
    Conversation.find({ participants: req.user._id }).select("_id participants lastMessageAt createdAt").lean(),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    account: serializeUser(req.user),
    profile,
    connections,
    mentorships,
    referrals,
    eventRegistrations: registrations,
    conversations,
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="cmrunite-my-data-${Date.now()}.json"`);
  return res.status(200).send(JSON.stringify(payload, null, 2));
};

const getMyActivitySummary = async (req, res) => {
  const userId = req.user._id;
  const [connections, events, referrals, mentorships, unreadMessages] = await Promise.all([
    Connection.countDocuments({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }),
    EventRegistration.countDocuments({ user: userId, status: { $in: ["registered", "attended"] } }),
    Referral.countDocuments({ requester: userId, status: { $nin: ["rejected", "withdrawn", "selected", "successful"] } }),
    Mentorship.countDocuments({ $or: [{ requester: userId }, { mentor: userId }], status: { $in: ["pending", "accepted", "scheduled"] } }),
    Message.countDocuments({ recipient: userId, readAt: null }),
  ]);
  return res.status(200).json({
    status: "success",
    data: { connections, events, referrals, mentorships, unreadMessages },
  });
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  exportMyData,
  getPrivacySettings,
  updateBlockedUser,
  updatePrivacySettings,
  getMyActivitySummary,
};
