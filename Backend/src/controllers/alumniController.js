const access = require("../services/departmentAccess");
const Alumni = require("../models/alumniModel");

const { SENIORITY_OPTIONS, searchDirectory } = require("../services/directoryService");
const getDirectoryOptions = (req, res) => res.json({ status: "success", data: { seniorityOptions: SENIORITY_OPTIONS } });
const getAlumniDirectory = async (req, res) => {
  try {
    const data = await searchDirectory(req.user, req.query);
    return res.json({ status: "success", results: data.alumni.length, data });
  } catch (error) {
    if (!error.status) require("../utils/operationalLog").failure("alumniController.failed", error);
    throw error;
  }
};

const getAlumniById = async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ status: "fail", message: "Invalid alumni ID" });
    if (!access.managementRole(req.user)) {
      const data = await searchDirectory(req.user, {}, req.params.id);
      if (!data.alumni.length) return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
      return res.json({ status: "success", data: { alumni: data.alumni[0] } });
    }
    const alumni = await Alumni.findById(req.params.id);
    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    if (access.managementRole(req.user)) await access.assertOwnedDepartment(req.user, alumni);
    return res.status(200).json({
      status: "success",
      data: { alumni },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("alumniController.failed", error);
    throw error;
  }
};

const updateAlumniById = async (req, res) => {
  try {
    if (!access.managementRole(req.user)) {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    await access.assertOwnedDepartment(req.user, await Alumni.findById(req.params.id));
    if (req.body.department !== undefined) access.fail(403, "Use Super Admin department assignment");
    if (req.body.branch !== undefined) {
      const department = await access.activeDepartment((await Alumni.findById(req.params.id)).department);
      if (req.body.branch !== department.code) access.fail(403, "Department changes require Super Admin");
    }
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "startYear",
      "endYear",
      "degree",
      "branch",
      "rollNumber",
      "company",
      "designation",
      "location",
      "bio",
      "mobileNumber",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const alumni = await Alumni.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    await access.audit(req.user, "alumni.updated", alumni._id, alumni.department);
    const userUpdates = {};
    if (updates.email) userUpdates.email = updates.email;
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      userUpdates.name = [alumni.firstName, alumni.lastName].filter(Boolean).join(" ");
    }

    if (alumni.user && Object.keys(userUpdates).length) {
      await req.user.constructor.findByIdAndUpdate(alumni.user, userUpdates, {
        runValidators: true,
      });
    }

    return res.status(200).json({
      status: "success",
      data: { alumni },
    });
  } catch (error) {
    require("../utils/operationalLog").failure("alumniController.failed", error);
    throw error;
  }
};

const deleteAlumniById = async (req, res) => {
  try {
    if (!access.managementRole(req.user)) {
      return res.status(403).json({ status: "fail", message: "Admin access required" });
    }

    await access.assertOwnedDepartment(req.user, await Alumni.findById(req.params.id));
    const alumni = await Alumni.findByIdAndDelete(req.params.id);

    if (!alumni) {
      return res.status(404).json({ status: "fail", message: "Alumni profile not found" });
    }

    await req.user.constructor.findByIdAndDelete(alumni.user);
    await access.audit(req.user, "alumni.deleted", alumni._id, alumni.department);

    return res.status(200).json({
      status: "success",
      message: "Alumni record deleted successfully",
    });
  } catch (error) {
    require("../utils/operationalLog").failure("alumniController.failed", error);
    throw error;
  }
};

module.exports = {
  getDirectoryOptions,
  deleteAlumniById,
  getAlumniDirectory,
  getAlumniById,
  updateAlumniById,
};
