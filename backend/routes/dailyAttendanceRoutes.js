const express = require('express');
const router = express.Router();
const { 
    markDailyAttendance, 
    getDailyAttendance, 
    getStaffDailyAttendanceSummary 
} = require('../controllers/dailyAttendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin', 'manager'), markDailyAttendance)
    .get(protect, authorize('admin', 'manager', 'staff', 'driver'), getDailyAttendance);

router.get('/summary', protect, authorize('admin', 'manager', 'staff', 'driver'), getStaffDailyAttendanceSummary);

module.exports = router;
