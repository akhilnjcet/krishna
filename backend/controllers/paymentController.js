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

// ─── CASHFREE PAYMENT GATEWAY INTEGRATION ────────────────────────────

const cashfreeService = require('../services/cashfreeService');

/**
 * Public/Protected: Get Cashfree Client Configuration
 */
exports.getCashfreeConfig = async (req, res) => {
    try {
        const creds = await cashfreeService.getCredentials();
        res.json({
            enabled: creds.enabled,
            env: creds.env,
            isProduction: creds.isProduction,
            appId: creds.appId ? `${creds.appId.slice(0, 8)}...` : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Protected/Optional: Create Cashfree PG Order
 */
exports.createCashfreeOrder = async (req, res) => {
    try {
        const { 
            amount, 
            orderNote, 
            projectId, 
            quoteId, 
            bookingId, 
            roomId, 
            paymentType = 'Rent', 
            chargeCategory = 'Rent',
            name, 
            email, 
            phone, 
            returnUrl 
        } = req.body;
        const customer = req.user || {};

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required.' });
        }

        const orderId = `KE_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
        const customerId = customer._id || customer.id || req.body.customerId || `guest_${Date.now().toString(36)}`;
        const customerName = name || customer.name || 'Valued Client';
        const customerEmail = email || customer.email || 'customer@krishnaengg.com';
        const customerPhone = phone || customer.phone || customer.phoneNumber || '9447940835';

        const orderResult = await cashfreeService.createOrder({
            orderId,
            orderAmount: parseFloat(amount),
            customerId: String(customerId),
            customerName,
            customerEmail,
            customerPhone,
            orderNote: orderNote || `${paymentType} Online Payment for Krishna Engineering / Lodge`,
            returnUrl
        });

        // Pre-create pending payment record in DB
        await Payment.create({
            customerId: customer._id || customer.id || undefined,
            amount: parseFloat(amount),
            method: 'cashfree',
            referenceId: orderId,
            transactionReference: orderId,
            paymentDate: new Date(),
            projectId: projectId || undefined,
            quoteId: quoteId || undefined,
            bookingId: bookingId || undefined,
            roomId: roomId || undefined,
            tenantName: customerName,
            paymentType: paymentType,
            chargeCategory: chargeCategory,
            notes: orderNote || `${paymentType} Cashfree Payment`,
            status: 'WAITING_FOR_VERIFICATION'
        });

        res.status(201).json(orderResult);
    } catch (err) {
        console.error('[Cashfree Order Error]:', err.response?.data || err.message);
        res.status(500).json({ 
            message: err.response?.data?.message || err.message || 'Unable to generate Cashfree payment order.',
            debug: {
                status: err.response?.status,
                url: err.config?.url,
                headersSent: {
                    clientId: err.config?.headers?.['x-client-id'],
                    hasSecret: Boolean(err.config?.headers?.['x-client-secret']),
                    secretLength: err.config?.headers?.['x-client-secret']?.length,
                    secretPrefix: err.config?.headers?.['x-client-secret']?.slice(0, 15)
                }
            }
        });
    }
};

/**
 * Protected/Optional: Verify Cashfree PG Order & Complete Payment
 */
exports.verifyCashfreePayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required for verification.' });
        }

        const orderData = await cashfreeService.getOrder(orderId);
        const orderStatus = orderData.order_status; // PAID, ACTIVE, EXPIRED, TERMINATED

        if (orderStatus === 'PAID') {
            let payment = await Payment.findOne({ referenceId: orderId });
            
            if (!payment) {
                payment = new Payment({
                    customerId: (req.user && (req.user._id || req.user.id)) || undefined,
                    amount: parseFloat(orderData.order_amount),
                    method: 'cashfree',
                    referenceId: orderId,
                    transactionReference: orderData.cf_order_id ? String(orderData.cf_order_id) : orderId,
                    paymentDate: new Date(),
                    tenantName: (req.user && req.user.name) || 'Client',
                    notes: orderData.order_note || 'Cashfree Online Gateway',
                    paymentType: 'Rent',
                    chargeCategory: 'Rent'
                });
            }

            payment.status = 'Completed';
            payment.verifiedByName = 'Cashfree Automated Gateway';
            payment.verifiedAt = new Date();
            await payment.save();

            // Recalculate Project Status if linked
            if (payment.projectId) {
                const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
                await recalculateProjectPaymentStatus(payment.projectId);
            }

            // Settle Rent Bill if linked to room
            if (payment.roomId) {
                const LodgeRentBill = require('../models/LodgeRentBill');
                await LodgeRentBill.findOneAndUpdate(
                    { roomId: payment.roomId, status: 'Due' },
                    { status: 'Paid', paymentDate: Date.now(), paymentMethod: 'cashfree', transactionId: orderId, outstandingAmount: 0 }
                );
            }

            // Socket.IO real-time notification
            const socketUtil = require('../utils/socket');
            const io = socketUtil.getIO();
            if (io) {
                io.emit('payment-status-changed', payment);
            }

            return res.json({ 
                success: true, 
                message: 'Payment verified and completed successfully.', 
                payment,
                order: orderData 
            });
        }

        return res.json({ 
            success: false, 
            orderStatus, 
            message: `Order status is currently ${orderStatus}.` 
        });
    } catch (err) {
        console.error('[Cashfree Verification Error]:', err.response?.data || err.message);
        res.status(500).json({ 
            message: err.response?.data?.message || err.message || 'Payment verification failed.' 
        });
    }
};

/**
 * Public: Cashfree Webhook Listener
 * Verifies HMAC-SHA256 signature using rawBody and re-verifies payment state
 */
exports.cashfreeWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBodyStr = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);

        // Verify webhook signature if present
        if (signature && timestamp) {
            try {
                cashfreeService.verifyWebhookSignature(signature, rawBodyStr, timestamp);
            } catch (sigErr) {
                console.error('[Cashfree Webhook] Invalid signature:', sigErr.message);
                return res.status(400).send('Invalid signature');
            }
        }

        const payload = req.body || {};
        const { type, data } = payload;
        console.log('[Cashfree Webhook Received]:', type, data?.order?.order_id || payload.order_id);

        const orderId = data?.order?.order_id || payload.order_id;

        if (orderId) {
            if (type === 'PAYMENT_SUCCESS_WEBHOOK' || data?.order?.order_status === 'PAID') {
                // Re-verify order from backend before final fulfillment
                try {
                    const verifiedOrder = await cashfreeService.getOrder(orderId);
                    if (verifiedOrder.order_status === 'PAID') {
                        let payment = await Payment.findOne({ referenceId: orderId });
                        if (payment && payment.status !== 'Completed') {
                            payment.status = 'Completed';
                            payment.verifiedByName = 'Cashfree Webhook';
                            payment.verifiedAt = new Date();
                            await payment.save();

                            if (payment.projectId) {
                                const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
                                await recalculateProjectPaymentStatus(payment.projectId);
                            }

                            if (payment.roomId) {
                                const LodgeRentBill = require('../models/LodgeRentBill');
                                await LodgeRentBill.findOneAndUpdate(
                                    { roomId: payment.roomId, userId: payment.customerId, status: 'Due' },
                                    { status: 'Paid', paymentDate: Date.now(), paymentMethod: 'cashfree', transactionId: orderId, outstandingAmount: 0 }
                                );
                            }

                            const socketUtil = require('../utils/socket');
                            const io = socketUtil.getIO();
                            if (io) {
                                io.emit('payment-status-changed', payment);
                            }
                        }
                    }
                } catch (verifyErr) {
                    console.warn('[Cashfree Webhook] Order re-fetch warning:', verifyErr.message);
                }
            } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
                const payment = await Payment.findOne({ referenceId: orderId });
                if (payment && payment.status === 'WAITING_FOR_VERIFICATION') {
                    payment.status = 'Failed';
                    payment.rejectionReason = data?.error_details?.error_reason || 'Payment failed at bank';
                    await payment.save();
                }
            }
        }

        return res.status(200).send('OK');
    } catch (err) {
        console.error('[Cashfree Webhook Error]:', err.message);
        return res.status(200).send('ERROR_RECORDED');
    }
};


