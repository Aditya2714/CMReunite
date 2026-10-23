const Department = require("../models/departmentModel");
const User = require("../models/user");
const Alumni = require("../models/alumniModel");
const Audit = require("../models/auditLogModel");
const AuthSession = require("../models/authSessionModel");
const { randomUUID } = require("node:crypto");
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const managementRole = (user) => ["admin", "super_admin"].includes(user?.role);
const isSuper = (user) => user?.role === "super_admin";
const activeDepartment = async (id) => {
  if (!/^[a-f\d]{24}$/i.test(String(id || ""))) fail(400, "An active department is required");
  const department = await Department.findOne({ _id: id, isActive: true });
  if (!department) fail(400, "Department is missing or archived");
  return department;
};
const requireManagement = async (user) => {
  if (!managementRole(user) || user.isActive === false || user.mustChangePassword) fail(403, "Administrative access required");
  if (!isSuper(user)) {
    if (!user.department) fail(403, "Your department assignment is required");
    const department = await Department.findOne({ _id: user.department, isActive: true });
    if (!department) fail(403, "Your department is archived or unavailable");
  }
};
const managementFilter = (user) => isSuper(user) ? {} : { department: user.department };
const assertOwnedDepartment = async (user, document) => {
  await requireManagement(user);
  if (!document || (!isSuper(user) && String(document.department) !== String(user.department))) fail(404, "Record not found in your department");
};
const audit = (actor, action, target, department = null, details = {}) => Audit.create({ actor: actor?._id, action, target: String(target), department, details });
const revokeSessions = async (id) => {
  require("./cacheService").removeByPrefix("recommendations:");
  require("./realtimeService").disconnectUser(id);
  await User.updateOne({ _id: id }, { $inc: { authVersion: 1 } });
  await AuthSession.updateMany({ user: id, revokedAt: null }, { revokedAt: new Date() });
};
const departmentUserIds = async (user) => isSuper(user) ? null : Alumni.distinct("user", { department: user.department });
const managementGuard = async (req, res, next) => {
  try { await requireManagement(req.user); next(); } catch (error) { res.status(error.status || 500).json({ status: "fail", message: error.message }); }
};
const withDepartmentLocks = async (ids, operation) => {
  const token = randomUUID(), acquired = [];
  try {
    for (const id of [...new Set(ids.filter(Boolean).map(String))].sort()) {
      const locked = await Department.findOneAndUpdate({ _id: id, $or: [{ "operationLock.until": { $exists: false } }, { "operationLock.until": { $lt: new Date() } }] }, { $set: { operationLock: { token, until: new Date(Date.now() + 60000) } } });
      if (!locked) fail(409, "Department is being changed; retry the operation");
      acquired.push(id);
    }
    return await operation();
  } finally {
    if (acquired.length) await Department.updateMany({ _id: { $in: acquired }, "operationLock.token": token }, { $unset: { operationLock: 1 } });
  }
};
const eventAudienceFilter = (user) => isSuper(user) ? {} : user.role === "admin" ? { department: user.department, scope: "department" } : { $or: [{ scope: "platform", eligibility: "all" }, { scope: "department", eligibility: "all", department: { $ne: null } }, ...(user.department ? [{ scope: "department", department: user.department, eligibility: "department" }] : [])] };
const announcementAudienceFilter = (user) => isSuper(user) ? {} : { $or: [{ scope: "platform" }, ...(user.department ? [{ scope: "department", department: user.department, ...(user.role === "alumni" ? { $or: [{ batch: "All batches" }, { batch: String(user.graduationYear || "") }] } : {}) }] : [])] };
module.exports = { fail, managementRole, isSuper, activeDepartment, requireManagement, managementFilter, assertOwnedDepartment, audit, revokeSessions, departmentUserIds, managementGuard, withDepartmentLocks, eventAudienceFilter, announcementAudienceFilter };
