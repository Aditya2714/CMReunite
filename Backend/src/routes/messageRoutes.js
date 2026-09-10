const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getMessages,
  listConversations,
  sendMessage,
} = require("../controllers/messageController");

const router = express.Router();
router.use(checkAuth);
router.get("/", listConversations);
router.post("/", sendMessage);
router.get("/:conversationId", getMessages);

module.exports = router;
