const { z } = require("zod");
const Post = require("../models/postModel");
const { Job } = require("../models/job");
const Story = require("../models/storyModel");
const { initialPlacementNotification, wakePlacementNotifications } = require("./placementNotificationService");
const common = { title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(10000) };
const storySchema = z.object({ ...common, postType: z.literal("story"), category: z.string().trim().min(1).max(100).default("Career Journey") }).strict();
const jobSchema = z.object({ ...common, postType: z.literal("job"), company: z.string().trim().min(1).max(200).default("Not specified"), location: z.string().trim().max(200).default("Not specified"), employmentType: z.string().trim().min(1).max(100).default("Full-time"), status: z.string().trim().min(1).max(100).default("Open"), vacancy: z.number().int().min(1).max(10000).default(1) }).strict();
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const schemaFor = (type) => type === "story" ? storySchema : type === "job" ? jobSchema : fail(400, "Select Story or Job Opportunity");
const parse = (schema, body) => { const result = schema.safeParse(body); if (!result.success) fail(400, result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")); return result.data; };
const publicPost = (post, viewer) => {
  const value = typeof post.toObject === "function" ? post.toObject() : post;
  const authorId = value.author?._id || value.author;
  return {
    _id: value._id, postType: value.postType, author: authorId,
    authorName: value.authorName || value.author?.name || "Alumni",
    title: value.title, content: value.content, createdAt: value.createdAt, updatedAt: value.updatedAt,
    canManage: String(authorId) === String(viewer._id),
    ...(value.postType === "story" ? { category: value.category || "Career Journey" } : {
      company: value.company, location: value.location, employmentType: value.type, status: value.status, vacancy: value.vacancy,
    }),
  };
};
const createPostDocument = async (user, body) => {
  if (user.role !== "alumni" || !user.isApproved) fail(403, "Only approved alumni can publish community posts");
  const fields = parse(schemaFor(body?.postType), body);
  const { postType, employmentType, ...shared } = fields;
  let post;
  if (postType === "job") {
    const notificationFields = { ...shared, description: shared.content, type: employmentType };
    post = await Job.create({ ...shared, type: employmentType, author: user._id, authorName: user.name || user.email, placementNotification: initialPlacementNotification(notificationFields, user) });
  } else post = await Story.create({ ...shared, author: user._id, authorName: user.name || user.email });
  const queued = postType === "job" && post.placementNotification.status === "pending";
  if (queued) wakePlacementNotifications();
  return { post, placementNotification: { status: postType === "story" ? "not_applicable" : queued ? "queued" : "disabled" } };
};
const validId = (id) => { if (!/^[a-f\d]{24}$/i.test(id)) fail(400, "Invalid post ID"); };
const findPost = async (id) => { validId(id); const post = await Post.findById(id); if (!post) fail(404, "Post not found"); return post; };
const updatePostDocument = async (user, id, body) => {
  const post = await findPost(id);
  if (!user.isApproved || String(post.author) !== String(user._id)) fail(403, "Only the author can change this post");
  if (body.postType !== undefined && body.postType !== post.postType) fail(400, "Post type cannot be changed after publishing");
  const fields = parse(schemaFor(post.postType).partial(), body);
  for (const key of Object.keys(fields)) if (!Object.hasOwn(body, key)) delete fields[key];
  delete fields.postType;
  if (fields.employmentType !== undefined) { fields.type = fields.employmentType; delete fields.employmentType; }
  Object.assign(post, fields);
  await post.save();
  return post;
};
const deletePostDocument = async (user, id) => {
  const post = await findPost(id);
  if (!user.isApproved || String(post.author) !== String(user._id)) fail(403, "Only the author can delete this post");
  await post.deleteOne();
};
module.exports = { Post, publicPost, createPostDocument, updatePostDocument, deletePostDocument, findPost, fail };
