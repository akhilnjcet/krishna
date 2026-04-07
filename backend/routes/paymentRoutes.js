const express = require('express');
const router = express.Router();
const { 
    createPaymentIntent, 
    submitPayment, 
    getMyPayments, 
    getAllPayments, 
    verifyPayment 
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/submit', protect, submitPayment);
router.get('/my-payments', protect, getMyPayments);

// Admin only
router.get('/', protect, admin, getAllPayments);
router.put('/:id/verify', protect, admin, verifyPayment);

module.exports = router;
