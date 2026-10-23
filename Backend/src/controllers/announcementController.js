const Announcement = require("../models/announcementModel");
const Alumni = require("../models/alumniModel");
const User = require("../models/user");
const path = require("node:path");
const access = require("../services/departmentAccess");
const { sendAnnouncementEmail } = require("../utils/emailHelper");
const { enqueue } = require("../services/jobQueue");
const { notify } = require("../services/notificationService");
const { wrap } = require("./superAdminController");
const canRead = (user) => access.announcementAudienceFilter(user);
const fields = (body) => {
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200 || typeof body.message !== "string" || !body.message.trim() || body.message.length > 10000) access.fail(400, "Title and message are required within their length limits");
  const batch = body.batch || "All batches";
  if (batch !== "All batches" && !/^\d{4}$/.test(batch)) access.fail(400, "Invalid graduation batch");
  return { title: body.title.trim(), message: body.message.trim(), batch };
};
const createAnnouncement = wrap(async (req, res) => {
  await access.requireManagement(req.user);
  const data = fields(req.body);
  if (!access.isSuper(req.user) && ((req.body.scope && req.body.scope !== "department") || (req.body.department && String(req.body.department) !== String(req.user.department)))) access.fail(403, "Department admins cannot publish outside their department");
  if (access.isSuper(req.user) && (data.batch !== "All batches" || (req.body.branch && req.body.branch !== "All branches"))) access.fail(400, "Platform-wide announcements target every department and batch");
  const department = access.isSuper(req.user) ? null : await access.activeDepartment(req.user.department);
  const announcement = await Announcement.create({ ...data, scope: access.isSuper(req.user) ? "platform" : "department", department: department?._id || null, branch: department?.code || "All branches", createdBy: req.user._id,
    attachmentUrl: req.file ? `/uploads/announcements/${req.file.filename}` : null,
    attachmentType: req.file ? req.file.mimetype.startsWith("image/") ? "image" : "pdf" : null,
  });
  await access.audit(req.user, "announcement.created", announcement._id, announcement.department, { scope: announcement.scope });
  const profiles = await Alumni.find({ ...(announcement.scope === "department" ? { department: announcement.department } : {}), ...(data.batch !== "All batches" ? { endYear: Number(data.batch) } : {}) }).select("user");
  const recipients = await User.find({ _id: { $in: profiles.map((profile) => profile.user) }, role: "alumni", isApproved: true, isActive: { $ne: false } }).select("name email department");
  enqueue("announcement-audience", async () => {
    for (const recipient of recipients) {
      try {
      // Recheck audience after reassignment; queued work must not cross departments.
      const current = await User.findOne({ _id: recipient._id, isActive: { $ne: false }, isApproved: true, role: "alumni" });
      if (!current || !(await Announcement.exists({ _id: announcement._id, ...canRead(Object.assign(current, { graduationYear: (await Alumni.findOne({ user: current._id }).select("endYear"))?.endYear })) }))) continue;
      const notification = await notify({ recipient: current._id, type: "announcement", skipEmail: true, title: announcement.title, message: announcement.message, link: "/announcements", metadata: { announcementId: announcement._id, reminderKey: `announcement:${announcement._id}` } });
      if (notification && require("../utils/emailTransport").isConfigured()) await sendAnnouncementEmail(current.email, current.name, announcement, announcement.attachmentUrl, announcement.attachmentType);
      } catch (error) { console.error("Announcement delivery failed for one recipient:", error.code || "DELIVERY_ERROR"); }
    }
  });
  res.status(201).json({ status: "success", data: { announcement, recipientCount: recipients.length } });
});
const getAnnouncements = wrap(async (req, res) => {
  if (req.user.role === "admin") await access.requireManagement(req.user);
  const announcements = await Announcement.find(canRead(req.user)).populate("createdBy", "name role").sort({ createdAt: -1 });
  res.json({ status: "success", results: announcements.length, data: { announcements } });
});
const updateAnnouncement = wrap(async (req, res) => {
  const record = await Announcement.findById(req.params.id); await access.assertOwnedDepartment(req.user, record);
  if (!access.isSuper(req.user) && record.scope !== "department") access.fail(403, "Only Super Admin can manage platform announcements");
  if (record.scope === "department") await access.activeDepartment(record.department);
  if (["scope", "department", "branch", "batch"].some((key) => req.body[key] !== undefined)) access.fail(400, "Announcement audience is fixed after publishing");
  Object.assign(record, fields({ title: record.title, message: record.message, ...req.body, batch: record.batch })); await record.save();
  await access.audit(req.user, "announcement.updated", record._id, record.department);
  res.json({ status: "success", data: { announcement: record } });
});
const deleteAnnouncement = wrap(async (req, res) => {
  const record = await Announcement.findById(req.params.id); await access.assertOwnedDepartment(req.user, record);
  if (!access.isSuper(req.user) && record.scope !== "department") access.fail(403, "Only Super Admin can manage platform announcements");
  await record.deleteOne(); await access.audit(req.user, "announcement.deleted", record._id, record.department);
  res.json({ status: "success", message: "Announcement deleted" });
});
const serveAttachment = async (req, res) => {
  try {
    const filename = path.basename(req.path);
    const record = await Announcement.findOne({ attachmentUrl: `/uploads/announcements/${filename}`, ...canRead(req.user) });
    if (!record) return res.status(404).json({ status: "fail", message: "Attachment not found" });
    return res.sendFile(path.join(__dirname, "../../public/uploads/announcements", filename));
  } catch { return res.status(404).json({ status: "fail", message: "Attachment not found" }); }
};
module.exports = { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement, serveAttachment };
