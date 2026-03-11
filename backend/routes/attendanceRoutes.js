const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('staff'), markAttendance)
    .get(protect, authorize('admin', 'staff'), getAttendance);

module.exports = router;
