const express = require('express');
const router = express.Router();
const { getAttendanceLogs, getStaffLogs, deleteLog } = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getAttendanceLogs);
router.get('/my-logs', protect, getStaffLogs);
router.delete('/:id', protect, admin, deleteLog);

module.exports = router;
