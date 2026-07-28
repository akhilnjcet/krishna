const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const Payment = require('../models/Payment');

exports.submitPayment = async (req, res) => {
    try {
        const { amount, method, referenceId, paymentDate, projectId, quoteId, notes, name, bookingId, roomId, uploadedProof, status } = req.body;
        const customerId = req.user._id || req.user.id;
        
        if (!customerId) {
            return res.status(400).json({ message: 'Authentication error: user ID not found.' });
        }

        const newPayment = await Payment.create({
            customerId,
            amount: parseFloat(amount),
            method: method || 'upi',
            referenceId,
            transactionReference: referenceId,
            paymentDate: paymentDate || Date.now(),
            projectId: projectId || undefined,
            quoteId: quoteId || undefined,
            bookingId: bookingId || undefined,
            roomId: roomId || undefined,
            uploadedProof: uploadedProof || undefined,
            tenantName: name || req.user.name,
            notes,
            name,
            status: status || 'WAITING_FOR_VERIFICATION'
        });

        // Broadcast status update to sockets
        const socketUtil = require('../utils/socket');
        const io = socketUtil.getIO();
        if (io) {
            io.emit('payment-status-changed', newPayment);
        }

        if (projectId) {
            const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
            await recalculateProjectPaymentStatus(projectId);
        }

        res.status(201).json(newPayment);
    } catch (error) {
        console.error('Payment submission error:', error);
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
        const { status, rejectionReason } = req.body;
        const verifiedByName = req.user.name || req.user.username || 'Admin';

        const payment = await Payment.findByIdAndUpdate(req.params.id, {
            status,
            rejectionReason: (status === 'Failed' || status === 'REJECTED') ? rejectionReason : undefined,
            verifiedByName,
            verifiedAt: Date.now(),
            verifiedBy: req.user._id || req.user.id
        }, { new: true }).populate('customerId');
        
        if (!payment) return res.status(404).json({ message: 'Payment record not found' });

        // Update invoice paymentStatus if it's Completed and linked to a project
        if (status === 'Completed' && payment.projectId) {
            const Invoice = require('../models/Invoice');
            await Invoice.findOneAndUpdate(
                { projectId: payment.projectId, customerId: payment.customerId, paymentStatus: 'unpaid' },
                { paymentStatus: 'paid' }
            );
        }

        // Settle LodgeRentBill if approved
        if ((status === 'Completed' || status === 'APPROVED') && payment.roomId) {
            const LodgeRentBill = require('../models/LodgeRentBill');
            await LodgeRentBill.findOneAndUpdate(
                { roomId: payment.roomId, userId: payment.customerId, status: 'Due' },
                { status: 'Paid', paymentDate: Date.now(), paymentMethod: payment.method, transactionId: payment.referenceId, outstandingAmount: 0 }
            );
        }

        // Recalculate project payment details
        if (payment.projectId) {
            const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
            await recalculateProjectPaymentStatus(payment.projectId);
        }

        // Send real-time updates via Socket.IO
        const socketUtil = require('../utils/socket');
        const io = socketUtil.getIO();
        if (io) {
            io.emit('payment-status-changed', payment);
        }

        // Dispatch WhatsApp Notification to the customer
        const { sendWhatsAppMessage } = require('../services/whatsappService');
        const customerPhone = payment.customerId?.phoneNumber || payment.customerId?.phone;
        if (customerPhone) {
            let notificationMessage = '';
            if (status === 'Completed' || status === 'APPROVED') {
                notificationMessage = `Hello ${payment.customerId.name || 'Client'},\n\nYour payment of ₹${payment.amount} (Ref: ${payment.referenceId || 'N/A'}) has been verified and completed successfully.\n\nThank you,\nKrishna Engineering Works`;
            } else if (status === 'Failed' || status === 'REJECTED') {
                notificationMessage = `Hello ${payment.customerId.name || 'Client'},\n\nYour payment verification for ₹${payment.amount} (Ref: ${payment.referenceId || 'N/A'}) was rejected.\nReason: ${rejectionReason || 'Verification Failed'}.\n\nPlease contact support.`;
            }
            if (notificationMessage) {
                sendWhatsAppMessage(customerPhone, notificationMessage).catch(err => {
                    console.error('WhatsApp Notification Dispatch Fail:', err);
                });
            }
        }

        res.json(payment);
    } catch (error) {
        console.error('Payment verification error:', error);
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
