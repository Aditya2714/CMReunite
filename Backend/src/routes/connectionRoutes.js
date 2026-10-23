const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getMyConnections,
  sendConnectionRequest,
  updateConnectionRequest,
} = require("../controllers/connectionController");

const router = express.Router();

router.use(checkAuth);
router.get("/", asyncHandler(getMyConnections));
router.post("/:alumniId", asyncHandler(sendConnectionRequest));
router.patch("/:connectionId", asyncHandler(updateConnectionRequest));

module.exports = router;
