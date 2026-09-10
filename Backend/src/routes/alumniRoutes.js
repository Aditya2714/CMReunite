const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  deleteAlumniById,
  getAlumniById,
  getAlumniDirectory,
  updateAlumniById,
} = require("../controllers/alumniController");

const router = express.Router();

router.use(checkAuth);
router.get("/", getAlumniDirectory);
router.get("/:id", getAlumniById);
router.patch("/:id", updateAlumniById);
router.delete("/:id", deleteAlumniById);

module.exports = router;
