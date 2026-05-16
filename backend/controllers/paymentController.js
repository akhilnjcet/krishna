const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { EVENTS, sendNotification } = require('../services/notificationService');

exports.submitPayment = async (req, res) => {
    try {
        const { amount, method, referenceId, projectId, quoteId, notes } = req.body;
        const receiptUrl = req.file ? req.file.path : null;
        
        const newPayment = await Payment.create({
            customerId: req.user._id,
            amount,
            method,
            referenceId,
            projectId,
            quoteId,
            notes,
            receiptUrl,
            status: 'pending' // Manual verification needed
        });

        // Send Payment Received Notification (Non-blocking)
        const data = {
            name: req.user.name,
            amount: amount,
            room: 'Stay/Services'
        };
        sendNotification(EVENTS.PAYMENT_RECEIVED, req.user, data).catch(err => console.error('Payment Receive Notify Error:', err));

        res.status(201).json(newPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ customerId: req.user._id })
            .populate('projectId', 'title')
            .populate('quoteId', 'serviceType')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('customerId', 'name email')
            .populate('projectId', 'title')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { status } = req.body; // 'verified' or 'rejected'
        const payment = await Payment.findByIdAndUpdate(req.params.id, {
            status,
            verifiedAt: Date.now(),
            verifiedBy: req.user._id
        }, { new: true });
        
        if (!payment) return res.status(404).json({ message: 'Payment record not found' });

        // Send Payment Notification (Non-blocking)
        const customer = await User.findById(payment.customerId);
        if (customer) {
            const event = status === 'verified' ? EVENTS.PAYMENT_SUCCESS : EVENTS.PAYMENT_FAILED;
            const data = {
                name: customer.name,
                amount: payment.amount,
                room: 'Stay/Services' // Generic for payment controller
            };
            sendNotification(event, customer, data).catch(err => console.error('Payment Notify Error:', err));
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'inr', description } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            description,
            automatic_payment_methods: { enabled: true },
        });
        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
