const express = require('express');
const router = express.Router();
const { submitReport, getReports, deleteReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize('admin', 'manager', 'staff'), getReports)
    .post(protect, authorize('staff'), submitReport);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteReport);

module.exports = router;
