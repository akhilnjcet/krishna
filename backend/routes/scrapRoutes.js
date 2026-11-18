const express = require('express');
const router = express.Router();
const scrapController = require('../controllers/scrapController');
const { protect, authorize } = require('../middleware/auth');

// Query & Analytics
router.get('/', protect, scrapController.getScrapRecords);
router.get('/analytics', protect, scrapController.getScrapAnalytics);

// Recording Scrap (Shopfloor staff, managers, admins)
router.post('/', protect, authorize('admin', 'manager', 'staff'), scrapController.createScrapRecord);

// Verification (Admin, Store Manager)
router.patch('/:id/verify', protect, authorize('admin', 'manager'), scrapController.verifyScrapRecord);

// Return Reusable Scrap to Stock (Authorized Store / Admin only)
router.post('/:id/return-to-stock', protect, authorize('admin', 'manager'), scrapController.returnScrapToStock);

// External Scrap Sale (Accountant, Admin, Manager)
router.post('/:id/sale', protect, authorize('admin', 'manager', 'accountant'), scrapController.recordScrapSale);

module.exports = router;
