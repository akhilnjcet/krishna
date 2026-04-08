const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const Payment = require('../models/Payment');

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
