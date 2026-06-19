const express = require('express');
const router = express.Router();
const { 
    getAttendanceReport, 
    getPayrollReport, 
    getOvertimeReport, 
    getProjectDelayReport, 
    getSalaryPaymentReport, 
    getStaffPerformanceReport 
} = require('../controllers/analyticsReportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/reports/attendance', protect, authorize('admin', 'manager'), getAttendanceReport);
router.get('/reports/payroll', protect, authorize('admin', 'manager'), getPayrollReport);
router.get('/reports/overtime', protect, authorize('admin', 'manager'), getOvertimeReport);
router.get('/reports/project-delay', protect, authorize('admin', 'manager'), getProjectDelayReport);
router.get('/reports/salary-payment', protect, authorize('admin', 'manager'), getSalaryPaymentReport);
router.get('/reports/performance', protect, authorize('admin', 'manager'), getStaffPerformanceReport);

module.exports = router;
