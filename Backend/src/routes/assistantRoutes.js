const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const { performAssistantAction, queryAssistant } = require("../controllers/assistantController");

const router = express.Router();
router.use(checkAuth);
router.post("/query", asyncHandler(queryAssistant));
router.post("/action", asyncHandler(performAssistantAction));

module.exports = router;
