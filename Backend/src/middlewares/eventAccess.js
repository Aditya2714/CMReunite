const Event = require("../models/eventModel");
const access = require("../services/departmentAccess");
module.exports = async (req, res, next) => {
  try {
    if (req.path === "/all" && req.user.role === "admin") await access.requireManagement(req.user);
    if (req.method === "POST" && req.path === "/create") {
      await access.requireManagement(req.user);
      if (!access.isSuper(req.user) && (req.body.scope === "platform" || (req.body.department && String(req.body.department) !== String(req.user.department)))) access.fail(403, "Cannot publish another department's event");
      const scope = access.isSuper(req.user) && req.body.scope === "platform" ? "platform" : "department";
      const department = scope === "platform" ? null : await access.activeDepartment(access.isSuper(req.user) ? req.body.department : req.user.department);
      if (req.body.eligibility && !["department", "all"].includes(req.body.eligibility)) access.fail(400, "Invalid event eligibility");
      req.eventOwnership = { scope, department: department?._id || null, eligibility: scope === "platform" ? "all" : req.body.eligibility || "department" };
    } else if (req.params.id) {
      if (!/^[a-f\d]{24}$/i.test(req.params.id)) access.fail(400, "Invalid event ID");
      const record = await Event.findById(req.params.id);
      if (["PATCH", "DELETE"].includes(req.method) || req.path.endsWith("/check-in")) {
        await access.assertOwnedDepartment(req.user, record);
        if (req.method === "PATCH" && record.scope === "department") await access.activeDepartment(record.department);
        if (record.scope === "platform" && req.body.eligibility && req.body.eligibility !== "all") access.fail(400, "Platform events must remain open to all departments");
        if (["scope", "department"].some((key) => req.body[key] !== undefined)) access.fail(400, "Event ownership is fixed; use Super Admin assignments");
      } else if (req.path.endsWith("/register") && (!record || !(await Event.exists({ _id: record._id, ...access.eventAudienceFilter(req.user) })))) access.fail(404, "Event not available to your department");
    }
    next();
  } catch (error) { res.status(error.status || 500).json({ status: "fail", message: error.status ? error.message : "Unable to check event access" }); }
};
