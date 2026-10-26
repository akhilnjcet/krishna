const express = require('express');
const router = express.Router();
const lodgeBillingController = require('../controllers/lodgeBillingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/settings', protect, lodgeBillingController.getSettings);
router.post('/settings', protect, admin, lodgeBillingController.saveSettings);
router.get('/bills', protect, lodgeBillingController.getBills);
router.post('/bills', protect, admin, lodgeBillingController.createBill);
router.post('/bills/:id/pay', protect, admin, lodgeBillingController.payBill);
router.post('/bills/:id/archive', protect, admin, lodgeBillingController.toggleArchiveBill);
router.get('/dashboard', protect, admin, lodgeBillingController.getDashboardStats);
router.get('/reports', protect, admin, lodgeBillingController.getRevenueReport);

module.exports = router;
