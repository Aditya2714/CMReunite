const { z } = require("zod");
const crypto = require("node:crypto");
const Department = require("../models/departmentModel");
const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const Event = require("../models/eventModel");
const Announcement = require("../models/announcementModel");
const Audit = require("../models/auditLogModel");
const { fail, audit, activeDepartment, revokeSessions, withDepartmentLocks } = require("../services/departmentAccess");
const { analytics } = require("../services/platformAnalytics");
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.code === 11000 ? 409 : error.status || (error.name === "CastError" ? 400 : 500)).json({ status: "fail", message: error.code === 11000 ? "Email, department code or active-admin assignment already exists" : error.status ? error.message : "Unable to complete administration request" }); } };
const parse = (schema, body) => { const result = schema.safeParse(body); if (!result.success) fail(400, "Invalid administration fields"); return result.data; };
const id = z.string().regex(/^[a-f\d]{24}$/i);
const publicDepartments = wrap(async (req, res) => res.json({ status: "success", data: { departments: await Department.find({ isActive: true }).select("code name").sort({ code: 1 }).lean() } }));
const listDepartments = wrap(async (req, res) => res.json({ status: "success", data: { departments: await Department.find().select("-operationLock").sort({ code: 1 }).lean() } }));
const createDepartment = wrap(async (req, res) => {
  const fields = parse(z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_-]{1,15}$/), name: z.string().trim().min(1).max(120) }).strict(), req.body);
  const department = await Department.create(fields); await audit(req.user, "department.created", department._id, department._id);
  res.status(201).json({ status: "success", data: { department } });
});
const updateDepartment = wrap(async (req, res) => {
  const fields = parse(z.object({ name: z.string().trim().min(1).max(120).optional(), isActive: z.boolean().optional() }).strict(), req.body);
  const department = await withDepartmentLocks([req.params.id], async () => {
    const record = await Department.findById(req.params.id); if (!record) fail(404, "Department not found");
    if (fields.isActive === false && await User.exists({ role: "admin", department: record._id, isActive: true })) fail(409, "Deactivate the department admin before archiving");
    Object.assign(record, fields); await record.save(); return record;
  });
  await audit(req.user, "department.updated", department._id, department._id, fields);
  const value = department.toObject(); delete value.operationLock;
  res.json({ status: "success", data: { department: value } });
});
const listAdmins = wrap(async (req, res) => res.json({ status: "success", data: { admins: await User.find({ role: "admin" }).select("name email department isActive mustChangePassword createdAt").populate("department", "code name isActive").sort({ createdAt: -1 }).lean() } }));
const createAdmin = wrap(async (req, res) => {
  const fields = parse(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email(), department: id, existingUserId: id.optional() }).strict(), req.body);
  const temporaryPassword = `Aa1!${crypto.randomBytes(18).toString("base64url")}`;
  const admin = await withDepartmentLocks([fields.department], async () => {
    await activeDepartment(fields.department);
    if (await User.exists({ role: "admin", department: fields.department, isActive: true })) fail(409, "This department already has an active admin");
    if (fields.existingUserId) {
      const existing = await User.findById(fields.existingUserId);
      if (!existing || !["college", "admin"].includes(existing.role) || existing.department || existing.email !== fields.email) fail(400, "Only an explicitly selected unassigned admin or college account can be provisioned");
      Object.assign(existing, { name: fields.name, role: "admin", department: fields.department, isActive: true, mustChangePassword: true, password: temporaryPassword });
      await existing.save(); await revokeSessions(existing._id); return existing;
    }
    return User.create({ ...fields, role: "admin", isActive: true, isApproved: true, approvalStatus: "approved", password: temporaryPassword, mustChangePassword: true });
  });
  await audit(req.user, "admin.provisioned", admin._id, admin.department);
  res.set("Cache-Control", "no-store").status(201).json({ status: "success", data: { admin: { _id: admin._id, name: admin.name, email: admin.email, department: admin.department, isActive: true }, temporaryPassword } });
});
const replaceAdmin = wrap(async (req, res) => {
  const fields = parse(z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email() }).strict(), req.body);
  const current = await User.findOne({ _id: req.params.id, role: "admin" });
  if (!current) fail(404, "Department admin not found");
  if (!current.isActive) fail(409, "Only an active department admin can be replaced");
  if (!current.department) fail(409, "The current admin has no department assignment");
  const temporaryPassword = `Aa1!${crypto.randomBytes(18).toString("base64url")}`;
  let replacement;
  await withDepartmentLocks([current.department], async () => {
    await activeDepartment(current.department);
    const latest = await User.findOne({ _id: current._id, role: "admin", isActive: true });
    if (!latest) fail(409, "The department admin has already changed");
    try {
      replacement = await User.create({ name: fields.name, email: fields.email, department: current.department, role: "admin", isActive: false, isApproved: true, approvalStatus: "approved", password: temporaryPassword, mustChangePassword: true });
      latest.isActive = false; await latest.save();
      replacement.isActive = true; await replacement.save();
    } catch (error) {
      if (replacement?._id) await User.deleteOne({ _id: replacement._id }).catch(() => {});
      await User.updateOne({ _id: current._id }, { $set: { isActive: true } }).catch(() => {});
      throw error;
    }
  });
  await revokeSessions(current._id);
  await audit(req.user, "admin.replaced", replacement._id, current.department, { previousAdmin: String(current._id) });
  require("../services/discoveryPolicy").invalidateDiscovery();
  res.set("Cache-Control", "no-store").status(201).json({ status: "success", data: { admin: { _id: replacement._id, name: replacement.name, email: replacement.email, department: replacement.department, isActive: true }, temporaryPassword } });
});
const changeAdmin = wrap(async (req, res) => {
  const fields = parse(z.object({ department: id.optional(), isActive: z.boolean().optional() }).strict(), req.body);
  const admin = await User.findOne({ _id: req.params.id, role: "admin" }); if (!admin) fail(404, "Department admin not found");
  if (!Object.keys(fields).length) fail(400, "Provide an account change");
  await withDepartmentLocks([admin.department, fields.department], async () => {
    if (fields.department || fields.isActive === true) await activeDepartment(fields.department || admin.department);
    const nextDepartment = fields.department || admin.department;
    if ((fields.isActive ?? admin.isActive) && await User.exists({ _id: { $ne: admin._id }, role: "admin", department: nextDepartment, isActive: true })) fail(409, "Target department already has an active admin");
    Object.assign(admin, fields); await admin.save(); await revokeSessions(admin._id);
  });
  await audit(req.user, "admin.updated", admin._id, admin.department, fields);
  require("../services/discoveryPolicy").invalidateDiscovery();
  res.json({ status: "success", message: "Admin updated; existing sessions revoked" });
});
const unassigned = wrap(async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  const models = { alumni: Alumni, admins: User, events: Event, announcements: Announcement };
  const type = req.query.type || "alumni", Model = models[type]; if (!Model) fail(400, "Invalid record type");
  const filter = type === "admins" ? { $or: [{ role: "admin", department: null }, { role: "college" }] } : { department: null, ...(type === "events" || type === "announcements" ? { scope: { $ne: "platform" } } : {}) };
  const [records, total] = await Promise.all([Model.find(filter).select("-password -passwordResetTokenHash -passwordResetExpiresAt").sort({ _id: -1 }).skip((page - 1) * 20).limit(20).lean(), Model.countDocuments(filter)]);
  res.json({ status: "success", data: { records, pagination: { page, total, pages: Math.ceil(total / 20) } } });
});
const assignRecord = wrap(async (req, res) => {
  const fields = parse(z.object({ department: id }).strict(), req.body);
  const department = await activeDepartment(fields.department);
  const models = { alumni: Alumni, events: Event, announcements: Announcement };
  const Model = models[req.params.type]; if (!Model) fail(400, "Use admin provisioning/reassignment for administrator accounts");
  const record = await Model.findById(req.params.id); if (!record) fail(404, "Record not found");
  if (req.params.type === "alumni") {
    const changed = await User.updateOne({ _id: record.user, role: "alumni" }, { $set: { department: department._id } });
    if (!changed.matchedCount) fail(409, "Profile has no linked alumni account");
    record.branch = department.code; await revokeSessions(record.user);
  } else {
    if (record.department || record.scope === "platform") fail(409, "Published ownership is fixed; only unassigned content can be assigned");
    record.scope = "department";
    if (req.params.type === "announcements") record.branch = department.code;
  }
  record.department = department._id; await record.save();
  await audit(req.user, `${req.params.type}.assigned`, record._id, department._id);
  require("../services/discoveryPolicy").invalidateDiscovery();
  res.json({ status: "success", message: "Department assigned without resending notifications" });
});
const listAudit = wrap(async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  const [entries, total] = await Promise.all([Audit.find().populate("actor", "name email").populate("department", "code").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(), Audit.countDocuments()]);
  res.json({ status: "success", data: { entries, pagination: { page, total, pages: Math.ceil(total / 25) } } });
});
const overview = wrap(async (req, res) => res.json({ status: "success", data: await analytics(req.user) }));
module.exports = { wrap, publicDepartments, listDepartments, createDepartment, updateDepartment, listAdmins, createAdmin, replaceAdmin, changeAdmin, unassigned, assignRecord, listAudit, overview };
module.exports.resetAdminPassword = wrap(async (req, res) => {
  const account = await User.findOne({ _id: req.params.id, role: "admin", isActive: true });
  if (!account) fail(404, "Active department admin not found");
  account.password = `Aa1!${crypto.randomBytes(18).toString("base64url")}`;
  const temporaryPassword = account.password;
  account.mustChangePassword = true; await account.save(); await revokeSessions(account._id);
  await audit(req.user, "admin.password_reset", account._id, account.department);
  res.set("Cache-Control", "no-store").json({ status: "success", data: { temporaryPassword } });
});
