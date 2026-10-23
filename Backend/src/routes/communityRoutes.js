const asyncHandler = require("../middlewares/asyncHandler");
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
router.get("/stories", asyncHandler(getStories));
router.post("/stories", asyncHandler(createStory));
router.get("/forum", asyncHandler(getForumTopics));
router.post("/forum", asyncHandler(createForumTopic));
router.post("/forum/:topicId/replies", asyncHandler(addForumReply));
router.get("/resources", asyncHandler(getResources));
router.post("/resources", asyncHandler(createResource));

module.exports = router;
