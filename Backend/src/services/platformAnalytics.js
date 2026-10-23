const Department = require("../models/departmentModel");
const Alumni = require("../models/alumniModel");
const User = require("../models/user");
const Event = require("../models/eventModel");
const { isSuper } = require("./departmentAccess");
const analytics = async (user) => {
  const filter = isSuper(user) ? {} : { department: user.department };
  const profiles = await Alumni.aggregate([
    { $match: filter }, { $lookup: { from: User.collection.name, localField: "user", foreignField: "_id", as: "account" } },
    { $unwind: "$account" }, { $match: { "account.role": "alumni" } },
    { $group: { _id: { department: { $ifNull: ["$department", null] }, status: { $ifNull: ["$account.approvalStatus", { $cond: [{ $eq: ["$account.isApproved", false] }, "pending", "approved"] }] } }, count: { $sum: 1 } } },
  ]);
  const events = await Event.aggregate([{ $match: filter }, { $group: { _id: { department: { $ifNull: ["$department", null] }, scope: "$scope" }, count: { $sum: 1 } } }]);
  const departments = await Department.find(isSuper(user) ? {} : { _id: user.department }).select("code name isActive").lean();
  const admins = await User.find({ role: "admin", isActive: true, ...filter }).select("name email department mustChangePassword").lean();
  const rows = [...departments.map((department) => ({ ...department, department: String(department._id) })), ...(isSuper(user) ? [{ department: null, code: "UNASSIGNED", name: "Unassigned", isActive: false }] : [])].map((department) => {
    const counts = profiles.filter((entry) => String(entry._id.department) === String(department.department));
    const byStatus = Object.fromEntries(["approved", "pending", "rejected"].map((status) => [status, counts.filter((entry) => entry._id.status === status).reduce((sum, entry) => sum + entry.count, 0)]));
    return { ...department, admin: admins.find((admin) => String(admin.department) === String(department.department)) || null, alumni: counts.reduce((sum, entry) => sum + entry.count, 0), ...byStatus, events: events.filter((entry) => department.department === null ? (entry._id.scope !== "platform" && (!entry._id.department || entry._id.scope !== "department")) : entry._id.scope === "department" && String(entry._id.department) === String(department.department)).reduce((sum, entry) => sum + entry.count, 0) };
  });
  return { departments: rows, totals: { alumni: profiles.reduce((sum, entry) => sum + entry.count, 0), events: events.reduce((sum, entry) => sum + entry.count, 0), platformEvents: events.filter((entry) => entry._id.scope === "platform").reduce((sum, entry) => sum + entry.count, 0), unassignedEvents: events.filter((entry) => !["department", "platform"].includes(entry._id.scope) || (entry._id.scope === "department" && !entry._id.department)).reduce((sum, entry) => sum + entry.count, 0), admins: admins.length } };
};
module.exports = { analytics };
