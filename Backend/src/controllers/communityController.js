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
    return res.status(200).json({ status: "success", data: { stories } });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const createStory = async (req, res) => {
  try {
    const { title, tag, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ status: "fail", message: "Title and content are required" });
    }

    const story = await Story.create({
      author: req.user._id,
      authorName: await getAuthorName(req.user),
      title,
      tag,
      content,
    });

    return res.status(201).json({ status: "success", data: { story } });
  } catch (error) {
    console.error("Error creating story:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
  }
};

const getForumTopics = async (req, res) => {
  try {
    const topics = await ForumTopic.find().sort({ updatedAt: -1 });
    return res.status(200).json({ status: "success", data: { topics } });
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
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
    console.error("Error creating forum topic:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
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
    console.error("Error adding forum reply:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { resources } });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
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
    console.error("Error creating resource:", error);
    return res.status(500).json({ status: "fail", message: error.message || "Internal Server Error" });
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
