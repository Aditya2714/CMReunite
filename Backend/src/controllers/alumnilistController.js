const Alumni = require("../models/alumniModel");

async function alumniListController(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const filter = search
      ? {
          $or: ["firstName", "lastName", "company", "designation", "branch", "location"].map(
            (field) => ({ [field]: { $regex: search, $options: "i" } })
          ),
        }
      : {};
    const [alumni, total] = await Promise.all([
      Alumni.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Alumni.countDocuments(filter),
    ]);
    res.status(200).json({
      status: "success",
      data: {
        alumni,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Error during alumni list:", error);
    throw error;
  }
}
module.exports = alumniListController;
