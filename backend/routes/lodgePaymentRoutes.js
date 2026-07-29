const express = require('express');
const router = express.Router();
const lodgePaymentController = require('../controllers/lodgePaymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Settings
router.get('/settings', protect, lodgePaymentController.getSettings);
router.post('/settings', protect, admin, lodgePaymentController.saveSettings);

// Tenant Actions
router.post('/submit', protect, lodgePaymentController.submitPayment);
router.get('/my-payments', protect, lodgePaymentController.getMyPayments);

// Admin Actions
router.get('/all', protect, admin, lodgePaymentController.getAllPayments);
router.put('/verify/:id', protect, admin, lodgePaymentController.verifyPayment);
router.post('/request', protect, admin, lodgePaymentController.createPaymentRequest);
router.get('/stats', protect, admin, lodgePaymentController.getPaymentStats);

module.exports = router;
