const mongoose = require("mongoose");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const User = require("../models/user");
const Connection = require("../models/connectionModel");
const { notify } = require("../services/notificationService");
const { emitToUser } = require("../services/realtimeService");

const pageOptions = (req, max = 50) => {
  const parse = (value, fallback, upper) => { if (value === undefined) return fallback; if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > upper) throw Object.assign(new Error("Invalid pagination"), { status: 400 }); return Number(value); };
  const page = parse(req.query.page, 1, 100000);
  const limit = parse(req.query.limit, 20, max);
  return { page, limit, skip: (page - 1) * limit };
};

const listConversations = async (req, res) => {
  const { page, limit, skip } = pageOptions(req);
  const filter = { participants: req.user._id };
  const [conversations, total, unreadCount] = await Promise.all([
    Conversation.find(filter)
      .populate("participants", "name email role")
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments(filter),
    Message.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);
  return res.json({
    status: "success",
    data: { conversations, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};

const getMessages = async (req, res) => {
  const { page, limit, skip } = pageOptions(req, 100);
  const conversation = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: req.user._id,
  });
  if (!conversation) {
    return res.status(404).json({ status: "fail", message: "Conversation not found" });
  }
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversation: conversation._id }),
    Message.updateMany(
      { conversation: conversation._id, recipient: req.user._id, readAt: null },
      { readAt: new Date() }
    ),
  ]);
  return res.json({
    status: "success",
    data: {
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

const sendMessage = async (req, res) => {
  const recipientId = req.body.recipientId;
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (typeof recipientId !== "string" || !/^[a-f0-9]{24}$/i.test(recipientId) || !body || body.length > 2000) {
    return res.status(400).json({ status: "fail", message: "Valid recipientId and a message of 1–2,000 characters are required" });
  }
  if (String(recipientId) === String(req.user._id)) {
    return res.status(400).json({ status: "fail", message: "You cannot message yourself" });
  }
  const recipient = await User.findOne({ _id: recipientId, role: "alumni", isActive: { $ne: false }, isApproved: true, approvalStatus: { $nin: ["pending", "rejected"] } }).select("_id privacy blockedUsers");
  if (!recipient) return res.status(404).json({ status: "fail", message: "Recipient not found" });
  const eitherBlocked =
    req.user.blockedUsers?.some((id) => id.toString() === recipientId) ||
    recipient.blockedUsers?.some((id) => id.toString() === req.user._id.toString());
  if (eitherBlocked || recipient.privacy?.allowMessages === "none") {
    return res.status(403).json({ status: "fail", message: "Messaging is not permitted by this user's privacy settings" });
  }
  if (recipient.privacy?.allowMessages === "connections") {
    const connected = await Connection.exists({
      status: "accepted",
      $or: [
        { requester: req.user._id, recipient: recipient._id },
        { requester: recipient._id, recipient: req.user._id },
      ],
    });
    if (!connected) {
      return res.status(403).json({ status: "fail", message: "Only connections can message this user" });
    }
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipient._id], $size: 2 },
  });
  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.user._id, recipient._id] });
  }
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    recipient: recipient._id,
    body,
  });
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();
  const payload = { message, conversationId: conversation._id };
  try { emitToUser(recipient._id, "message:new", payload); } catch (error) { require("../utils/operationalLog").failure("message.realtime_failed", error, { recordId: message._id }); }
  await notify({
    recipient: recipient._id,
    type: "message",
    title: "New direct message",
    message: body.slice(0, 120),
    link: `/messages?conversation=${conversation._id}`,
    metadata: { conversationId: conversation._id, sender: req.user._id },
  });
  return res.status(201).json({ status: "success", data: payload });
};

module.exports = { getMessages, listConversations, sendMessage };
