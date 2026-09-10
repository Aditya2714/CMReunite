const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const { getNetworkGraph } = require("../controllers/networkController");

const router = express.Router();
router.use(checkAuth);
router.get("/graph", getNetworkGraph);

module.exports = router;
