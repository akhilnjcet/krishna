const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getSettings,
    updateSettings,
    sendTestNotification,
    getNotificationLogs
} = require('../controllers/notificationController');

const {
    getVapidPublicKey,
    subscribeToPush
} = require('../controllers/projectStatusController');

// 1. User notification operations (Admin, Staff, Customer)
router.get('/', protect, getUserNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/clear-all', protect, clearAllNotifications);
router.delete('/:id', protect, deleteNotification);

// 2. Settings & preferences
router.get('/settings', protect, getSettings);
router.put('/settings', protect, admin, updateSettings);

// 3. Test & monitoring (Admin only)
router.post('/test', protect, admin, sendTestNotification);
router.get('/logs', protect, admin, getNotificationLogs);

// 4. Web push subscriptions (Available to all authenticated roles)
router.get('/vapid', getVapidPublicKey);
router.post('/subscribe', protect, subscribeToPush);

module.exports = router;
