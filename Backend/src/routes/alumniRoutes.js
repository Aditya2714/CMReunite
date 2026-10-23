const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  deleteAlumniById,
  getAlumniById,
  getAlumniDirectory,
  getDirectoryOptions,
  updateAlumniById,
} = require("../controllers/alumniController");

const router = express.Router();

router.use(checkAuth);
router.get("/", asyncHandler(getAlumniDirectory));
router.get("/directory-options", asyncHandler(getDirectoryOptions));
router.get("/:id", asyncHandler(getAlumniById));
router.patch("/:id", asyncHandler(updateAlumniById));
router.delete("/:id", asyncHandler(deleteAlumniById));

module.exports = router;
