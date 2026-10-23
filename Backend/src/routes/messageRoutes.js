const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getMessages,
  listConversations,
  sendMessage,
} = require("../controllers/messageController");

const router = express.Router();
router.use(checkAuth);
router.get("/", asyncHandler(listConversations));
router.post("/", asyncHandler(sendMessage));
router.get("/:conversationId", asyncHandler(getMessages));

module.exports = router;
