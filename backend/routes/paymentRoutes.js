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

const upload = require('../config/cloudinary');

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/submit', protect, upload.single('image'), submitPayment);
router.get('/my-payments', protect, getMyPayments);

// Admin only
router.get('/', protect, admin, getAllPayments);
router.put('/:id/verify', protect, admin, verifyPayment);

// @route   POST /api/payments/manual
// @desc    Admin manually add payment for rent/dues
// @access  Private Admin
router.post('/manual', protect, admin, async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const { customerId, amount, method, referenceId, notes } = req.body;
        
        const payment = await Payment.create({
            customerId,
            amount: parseFloat(amount),
            method: method || 'cash',
            referenceId: referenceId || 'MANUAL',
            status: 'verified',
            verifiedAt: Date.now(),
            verifiedBy: req.user.id || req.user._id,
            notes: notes || 'Admin override payment'
        });
        res.status(201).json(payment);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
