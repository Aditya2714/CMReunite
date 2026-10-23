const asyncHandler = require("../middlewares/asyncHandler");
// list of all alumni
// Path: Backend/src/routes/alumniList.js
const express = require('express');
const router = express.Router();
const alumnilistController = require('../controllers/alumnilistController');
const checkAuth = require('../middlewares/checkAuth');

router.get('/alumniList',asyncHandler(checkAuth),asyncHandler(alumnilistController));

module.exports = router;

