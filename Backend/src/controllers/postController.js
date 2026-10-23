const { Post, publicPost, createPostDocument, updatePostDocument, deletePostDocument, findPost, fail } = require("../services/postService");
const { placementEmailConfig } = require("../services/placementNotificationService");
const handle = (operation) => async (req, res) => {
  try { await operation(req, res); } catch (error) {
    if (!error.status) console.error("Community post request failed:", error.name);
    res.status(error.status || 500).json({ status: "fail", message: error.status ? error.message : "Unable to process community post" });
  }
};
const listPosts = handle(async (req, res) => {
  const { postType, page = "1", limit = "20" } = req.query;
  if (postType && !["story", "job"].includes(postType)) fail(400, "Invalid post filter");
  const pageNumber = Number(page), pageSize = Number(limit);
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) fail(400, "Invalid pagination");
  const filter = postType ? { postType } : {};
  const [posts, total] = await Promise.all([Post.find(filter).sort({ createdAt: -1, _id: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize), Post.countDocuments(filter)]);
  res.json({ status: "success", data: { posts: posts.map((post) => publicPost(post, req.user)), pagination: { page: pageNumber, limit: pageSize, total, pages: Math.ceil(total / pageSize) } } });
});
const getPost = handle(async (req, res) => res.json({ status: "success", data: { post: publicPost(await findPost(req.params.id), req.user) } }));
const createPost = handle(async (req, res) => {
  const result = await createPostDocument(req.user, req.body);
  res.status(201).json({ status: "success", data: { post: publicPost(result.post, req.user), placementNotification: result.placementNotification } });
});
const updatePost = handle(async (req, res) => res.json({ status: "success", data: { post: publicPost(await updatePostDocument(req.user, req.params.id, req.body), req.user) } }));
const deletePost = handle(async (req, res) => { await deletePostDocument(req.user, req.params.id); res.json({ status: "success", message: "Post deleted" }); });
const getSettings = (req, res) => res.json({ status: "success", data: { status: placementEmailConfig().status } });
module.exports = { handle, listPosts, getPost, createPost, updatePost, deletePost, getSettings };
