const express = require('express');
const router = express.Router();
const bulkImportController = require('../controllers/bulkImportController');
const checkAuth = require('../middlewares/checkAuth');

router.post('/bulkImport', checkAuth, bulkImportController.bulkImport);

module.exports = router;
