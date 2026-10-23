const Alumni = require("../models/alumniModel");
const ForumTopic = require("../models/forumTopicModel");
const Resource = require("../models/resourceModel");
const Story = require("../models/storyModel");

const getAuthorName = async (user) => {
  if (user.role !== "alumni") return user.name || user.email;

  const profile = await Alumni.findOne({ user: user._id });
  return (
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.email
  );
};

const getStories = async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { stories: stories.map((story) => ({ ...story.toObject(), tag: story.category })) } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

const createStory = require("./postController").handle(async (req, res) => {
  const { post } = await require("../services/postService").createPostDocument(req.user, {
    postType: "story", title: req.body.title, content: req.body.content,
    ...(req.body.tag !== undefined ? { category: req.body.tag } : {}),
  });
  const story = { _id: post._id, author: post.author, authorName: post.authorName, title: post.title, content: post.content, tag: post.category, createdAt: post.createdAt, updatedAt: post.updatedAt };
  res.status(201).json({ status: "success", data: { story } });
});

const getForumTopics = async (req, res) => {
  try {
    const topics = await ForumTopic.find().sort({ updatedAt: -1 });
    return res.status(200).json({ status: "success", data: { topics } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

const createForumTopic = async (req, res) => {
  try {
    const { title, category, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ status: "fail", message: "Title and message are required" });
    }

    const topic = await ForumTopic.create({
      author: req.user._id,
      authorName: await getAuthorName(req.user),
      title,
      category,
      message,
    });

    return res.status(201).json({ status: "success", data: { topic } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

const addForumReply = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ status: "fail", message: "Reply message is required" });
    }

    const topic = await ForumTopic.findById(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ status: "fail", message: "Topic not found" });
    }

    topic.replies.push({
      author: req.user._id,
      authorName: await getAuthorName(req.user),
      message,
    });
    await topic.save();

    return res.status(200).json({ status: "success", data: { topic } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

const getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { resources } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

const createResource = async (req, res) => {
  try {
    const { title, type, description, link } = req.body;
    if (!title) {
      return res.status(400).json({ status: "fail", message: "Resource title is required" });
    }

    const resource = await Resource.create({
      author: req.user._id,
      authorName: await getAuthorName(req.user),
      title,
      type,
      description,
      link,
    });

    return res.status(201).json({ status: "success", data: { resource } });
  } catch (error) {
    require("../utils/operationalLog").failure("communityController.failed", error);
    throw error;
  }
};

module.exports = {
  addForumReply,
  createForumTopic,
  createResource,
  createStory,
  getForumTopics,
  getResources,
  getStories,
};
