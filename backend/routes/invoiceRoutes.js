const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, updateInvoicePayment } = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createInvoice)
    .get(protect, getInvoices);

router.route('/:id/pay')
    .put(protect, authorize('admin', 'customer'), updateInvoicePayment);

module.exports = router;
