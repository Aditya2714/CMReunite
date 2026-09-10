const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const { performAssistantAction, queryAssistant } = require("../controllers/assistantController");

const router = express.Router();
router.use(checkAuth);
router.post("/query", queryAssistant);
router.post("/action", performAssistantAction);

module.exports = router;
