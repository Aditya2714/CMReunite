const Recognition = require("../models/recognitionModel");

const requireAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ status: "fail", message: "Admin access required" });
    return false;
  }
  return true;
};

const buildFileUpdates = (req) => {
  if (!req.file) return {};

  return {
    photoUrl: `${process.env.PUBLIC_API_URL || "http://127.0.0.1:4000"}/uploads/recognitions/${req.file.filename}`,
    fileType: req.file.mimetype,
    originalFileName: req.file.originalname,
  };
};

const createRecognition = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { name, achievement, year, batch, category } = req.body;

    if (!name || !achievement || !year) {
      return res.status(400).json({
        status: "fail",
        message: "Name, achievement, and year are required",
      });
    }

    const recognition = await Recognition.create({
      name,
      achievement,
      year,
      batch,
      category,
      ...buildFileUpdates(req),
      createdBy: req.user._id,
    });

    return res.status(201).json({
      status: "success",
      data: { recognition },
    });
  } catch (error) {
    console.error("Error creating recognition:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const getRecognitions = async (req, res) => {
  try {
    const recognitions = await Recognition.find()
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      results: recognitions.length,
      data: { recognitions },
    });
  } catch (error) {
    console.error("Error fetching recognitions:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const updateRecognition = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const allowedFields = ["name", "achievement", "year", "batch", "category"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    Object.assign(updates, buildFileUpdates(req));

    const recognition = await Recognition.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!recognition) {
      return res.status(404).json({ status: "fail", message: "Recognition not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { recognition },
    });
  } catch (error) {
    console.error("Error updating recognition:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const deleteRecognition = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const recognition = await Recognition.findByIdAndDelete(req.params.id);

    if (!recognition) {
      return res.status(404).json({ status: "fail", message: "Recognition not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "Recognition deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting recognition:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createRecognition,
  deleteRecognition,
  getRecognitions,
  updateRecognition,
};
