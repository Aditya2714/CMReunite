const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const checkAuth = require("../middlewares/checkAuth");
const {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} = require("../controllers/announcementController");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../public/uploads/announcements");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP, GIF, and PDF files are supported"));
    }
  },
});

router.use(checkAuth);
router.get("/", getAnnouncements);
router.post("/", upload.single("attachment"), createAnnouncement);
router.patch("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

module.exports = router;
