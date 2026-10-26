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

const SecurityAuditLog = require('../models/SecurityAuditLog');

router.get('/reports/attendance', protect, authorize('admin', 'manager'), getAttendanceReport);
router.get('/reports/payroll', protect, authorize('admin', 'manager'), getPayrollReport);
router.get('/reports/overtime', protect, authorize('admin', 'manager'), getOvertimeReport);
router.get('/reports/project-delay', protect, authorize('admin', 'manager'), getProjectDelayReport);
router.get('/reports/salary-payment', protect, authorize('admin', 'manager'), getSalaryPaymentReport);
router.get('/reports/performance', protect, authorize('admin', 'manager'), getStaffPerformanceReport);

// @route   GET /api/analytics/security-audit
// @desc    Retrieve security audit trail and threat detection metrics
// @access  Private (Admin only)
router.get('/security-audit', protect, authorize('admin'), async (req, res) => {
    try {
        const { limit = 50, eventType, severity, hours = 24 } = req.query;
        const query = {};
        
        if (eventType) query.eventType = eventType;
        if (severity) query.severity = severity;
        if (hours) {
            const since = new Date(Date.now() - parseInt(hours, 10) * 3600 * 1000);
            query.timestamp = { $gte: since };
        }

        const logs = await SecurityAuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(Math.min(parseInt(limit, 10) || 50, 200))
            .populate('userId', 'name email role')
            .lean();

        // Summary threat metrics
        const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
        const [failedLogins, lockedAccounts, probesDetected, serverErrors, botsBlocked, scrapingDetected] = await Promise.all([
            SecurityAuditLog.countDocuments({ eventType: 'AUTH_LOGIN_FAILED', timestamp: { $gte: oneDayAgo } }),
            SecurityAuditLog.countDocuments({ eventType: 'AUTH_LOCKOUT', timestamp: { $gte: oneDayAgo } }),
            SecurityAuditLog.countDocuments({ eventType: 'SUSPICIOUS_PROBE', timestamp: { $gte: oneDayAgo } }),
            SecurityAuditLog.countDocuments({ eventType: 'API_SERVER_ERROR', timestamp: { $gte: oneDayAgo } }),
            SecurityAuditLog.countDocuments({ eventType: 'BOT_BLOCKED', timestamp: { $gte: oneDayAgo } }),
            SecurityAuditLog.countDocuments({ eventType: 'SCRAPING_DETECTED', timestamp: { $gte: oneDayAgo } })
        ]);

        res.json({
            metrics: {
                failedLoginsLast24h: failedLogins,
                lockoutsLast24h: lockedAccounts,
                suspiciousProbesLast24h: probesDetected,
                serverErrorsLast24h: serverErrors,
                botsBlockedLast24h: botsBlocked,
                scrapingDetectedLast24h: scrapingDetected
            },
            count: logs.length,
            logs
        });
    } catch (err) {
        console.error('[SECURITY_AUDIT_ENDPOINT_ERROR]', err);
        res.status(500).json({ message: 'Failed to retrieve security audit records' });
    }
});

module.exports = router;

