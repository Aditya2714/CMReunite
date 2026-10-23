const access = require("../services/departmentAccess");
const { getManagedAlumni } = require("./adminController");
const { searchDirectory } = require("../services/directoryService");
// Keep the legacy URL, with the same permissions as the current endpoints.
module.exports = async (req, res) => {
  try {
    if (access.managementRole(req.user)) {
      await access.requireManagement(req.user);
      return await getManagedAlumni(req, res);
    }
    const data = await searchDirectory(req.user, { keyword: req.query.search, page: req.query.page, limit: req.query.limit });
    return res.json({ status: "success", data });
  } catch (error) {
    return res.status(error.status || 500).json({ status: "fail", message: error.status ? error.message : "Unable to load alumni" });
  }
};
