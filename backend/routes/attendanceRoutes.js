const express = require('express');
const router = express.Router();
const { getAttendanceLogs, getStaffLogs, deleteLog, updateLog } = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getAttendanceLogs);
router.get('/my-logs', protect, getStaffLogs);
router.put('/:id', protect, admin, updateLog);
router.delete('/:id', protect, admin, deleteLog);

module.exports = router;
