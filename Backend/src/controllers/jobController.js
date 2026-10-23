const { Job } = require("../models/job");
const { handle } = require("./postController");
const { createPostDocument, updatePostDocument, deletePostDocument } = require("../services/postService");
const { placementEmailConfig } = require("../services/placementNotificationService");
const legacyJob = (post) => ({ _id: post._id, title: post.title, description: post.content, company: post.company, location: post.location, type: post.type, status: post.status, vacancy: post.vacancy, createdBy: post.author, createdAt: post.createdAt, updatedAt: post.updatedAt });
const legacyBody = (body) => {
  const fields = {};
  for (const key of ["title", "company", "location", "status", "vacancy"]) if (body[key] !== undefined) fields[key] = body[key];
  if (body.description !== undefined) fields.content = body.description;
  if (body.type !== undefined) fields.employmentType = body.type;
  return fields;
};
const createJobController = handle(async (req, res) => {
  const result = await createPostDocument(req.user, { ...legacyBody(req.body), postType: "job" });
  res.status(201).json({ status: "success", data: { job: legacyJob(result.post), placementNotification: result.placementNotification } });
});
const getAllJobsController = handle(async (req, res) => {
  const jobs = await Job.find().populate("author", "name email role").sort({ createdAt: -1 });
  res.json({ status: "success", data: { jobs: jobs.map(legacyJob) } });
});
const updateJobController = handle(async (req, res) => {
  const existing = await Job.findById(req.params.id);
  if (!existing || String(existing.author) !== String(req.user._id)) return res.status(404).json({ status: "fail", message: "Job not found" });
  const job = await updatePostDocument(req.user, req.params.id, legacyBody(req.body));
  res.json({ status: "success", data: { job: legacyJob(job) } });
});
const deleteJobController = handle(async (req, res) => {
  const existing = await Job.findById(req.params.id);
  if (!existing || String(existing.author) !== String(req.user._id)) return res.status(404).json({ status: "fail", message: "Job not found" });
  await deletePostDocument(req.user, req.params.id);
  res.json({ status: "success", message: "Job deleted successfully" });
});
const getPlacementNotificationStatus = (req, res) => res.json({ status: "success", data: { status: placementEmailConfig().status } });
module.exports = { createJobController, getAllJobsController, updateJobController, deleteJobController, getPlacementNotificationStatus };
