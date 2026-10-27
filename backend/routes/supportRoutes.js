const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { protect, admin } = require('../middleware/authMiddleware');

// Client / Staff request creation (protected)
router.post('/requests', protect, supportController.createSupportRequest);

// Admin-only endpoints
router.get('/requests', protect, admin, supportController.getSupportRequests);
router.put('/requests/:id/approve', protect, admin, supportController.approveSupportRequest);
router.put('/requests/:id/reject', protect, admin, supportController.rejectSupportRequest);
router.delete('/requests/closed/all', protect, admin, supportController.clearClosedSupportRequests);
router.delete('/requests/:id', protect, admin, supportController.deleteSupportRequest);
router.delete('/rooms/:chatId', protect, admin, supportController.deleteRoomSupportRequests);

// Alert settings endpoints (Admin)
router.get('/settings', protect, admin, supportController.getAlertSettings);
router.put('/settings', protect, admin, supportController.updateAlertSettings);
router.post('/test-alert-email', protect, admin, supportController.testAlertEmail);

module.exports = router;
