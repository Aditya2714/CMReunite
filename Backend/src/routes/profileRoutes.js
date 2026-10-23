const asyncHandler = require("../middlewares/asyncHandler");
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
      return cb(Object.assign(new Error("Only JPG, JPEG, PNG, WebP, and PDF files are supported"), { status: 400 }));
    }

    cb(null, true);
  },
});

router.use(checkAuth);
router.get("/me", asyncHandler(getMyProfile));
router.put("/me", uploadProfileFile.single("file"), asyncHandler(updateMyProfile));
router.get("/privacy", asyncHandler(getPrivacySettings));
router.patch("/privacy", asyncHandler(updatePrivacySettings));
router.post("/blocked/:userId", asyncHandler(updateBlockedUser));
router.delete("/blocked/:userId", asyncHandler(updateBlockedUser));
router.get("/export", asyncHandler(exportMyData));
router.get("/activity-summary", asyncHandler(getMyActivitySummary));

module.exports = router;
