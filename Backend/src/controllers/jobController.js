// controllers/jobController.js
const { Job } = require("../models/job");

// Controller to create a job
const createJobController = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can post jobs" });
    }

    const { title, description, company, location, type, status, vacancy } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        status: "fail",
        message: "Title and description are required",
      });
    }

    const job = await Job.create({
      title,
      description,
      company,
      location,
      type,
      status,
      vacancy,
      createdBy: req.user._id,
    });

    res.status(201).json({
      status: "success",
      data: {
        job,
      },
    });
  } catch (error) {
    console.error("Error during job creation:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
    });
  }
};

// Controller to get all jobs
const getAllJobsController = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      data: {
        jobs,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
    });
  }
};

const updateJobController = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can update jobs" });
    }

    const allowedFields = [
      "title",
      "description",
      "company",
      "location",
      "type",
      "status",
      "vacancy",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const job = await Job.findOneAndUpdate({
      _id: req.params.id,
      createdBy: req.user._id,
    }, updates, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({ status: "fail", message: "Job not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { job },
    });
  } catch (error) {
    console.error("Error updating job:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

const deleteJobController = async (req, res) => {
  try {
    if (req.user.role !== "alumni") {
      return res.status(403).json({ status: "fail", message: "Only alumni can delete jobs" });
    }

    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({ status: "fail", message: "Job not found" });
    }

    return res.status(200).json({
      status: "success",
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
};

module.exports = {
  createJobController,
  deleteJobController,
  getAllJobsController,
  updateJobController,
};
