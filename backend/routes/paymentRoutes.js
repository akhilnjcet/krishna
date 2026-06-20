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
router.post('/submit', protect, submitPayment);
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
        const { customerId, amount, method, referenceId, notes, projectId } = req.body;
        
        const payment = await Payment.create({
            customerId,
            amount: parseFloat(amount),
            method: method || 'cash',
            referenceId: referenceId || 'MANUAL',
            status: 'Completed',
            projectId: projectId || undefined,
            verifiedAt: Date.now(),
            verifiedBy: req.user.id || req.user._id,
            verifiedByName: req.user.name || req.user.username || 'Admin',
            notes: notes || 'Admin override payment'
        });

        // Recalculate project payment status
        if (projectId) {
            const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
            await recalculateProjectPaymentStatus(projectId);
        }

        // Send real-time updates via Socket.IO
        const socketUtil = require('../utils/socket');
        const io = socketUtil.getIO();
        if (io) {
            io.emit('payment-status-changed', payment);
        }

        res.status(201).json(payment);
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
