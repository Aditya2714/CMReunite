// routes/jobRoutes.js
const express = require("express");
const router = express.Router();
const {
  createJobController,
  deleteJobController,
  getAllJobsController,
  updateJobController,
} = require("../controllers/jobController");

const checkAuth = require("../middlewares/checkAuth");

// Assuming you have middleware for authentication
router.post("/create", checkAuth, createJobController);
router.get("/all", checkAuth, getAllJobsController);
router.patch("/:id", checkAuth, updateJobController);
router.delete("/:id", checkAuth, deleteJobController);

module.exports = router;
