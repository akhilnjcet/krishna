const express = require('express');
const router = express.Router();
const { 
    recordAttendance,
    getAttendanceLogs, 
    getStaffLogs, 
    viewFaceImage,
    deleteFaceImage,
    requestCorrection,
    reviewCorrection,
    getExceptions,
    enrollFaceTemplate,
    deleteLog, 
    updateLog 
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

// Staff Attendance submission
router.post('/record', protect, recordAttendance);
router.post('/request-correction', protect, requestCorrection);
router.post('/enroll-face', protect, enrollFaceTemplate);
router.get('/my-logs', protect, getStaffLogs);

// Admin Dashboard & Audit Operations
router.get('/', protect, admin, getAttendanceLogs);
router.get('/exceptions', protect, admin, getExceptions);
router.get('/:id/image', protect, admin, viewFaceImage);
router.delete('/:id/image', protect, admin, deleteFaceImage);
router.put('/:id/review-correction', protect, admin, reviewCorrection);
router.put('/:id', protect, admin, updateLog);
router.delete('/:id', protect, admin, deleteLog);

module.exports = router;
