const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const checkAuth = require("../middlewares/checkAuth");
const {
  getMyProfile,
  updateMyProfile,
  exportMyData,
  getPrivacySettings,
  updateBlockedUser,
  updatePrivacySettings,
  getMyActivitySummary,
} = require("../controllers/profileController");

const router = express.Router();
const uploadDir = path.join(__dirname, "../../public/uploads/profiles");

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

const uploadProfileFile = multer({
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
router.get("/me", getMyProfile);
router.put("/me", uploadProfileFile.single("file"), updateMyProfile);
router.get("/privacy", getPrivacySettings);
router.patch("/privacy", updatePrivacySettings);
router.post("/blocked/:userId", updateBlockedUser);
router.delete("/blocked/:userId", updateBlockedUser);
router.get("/export", exportMyData);
router.get("/activity-summary", getMyActivitySummary);

module.exports = router;
