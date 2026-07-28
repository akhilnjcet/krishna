const express = require('express');
const router = express.Router();
const lodgeBillingController = require('../controllers/lodgeBillingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/settings', protect, lodgeBillingController.getSettings);
router.post('/settings', protect, lodgeBillingController.saveSettings);
router.get('/bills', protect, lodgeBillingController.getBills);
router.post('/bills/:id/pay', protect, lodgeBillingController.payBill);
router.post('/bills/:id/archive', protect, lodgeBillingController.toggleArchiveBill);
router.get('/dashboard', protect, lodgeBillingController.getDashboardStats);
router.get('/reports', protect, lodgeBillingController.getRevenueReport);

module.exports = router;
