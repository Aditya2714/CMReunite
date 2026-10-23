const asyncHandler = require("../middlewares/asyncHandler");
const express = require('express');
const router = express.Router();
const bulkImportController = require('../controllers/bulkImportController');
const checkAuth = require('../middlewares/checkAuth');

router.post('/bulkImport', asyncHandler(checkAuth), asyncHandler(require("../services/departmentAccess").managementGuard), asyncHandler(bulkImportController.bulkImport));

module.exports = router;
