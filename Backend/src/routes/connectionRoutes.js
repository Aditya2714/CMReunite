const express = require("express");
const checkAuth = require("../middlewares/checkAuth");
const {
  getMyConnections,
  sendConnectionRequest,
  updateConnectionRequest,
} = require("../controllers/connectionController");

const router = express.Router();

router.use(checkAuth);
router.get("/", getMyConnections);
router.post("/:alumniId", sendConnectionRequest);
router.patch("/:connectionId", updateConnectionRequest);

module.exports = router;
