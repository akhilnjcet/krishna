const express = require('express');
const router = express.Router();
const lodgePaymentController = require('../controllers/lodgePaymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Settings
router.get('/settings', lodgePaymentController.getSettings);
router.post('/settings', protect, lodgePaymentController.saveSettings);

// Tenant Actions
router.post('/submit', protect, lodgePaymentController.submitPayment);
router.get('/my-payments', protect, lodgePaymentController.getMyPayments);

// Admin Actions
router.get('/all', protect, admin, lodgePaymentController.getAllPayments);
router.put('/verify/:id', protect, admin, lodgePaymentController.verifyPayment);
router.post('/request', protect, admin, lodgePaymentController.createPaymentRequest);
router.get('/stats', protect, admin, lodgePaymentController.getPaymentStats);

// Financial Breakdown, Deposit Adjustments & Extra Charges
router.get('/booking-financials/:bookingId', protect, lodgePaymentController.getBookingFinancials);
router.post('/manage-deposit', protect, lodgePaymentController.manageSecurityDeposit);
router.post('/adjust-deposit', protect, lodgePaymentController.adjustRentFromDeposit);
router.post('/add-extra-charge', protect, lodgePaymentController.addExtraCharge);

// Admin Direct Payment, Corrections & Refunds
router.post('/record-admin-payment', protect, admin, lodgePaymentController.recordAdminPayment);
router.put('/payments/:paymentId/correct', protect, admin, lodgePaymentController.correctPayment);
router.post('/record-refund', protect, admin, lodgePaymentController.recordRefund);

module.exports = router;
