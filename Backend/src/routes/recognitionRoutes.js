const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const checkAuth = require("../middlewares/checkAuth");
const {
  createRecognition,
  deleteRecognition,
  getRecognitions,
  updateRecognition,
} = require("../controllers/recognitionController");

const router = express.Router();
const uploadDir = path.join(__dirname, "../../public/uploads/recognitions");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const uploadRecognitionFile = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, WebP, and PDF files are supported"));
    }

    cb(null, true);
  },
});

router.use(checkAuth);
router.get("/", getRecognitions);
router.post("/", uploadRecognitionFile.single("file"), createRecognition);
router.patch("/:id", uploadRecognitionFile.single("file"), updateRecognition);
router.delete("/:id", deleteRecognition);

module.exports = router;
