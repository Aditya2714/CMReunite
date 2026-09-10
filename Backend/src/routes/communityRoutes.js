const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  addForumReply,
  createForumTopic,
  createResource,
  createStory,
  getForumTopics,
  getResources,
  getStories,
} = require("../controllers/communityController");

const router = express.Router();

router.use(checkAuth);
router.get("/stories", getStories);
router.post("/stories", createStory);
router.get("/forum", getForumTopics);
router.post("/forum", createForumTopic);
router.post("/forum/:topicId/replies", addForumReply);
router.get("/resources", getResources);
router.post("/resources", createResource);

module.exports = router;
