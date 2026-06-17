const express = require('express');
const router = express.Router();
const { protect, admin, authorize } = require('../middleware/authMiddleware');
const {
    updateProjectStatus,
    getAdminNotifications,
    markAsRead,
    markAllAsRead,
    getProjectTimeline,
    getDashboardStats
} = require('../controllers/projectStatusController');

// Project status updates and timeline (Staff & Admin)
router.put('/projects/:id/status', protect, authorize('admin', 'staff'), updateProjectStatus);
router.get('/projects/:id/timeline', protect, getProjectTimeline);

// Dashboard counts & status history (Admin only)
router.get('/projects/dashboard/stats', protect, admin, getDashboardStats);

// Notification endpoints (Admin only)
router.get('/notifications', protect, admin, getAdminNotifications);
router.put('/notifications/read-all', protect, admin, markAllAsRead);
router.put('/notifications/:id/read', protect, admin, markAsRead);

module.exports = router;
