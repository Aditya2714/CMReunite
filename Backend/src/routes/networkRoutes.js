const asyncHandler = require("../middlewares/asyncHandler");
const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const { getNetworkGraph } = require("../controllers/networkController");

const router = express.Router();
router.use(checkAuth);
router.get("/graph", asyncHandler(getNetworkGraph));

module.exports = router;
