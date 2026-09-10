const mongoose = require("mongoose");
const Alumni = require("../models/alumniModel");
const Connection = require("../models/connectionModel");
const User = require("../models/user");

const getDisplayName = (profile) =>
  [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
  profile?.email ||
  "Alumni";

const formatProfile = (profile, connection = null) => ({
  id: profile._id,
  userId: profile.user,
  name: getDisplayName(profile),
  email: profile.email,
  batch: profile.endYear || "Not added",
  branch: profile.branch || "Not added",
  role: profile.designation || "Alumni",
  company: profile.company || "Not added",
  location: profile.location || "Not added",
  imageUrl: profile.imageUrl || "",
  fileType: profile.fileType || "",
  connectionId: connection?._id || null,
  status: connection?.status || "suggested",
});

const getMyConnections = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can use connections" });
    }

    const myUserId = req.user._id;
    const connections = await Connection.find({
      $or: [{ requester: myUserId }, { recipient: myUserId }],
    }).sort({ updatedAt: -1 });

    const relatedUserIds = [
      ...new Set(
        connections
          .flatMap((connection) => [connection.requester, connection.recipient])
          .map((id) => id.toString())
          .filter((id) => id !== myUserId.toString())
      ),
    ];

    const relatedProfiles = await Alumni.find({ user: { $in: relatedUserIds } });
    const profileByUser = relatedProfiles.reduce((map, profile) => {
      map[profile.user.toString()] = profile;
      return map;
    }, {});

    const incoming = [];
    const outgoing = [];
    const accepted = [];

    connections.forEach((connection) => {
      const isRequester = connection.requester.toString() === myUserId.toString();
      const otherUserId = isRequester ? connection.recipient.toString() : connection.requester.toString();
      const profile = profileByUser[otherUserId];
      if (!profile) return;

      const formatted = formatProfile(profile, connection);
      if (connection.status === "accepted") accepted.push(formatted);
      else if (connection.status === "pending" && isRequester) outgoing.push(formatted);
      else if (connection.status === "pending") incoming.push(formatted);
    });

    const connectedUserIds = new Set([
      myUserId.toString(),
      ...connections.flatMap((connection) => [
        connection.requester.toString(),
        connection.recipient.toString(),
      ]),
    ]);

    const suggestions = await Alumni.find({
      user: { $nin: [...connectedUserIds].map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .sort({ createdAt: -1 })
      .limit(8);

    return res.status(200).json({
      status: "success",
      data: {
        incoming,
        outgoing,
        accepted,
        suggestions: suggestions.map((profile) => formatProfile(profile)),
      },
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const sendConnectionRequest = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can send connection requests" });
    }

    const recipientProfile = await Alumni.findById(req.params.alumniId);
    if (!recipientProfile) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    if (recipientProfile.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ status: "fail", message: "You cannot connect with your own profile" });
    }

    const recipientUser = await User.findById(recipientProfile.user).select("privacy blockedUsers");
    const eitherBlocked =
      req.user.blockedUsers?.some((id) => id.toString() === recipientProfile.user.toString()) ||
      recipientUser?.blockedUsers?.some((id) => id.toString() === req.user._id.toString());
    if (eitherBlocked || recipientUser?.privacy?.allowConnections === false) {
      return res.status(403).json({ status: "fail", message: "This user is not accepting connection requests" });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientProfile.user },
        { requester: recipientProfile.user, recipient: req.user._id },
      ],
    });

    if (existingConnection) {
      return res.status(400).json({
        status: "fail",
        message: "Connection request already exists",
      });
    }

    const connection = await Connection.create({
      requester: req.user._id,
      recipient: recipientProfile.user,
      message: req.body.message || "",
    });

    return res.status(201).json({
      status: "success",
      message: "Connection request sent",
      data: { connection, profile: formatProfile(recipientProfile, connection) },
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const updateConnectionRequest = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can update connection requests" });
    }

    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ status: "fail", message: "Status must be accepted or rejected" });
    }

    const connection = await Connection.findById(req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ status: "fail", message: "Connection request not found" });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: "fail", message: "Only recipient can accept or reject this request" });
    }

    connection.status = status;
    await connection.save();

    return res.status(200).json({
      status: "success",
      message: `Connection request ${status}`,
      data: { connection },
    });
  } catch (error) {
    console.error("Error updating connection request:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  getMyConnections,
  sendConnectionRequest,
  updateConnectionRequest,
};
