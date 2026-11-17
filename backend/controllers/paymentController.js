const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

exports.submitPayment = async (req, res) => {
    try {
        const { amount, method, referenceId, paymentDate, projectId, quoteId, notes, name, bookingId, roomId, uploadedProof } = req.body;
        const customerId = req.user._id || req.user.id;
        
        if (!customerId) {
            return res.status(400).json({ message: 'Authentication error: user ID not found.' });
        }

        // Enforce ownership: verify user owns the project if projectId provided
        if (projectId) {
            const Project = require('../models/Project');
            const project = await Project.findById(projectId);
            if (!project) return res.status(404).json({ message: 'Project not found.' });
            if (req.user.role !== 'admin' && (!project.customerId || project.customerId.toString() !== customerId.toString())) {
                return res.status(403).json({ message: 'Access denied: You do not own this project.' });
            }
        }

        // Enforce ownership: verify tenant owns the booking if bookingId provided
        if (bookingId) {
            const BookingLodge = require('../models/BookingLodge');
            const booking = await BookingLodge.findById(bookingId);
            if (!booking) return res.status(404).json({ message: 'Booking not found.' });
            const bookingOwnerId = (booking.userId?._id || booking.userId || '').toString();
            if (req.user.role !== 'admin' && bookingOwnerId !== customerId.toString()) {
                return res.status(403).json({ message: 'Access denied: You do not own this booking.' });
            }
        }

        // Security: Non-admins can NEVER submit pre-verified or completed payments
        const paymentStatus = req.user.role === 'admin' && req.body.status ? req.body.status : 'WAITING_FOR_VERIFICATION';

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
            status: paymentStatus
        });

        // Broadcast status update to sockets
        const socketUtil = require('../utils/socket');
        const io = socketUtil.getIO();
        if (io) {
            io.emit('payment-status-changed', newPayment);
        }

        try {
            const { dispatchNotification } = require('../services/notificationDispatcher');
            dispatchNotification({
                title: 'New Payment Submitted',
                message: `Payment of ₹${amount} submitted via ${method} — awaiting verification.`,
                category: 'payment',
                priority: 'high',
                recipientRole: 'admin',
                link: '/admin/finance',
                metadata: { paymentId: newPayment._id, amount, method }
            }).catch(() => {});
        } catch (e) {}

        if (projectId && paymentStatus === 'Completed') {
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
            .populate('roomId', 'roomNumber type price')
            .populate('bookingId', 'agreementNumber status totalAmount securityDeposit')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('customerId', 'name email phone phoneNumber')
            .populate('projectId', 'title')
            .populate('roomId', 'roomNumber type price')
            .populate('bookingId', 'agreementNumber status totalAmount securityDeposit')
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

        // Settle LodgeRentBill if approved with accurate balance reconciliation
        if ((status === 'Completed' || status === 'APPROVED') && (payment.roomId || payment.billId)) {
            const LodgeRentBill = require('../models/LodgeRentBill');
            let bill = null;
            if (payment.billId) {
                bill = await LodgeRentBill.findById(payment.billId);
            } else if (payment.roomId) {
                bill = await LodgeRentBill.findOne({
                    roomId: payment.roomId,
                    archived: false,
                    status: { $in: ['Due', 'Unpaid', 'Partially Paid'] }
                }).sort({ dueDate: 1 });
            }

            if (bill) {
                const verifiedPayments = await Payment.find({
                    $or: [
                        { billId: bill._id },
                        { roomId: payment.roomId, paymentType: 'Rent' },
                        { bookingId: payment.bookingId, paymentType: 'Rent' }
                    ],
                    status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'] }
                });
                const totalPaidForBill = verifiedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                const rem = Math.max(0, bill.totalAmount - totalPaidForBill);
                bill.outstandingAmount = rem;
                bill.status = rem === 0 ? 'Paid' : (totalPaidForBill > 0 ? 'Partially Paid' : 'Due');
                if (rem === 0) bill.paymentDate = new Date();
                bill.paymentMethod = payment.method;
                bill.transactionId = payment.referenceId || payment.cfPaymentId;
                await bill.save();
            }
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

        try {
            const { dispatchNotification } = require('../services/notificationDispatcher');
            const custId = payment.customerId?._id || payment.customerId;
            if (custId) {
                dispatchNotification({
                    title: (status === 'Completed' || status === 'APPROVED') ? 'Payment Approved' : 'Payment Rejected',
                    message: (status === 'Completed' || status === 'APPROVED')
                        ? `Your payment of ₹${payment.amount} has been verified and approved.`
                        : `Your payment of ₹${payment.amount} was rejected: ${rejectionReason || 'Verification Failed'}.`,
                    category: 'payment',
                    priority: (status === 'Completed' || status === 'APPROVED') ? 'medium' : 'high',
                    recipientRole: 'customer',
                    recipientUser: custId,
                    link: '/customer/payments'
                }).catch(() => {});
            }
        } catch (e) {}

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
            returnUrl,
            notifyUrl 
        } = req.body;
        const customer = req.user || {};

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Valid payment amount is required.' });
        }

        const BookingLodge = require('../models/BookingLodge');
        const Room = require('../models/Room');
        const rawCustId = customer._id || customer.id || req.body.customerId;
        const validCustId = (rawCustId && mongoose.Types.ObjectId.isValid(rawCustId)) ? rawCustId : undefined;

        // Auto-resolve bookingId and roomId if missing or string
        let resolvedBookingId = (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) ? bookingId : undefined;
        let resolvedRoomId = (roomId && mongoose.Types.ObjectId.isValid(roomId)) ? roomId : undefined;

        if (!resolvedRoomId && roomId) {
            const cleanRoomNum = String(roomId).replace(/^room-?/i, '').trim();
            const foundRoom = await Room.findOne({
                $or: [
                    { roomNumber: cleanRoomNum },
                    { roomNumber: String(roomId) },
                    { name: String(roomId) }
                ]
            });
            if (foundRoom) {
                resolvedRoomId = foundRoom._id;
            }
        }

        if (!resolvedBookingId && validCustId) {
            const activeBooking = await BookingLodge.findOne({
                userId: validCustId,
                status: { $nin: ['cancelled', 'checked_out'] }
            }).sort({ createdAt: -1 });
            if (activeBooking) {
                resolvedBookingId = activeBooking._id;
                if (!resolvedRoomId && activeBooking.roomId) {
                    resolvedRoomId = activeBooking.roomId;
                }
            }
        } else if (!resolvedBookingId && resolvedRoomId) {
            const activeBooking = await BookingLodge.findOne({
                roomId: resolvedRoomId,
                status: { $nin: ['cancelled', 'checked_out'] }
            }).sort({ createdAt: -1 });
            if (activeBooking) {
                resolvedBookingId = activeBooking._id;
            }
        }

        // Enforce ownership: verify user owns the project or booking if authenticated
        if (req.user && req.user.role !== 'admin') {
            if (projectId) {
                const Project = require('../models/Project');
                const project = await Project.findById(projectId);
                if (!project) return res.status(404).json({ message: 'Project not found.' });
                if (!project.customerId || project.customerId.toString() !== req.user._id.toString()) {
                    return res.status(403).json({ message: 'Access denied: You do not own this project.' });
                }
            }
            if (resolvedBookingId) {
                const booking = await BookingLodge.findById(resolvedBookingId);
                if (!booking) return res.status(404).json({ message: 'Booking not found.' });
                const bOwner = (booking.userId?._id || booking.userId || '').toString();
                if (bOwner && req.user._id && bOwner !== req.user._id.toString()) {
                    return res.status(403).json({ message: 'Access denied: You do not own this booking.' });
                }
            }
        }

        const orderId = `KE_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
        const customerId = validCustId || req.body.customerId || `guest_${Date.now().toString(36)}`;
        const customerName = name || customer.name || 'Valued Client';
        const customerEmail = email || customer.email || 'customer@krishnaengg.com';
        const customerPhone = phone || customer.phone || customer.phoneNumber || '9447940835';

        const fallbackOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'https://krishnaengineering.vercel.app');
        const effectiveReturnUrl = returnUrl || `${fallbackOrigin}/#/customer/payments?cf_order_id=${orderId}`;

        const orderTags = {};
        if (resolvedBookingId) orderTags.booking_id = String(resolvedBookingId);
        if (resolvedRoomId) orderTags.room_id = String(resolvedRoomId);
        if (validCustId) orderTags.customer_id = String(validCustId);
        if (paymentType) orderTags.payment_type = String(paymentType);

        const orderResult = await cashfreeService.createOrder({
            orderId,
            orderAmount: parseFloat(amount),
            customerId: String(customerId),
            customerName,
            customerEmail,
            customerPhone,
            orderNote: orderNote || `${paymentType} Online Payment for Krishna Engineering / Lodge`,
            returnUrl: effectiveReturnUrl,
            notifyUrl,
            orderTags
        });

        // Pre-create pending payment record in DB with resolved IDs
        await Payment.create({
            customerId: validCustId,
            amount: parseFloat(amount),
            method: 'cashfree',
            referenceId: orderId,
            transactionReference: orderId,
            cfOrderId: orderId,
            paymentDate: new Date(),
            projectId: projectId || undefined,
            quoteId: quoteId || undefined,
            bookingId: resolvedBookingId,
            roomId: resolvedRoomId,
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
            message: err.response?.data?.message || err.message || 'Unable to generate Cashfree payment order.' 
        });
    }
};

/**
 * Helper to reconcile and apply verified Cashfree payment to ledger, projects, and rent bills
 */
async function processConfirmedCashfreeOrder(orderData, successfulPaymentInput = null, reqUser = null, source = 'Cashfree Verification') {
    const orderId = orderData.order_id;
    let successfulPayment = successfulPaymentInput;

    if (!successfulPayment) {
        const paymentsList = await cashfreeService.getOrderPayments(orderId);
        successfulPayment = Array.isArray(paymentsList) 
            ? paymentsList.find(p => (p.payment_status || '').toUpperCase() === 'SUCCESS')
            : null;
    }

    if (!successfulPayment && (orderData.order_status || '').toUpperCase() !== 'PAID') {
        throw new Error(`Order ${orderId} has no successful payment record in Cashfree.`);
    }

    const verifiedAmount = successfulPayment?.payment_amount !== undefined 
        ? parseFloat(successfulPayment.payment_amount) 
        : parseFloat(orderData.order_amount);

    const cfPaymentId = successfulPayment?.cf_payment_id 
        ? String(successfulPayment.cf_payment_id) 
        : String(orderData.cf_order_id || orderId);

    const bankReference = successfulPayment?.bank_reference || '';
    const paymentTime = successfulPayment?.payment_completion_time || successfulPayment?.payment_time;

    // Find existing initiated payment record or create one
    let payment = await Payment.findOne({ 
        $or: [
            { cfPaymentId: cfPaymentId },
            { referenceId: orderId },
            { cfOrderId: orderId },
            { transactionReference: cfPaymentId },
            { transactionReference: orderId }
        ] 
    });

    const orderTags = orderData.order_tags || {};
    const tagBookingId = orderTags.booking_id || orderTags.bookingId;
    const tagRoomId = orderTags.room_id || orderTags.roomId;
    const tagCustomerId = orderTags.customer_id || orderTags.customerId;
    const tagPaymentType = orderTags.payment_type || orderTags.paymentType;

    if (!payment) {
        payment = new Payment({
            customerId: (reqUser && (reqUser._id || reqUser.id)) || (tagCustomerId && mongoose.Types.ObjectId.isValid(tagCustomerId) ? tagCustomerId : undefined),
            amount: verifiedAmount,
            method: 'cashfree',
            referenceId: bankReference || orderId,
            transactionReference: cfPaymentId,
            cfOrderId: String(orderData.cf_order_id || orderId),
            cfPaymentId: cfPaymentId,
            paymentDate: paymentTime ? new Date(paymentTime) : new Date(),
            tenantName: (reqUser && reqUser.name) || orderData.customer_details?.customer_name || 'Client',
            notes: orderData.order_note || 'Cashfree Online Gateway',
            paymentType: tagPaymentType || 'Rent',
            chargeCategory: tagPaymentType || 'Rent',
            bookingId: tagBookingId && mongoose.Types.ObjectId.isValid(tagBookingId) ? tagBookingId : undefined,
            roomId: tagRoomId && mongoose.Types.ObjectId.isValid(tagRoomId) ? tagRoomId : undefined
        });
    }

    // Auto-bind missing bookingId or roomId to tenant's active booking
    const BookingLodge = require('../models/BookingLodge');
    const Room = require('../models/Room');
    let targetBooking = null;

    if (payment.bookingId) {
        targetBooking = await BookingLodge.findById(payment.bookingId).populate('roomId').populate('userId');
    }
    if (!targetBooking && tagBookingId && mongoose.Types.ObjectId.isValid(tagBookingId)) {
        targetBooking = await BookingLodge.findById(tagBookingId).populate('roomId').populate('userId');
    }
    if (!targetBooking && (payment.roomId || tagRoomId)) {
        const rId = payment.roomId || tagRoomId;
        targetBooking = await BookingLodge.findOne({
            roomId: rId,
            status: { $nin: ['cancelled', 'checked_out'] }
        }).populate('roomId').populate('userId').sort({ createdAt: -1 });
    }
    if (!targetBooking && (payment.customerId || tagCustomerId || (reqUser && reqUser._id))) {
        const custId = payment.customerId || tagCustomerId || reqUser._id;
        targetBooking = await BookingLodge.findOne({
            userId: custId,
            status: { $nin: ['cancelled', 'checked_out'] }
        }).populate('roomId').populate('userId').sort({ createdAt: -1 });
    }
    if (!targetBooking && (payment.tenantName || orderData.customer_details?.customer_name)) {
        const tName = payment.tenantName || orderData.customer_details?.customer_name;
        const matchingBookings = await BookingLodge.find({
            status: { $nin: ['cancelled', 'checked_out'] }
        }).populate('roomId').populate('userId').sort({ createdAt: -1 });
        targetBooking = matchingBookings.find(b => 
            (b.userId?.name && b.userId.name.toLowerCase() === tName.toLowerCase()) ||
            (b.tenantName && b.tenantName.toLowerCase() === tName.toLowerCase())
        );
    }

    if (targetBooking) {
        payment.bookingId = targetBooking._id;
        if (!payment.roomId && targetBooking.roomId?._id) {
            payment.roomId = targetBooking.roomId._id;
        }
        if (!payment.customerId && targetBooking.userId) {
            payment.customerId = targetBooking.userId._id || targetBooking.userId;
        }
    }

    // Mark as verified & completed
    payment.status = 'Completed';
    payment.amount = verifiedAmount;
    payment.cfOrderId = String(orderData.cf_order_id || orderId);
    payment.cfPaymentId = cfPaymentId;
    payment.transactionReference = cfPaymentId;
    if (bankReference) {
        payment.referenceId = bankReference;
    }
    payment.verifiedByName = source;
    payment.verifiedAt = new Date();
    if (paymentTime) {
        payment.paymentDate = new Date(paymentTime);
    }
    if (!payment.receiptNumber) {
        payment.receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${cfPaymentId.slice(-4)}`;
    }
    if (!payment.auditLog) payment.auditLog = [];
    payment.auditLog.push({
        action: 'CASHFREE_VERIFIED',
        performedBy: source,
        timestamp: new Date(),
        notes: `Verified ₹${verifiedAmount} via Cashfree (Payment ID: ${cfPaymentId}, Bank Ref: ${bankReference || 'N/A'})`
    });

    await payment.save();

    // Recalculate Project Status if linked to a project
    if (payment.projectId) {
        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        await recalculateProjectPaymentStatus(payment.projectId);
    }

    // Accurate Ledger Reconciliation for Booking & Room
    let remainingBalance = 0;

    if (targetBooking) {
        const rentDue = parseFloat(targetBooking.roomId?.price || targetBooking.totalAmount || 0);
        const originalDeposit = parseFloat(targetBooking.securityDeposit || targetBooking.roomId?.securityDeposit || 0);
        const depositAdjustments = Array.isArray(targetBooking.depositAdjustments) ? targetBooking.depositAdjustments : [];
        const totalDepositAdjusted = depositAdjustments.reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);

        const VERIFIED_STATUSES = ['Completed', 'VERIFIED', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'];
        const verifiedPayments = await Payment.find({
            $or: [
                { bookingId: targetBooking._id },
                { roomId: targetBooking.roomId?._id, customerId: targetBooking.userId?._id || targetBooking.userId }
            ],
            status: { $in: VERIFIED_STATUSES }
        });

        // Deduplicate payments by cfPaymentId or transaction reference
        const seenTx = new Set();
        const uniquePayments = [];
        for (const vp of verifiedPayments) {
            const k = vp.cfPaymentId 
                ? `cf:${vp.cfPaymentId}` 
                : (vp.referenceId && !['CASH', 'MANUAL'].includes(vp.referenceId) ? `ref:${vp.referenceId}` : `id:${vp._id}`);
            if (!seenTx.has(k)) {
                seenTx.add(k);
                uniquePayments.push(vp);
            }
        }

        let rentPaid = 0;
        let depositPaid = 0;
        uniquePayments.forEach(vp => {
            const t = (vp.paymentType || '').toLowerCase();
            const amt = parseFloat(vp.amount) || 0;
            if (t.includes('refund')) {
                // Refund
            } else if (t.includes('rent') && !t.includes('adjustment')) {
                rentPaid += amt;
            } else if (t.includes('deposit') && !t.includes('adjustment')) {
                depositPaid += amt;
            } else if (!t.includes('adjustment')) {
                rentPaid += amt;
            }
        });

        const pType = (payment.paymentType || tagPaymentType || '').toLowerCase();
        if (pType.includes('deposit')) {
            remainingBalance = Math.max(0, originalDeposit - depositPaid);
            targetBooking.securityDeposit = depositPaid;
            await targetBooking.save();
        } else {
            // Rent
            const effectiveRentSettled = rentPaid + totalDepositAdjusted;
            remainingBalance = Math.max(0, rentDue - effectiveRentSettled);
            // Authoritatively persist updated rentPaid & status on targetBooking
            targetBooking.rentPaid = rentPaid;
            if (!targetBooking.status || targetBooking.status === 'cancelled') {
                targetBooking.status = 'active';
            }
            await targetBooking.save();
        }

        payment.outstandingBalance = remainingBalance;
        await payment.save();
    }

    // Settle Lodge Rent Bill if present
    let bill = null;
    const LodgeRentBill = require('../models/LodgeRentBill');
    if (payment.billId) {
        bill = await LodgeRentBill.findById(payment.billId);
    }
    if (!bill && (payment.roomId || payment.bookingId)) {
        bill = await LodgeRentBill.findOne({
            $or: [
                { bookingId: payment.bookingId },
                { roomId: payment.roomId }
            ],
            archived: false,
            status: { $in: ['Due', 'Unpaid', 'Partially Paid'] }
        }).sort({ dueDate: 1 });
    }

    if (bill) {
        const verifiedBillPayments = await Payment.find({
            $or: [
                { billId: bill._id },
                { bookingId: payment.bookingId, paymentType: 'Rent' },
                { roomId: payment.roomId, paymentType: 'Rent' }
            ],
            status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'] }
        });

        const seenBillTx = new Set();
        let totalPaidForBill = 0;
        for (const vbp of verifiedBillPayments) {
            const k = vbp.cfPaymentId 
                ? `cf:${vbp.cfPaymentId}` 
                : (vbp.referenceId && !['CASH', 'MANUAL'].includes(vbp.referenceId) ? `ref:${vbp.referenceId}` : `id:${vbp._id}`);
            if (!seenBillTx.has(k)) {
                seenBillTx.add(k);
                totalPaidForBill += (parseFloat(vbp.amount) || 0);
            }
        }

        const remainingBillBalance = Math.max(0, bill.totalAmount - totalPaidForBill);
        bill.outstandingAmount = remainingBillBalance;
        bill.status = remainingBillBalance === 0 ? 'Paid' : (totalPaidForBill > 0 ? 'Partially Paid' : 'Due');
        if (remainingBillBalance === 0) {
            bill.paymentDate = new Date();
        }
        bill.paymentMethod = 'cashfree';
        bill.transactionId = cfPaymentId;
        await bill.save();

        if (!targetBooking) {
            remainingBalance = remainingBillBalance;
        }
    }

    // Auto-settle payment request if linked
    if (payment.paymentRequestId) {
        const LodgePaymentRequest = require('../models/LodgePaymentRequest');
        await LodgePaymentRequest.findByIdAndUpdate(payment.paymentRequestId, { status: 'PAID' }).catch(() => {});
    }

    // Socket.IO real-time notification
    const socketUtil = require('../utils/socket');
    const io = socketUtil.getIO();
    if (io) {
        io.emit('payment-status-changed', payment);
        io.emit('lodge-payment-updated', payment);
        if (targetBooking) {
            io.emit('booking-financials-updated', {
                bookingId: targetBooking._id,
                remainingBalance,
                status: remainingBalance === 0 ? 'FULLY PAID' : 'PARTIALLY PAID'
            });
        }
    }

    try {
        const { dispatchNotification } = require('../services/notificationDispatcher');
        dispatchNotification({
            title: 'Cashfree Payment Received',
            message: `₹${verifiedAmount} received successfully (Order ID: ${orderId}).`,
            category: 'payment',
            priority: 'high',
            recipientRole: 'admin',
            link: '/admin/finance',
            metadata: { orderId, amount: verifiedAmount, cfPaymentId }
        }).catch(() => {});

        const custId = payment.customerId?._id || payment.customerId;
        if (custId) {
            dispatchNotification({
                title: 'Payment Successful',
                message: `Your payment of ₹${verifiedAmount} has been confirmed. Thank you!`,
                category: 'payment',
                priority: 'medium',
                recipientRole: 'customer',
                recipientUser: custId,
                link: '/customer/payments'
            }).catch(() => {});
        }
    } catch (e) {}

    return { 
        payment, 
        verifiedAmount, 
        cfPaymentId, 
        bankReference,
        remainingBalance, 
        remainingBillBalance: remainingBalance, 
        status: remainingBalance === 0 ? 'FULLY PAID' : 'PARTIALLY PAID',
        bill, 
        booking: targetBooking 
    };
}

/**
 * Protected/Optional: Verify Cashfree PG Order & Complete Payment
 * Authoritatively verifies both order and payment attempt list.
 * Never treats ACTIVE as proof of failure.
 */
exports.verifyCashfreePayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required for verification.' });
        }

        const orderData = await cashfreeService.getOrder(orderId);
        const paymentsList = await cashfreeService.getOrderPayments(orderId);
        const orderStatus = (orderData.order_status || '').toUpperCase(); // PAID, ACTIVE, EXPIRED, TERMINATED

        // Identify successful payments among all attempts (handles multiple payment attempts)
        const successfulPayments = Array.isArray(paymentsList)
            ? paymentsList.filter(p => (p.payment_status || '').toUpperCase() === 'SUCCESS')
            : [];

        const isPaid = orderStatus === 'PAID' || successfulPayments.length > 0;

        if (isPaid) {
            const primaryPayment = successfulPayments[0] || null;
            const { payment, verifiedAmount, cfPaymentId, bankReference, remainingBalance, bill } = 
                await processConfirmedCashfreeOrder(orderData, primaryPayment, req.user, 'Cashfree Gateway Verification');

            const finalStatus = remainingBalance === 0 ? 'FULLY PAID' : 'PARTIALLY PAID';
            return res.json({ 
                success: true, 
                verified: true,
                isPending: false,
                message: `Payment of ₹${verifiedAmount} verified and credited successfully.`, 
                payment,
                cfPaymentId,
                bankReference: bankReference || primaryPayment?.bank_reference || '',
                verifiedAmount,
                remainingBalance,
                remainingBillBalance: remainingBalance,
                status: finalStatus,
                receiptNumber: payment.receiptNumber,
                order: orderData 
            });
        }

        // Check for pending payment attempts or active orders awaiting gateway/bank confirmation
        const hasPendingAttempt = Array.isArray(paymentsList) && 
            paymentsList.some(p => (p.payment_status || '').toUpperCase() === 'PENDING');
        
        const orderCreatedAt = orderData.created_at ? new Date(orderData.created_at) : new Date();
        const orderAgeMinutes = (Date.now() - orderCreatedAt.getTime()) / (60 * 1000);

        // If order is ACTIVE and either has a pending attempt, or was created recently (< 30 min)
        if (orderStatus === 'ACTIVE' && (hasPendingAttempt || orderAgeMinutes < 30 || paymentsList.length === 0)) {
            return res.json({ 
                success: false, 
                verified: false,
                isPending: true,
                orderStatus: 'PENDING',
                gatewayOrderStatus: orderStatus,
                paymentAttemptsCount: paymentsList.length,
                message: 'Payment verification is currently in progress. Your bank is confirming the transaction. Please wait.' 
            });
        }

        // If order ended with failure or expiry, update payment record to prevent lingering waiting state
        if (['EXPIRED', 'FAILED', 'TERMINATED', 'CANCELLED'].includes(orderStatus) || (orderAgeMinutes >= 30 && paymentsList.length > 0)) {
            const payment = await Payment.findOne({ referenceId: orderId });
            if (payment && payment.status === 'WAITING_FOR_VERIFICATION') {
                payment.status = 'Failed';
                payment.rejectionReason = `Cashfree order ended with status ${orderStatus}`;
                await payment.save();
            }
            return res.json({ 
                success: false, 
                verified: false,
                isPending: false,
                orderStatus: 'FAILED',
                gatewayOrderStatus: orderStatus,
                message: `Cashfree order ended with status ${orderStatus}. Payment was not completed.` 
            });
        }

        return res.json({ 
            success: false, 
            verified: false,
            isPending: true,
            orderStatus: 'PENDING',
            gatewayOrderStatus: orderStatus,
            message: `Order status is currently ${orderStatus}. Payment verification in progress.` 
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
 * Verifies HMAC-SHA256 signature using rawBody and re-verifies payment state authoritatively
 */
exports.cashfreeWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBodyStr = req.rawBody ? req.rawBody.toString('utf-8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

        // Verify webhook signature if present
        if (signature && timestamp) {
            try {
                const isValid = await cashfreeService.verifyWebhookSignature(signature, rawBodyStr, timestamp);
                if (!isValid) {
                    console.error('[Cashfree Webhook] Webhook signature mismatch.');
                    return res.status(400).send('Invalid signature');
                }
            } catch (sigErr) {
                console.error('[Cashfree Webhook] Signature verification error:', sigErr.message);
                return res.status(400).send('Invalid signature');
            }
        }

        const payload = req.body || {};
        const { type, data } = payload;
        const orderId = data?.order?.order_id || payload.order_id;
        console.log('[Cashfree Webhook Received]:', type, orderId);

        if (orderId) {
            if (type === 'PAYMENT_SUCCESS_WEBHOOK' || data?.order?.order_status === 'PAID' || data?.payment?.payment_status === 'SUCCESS') {
                // Idempotency check: if order is already processed as Completed, return 200 without duplicate action
                const existingCompletedPayment = await Payment.findOne({
                    $or: [
                        { referenceId: orderId, status: { $in: ['Completed', 'VERIFIED'] } },
                        { cfOrderId: orderId, status: { $in: ['Completed', 'VERIFIED'] } }
                    ]
                });

                if (existingCompletedPayment && existingCompletedPayment.bookingId) {
                    console.log(`[Cashfree Webhook] Order ${orderId} already reconciled. Idempotent return.`);
                    return res.status(200).send('ALREADY_PROCESSED');
                }

                // Re-verify order from backend authoritative API before fulfillment
                try {
                    const verifiedOrder = await cashfreeService.getOrder(orderId);
                    const paymentsList = await cashfreeService.getOrderPayments(orderId);
                    const successfulPayments = Array.isArray(paymentsList)
                        ? paymentsList.filter(p => (p.payment_status || '').toUpperCase() === 'SUCCESS')
                        : [];

                    if ((verifiedOrder.order_status || '').toUpperCase() === 'PAID' || successfulPayments.length > 0) {
                        const primaryPayment = successfulPayments[0] || null;
                        await processConfirmedCashfreeOrder(verifiedOrder, primaryPayment, null, 'Cashfree Webhook');
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

/**
 * Reconcile single order or pending Cashfree payments against Authoritative Gateway
 * POST /api/payments/cashfree/reconcile
 */
exports.reconcileCashfreePayments = async (req, res) => {
    try {
        const { orderId, bookingId } = req.body || {};
        const results = [];

        // Single order reconciliation (e.g. KE_1794901217991_560)
        if (orderId) {
            try {
                const orderData = await cashfreeService.getOrder(orderId);
                const paymentsList = await cashfreeService.getOrderPayments(orderId);
                const orderStatus = (orderData.order_status || '').toUpperCase();
                const successfulPayments = Array.isArray(paymentsList)
                    ? paymentsList.filter(pay => (pay.payment_status || '').toUpperCase() === 'SUCCESS')
                    : [];

                if (orderStatus === 'PAID' || successfulPayments.length > 0) {
                    const primaryPayment = successfulPayments[0] || null;
                    const reconciliation = await processConfirmedCashfreeOrder(orderData, primaryPayment, req.user, 'Cashfree Reconciliation Tool');
                    return res.json({
                        success: true,
                        reconciled: true,
                        orderId,
                        message: `Order ${orderId} successfully reconciled! Payment credited and ledger updated.`,
                        reconciliation
                    });
                } else {
                    return res.json({
                        success: false,
                        reconciled: false,
                        orderId,
                        orderStatus,
                        paymentAttemptsCount: paymentsList.length,
                        message: `Order ${orderId} has status ${orderStatus} without confirmed payment.`
                    });
                }
            } catch (err) {
                return res.status(500).json({ success: false, message: `Reconciliation failed for ${orderId}: ${err.message}` });
            }
        }

        // Batch reconciliation for pending payments
        const query = { method: 'cashfree' };
        if (bookingId) {
            query.bookingId = bookingId;
        } else {
            query.status = { $in: ['WAITING_FOR_VERIFICATION', 'Pending', 'pending', 'ACTIVE'] };
        }

        const candidatePayments = await Payment.find(query).limit(50);
        for (const p of candidatePayments) {
            const ordId = p.cfOrderId || p.referenceId;
            if (!ordId) continue;
            try {
                const orderData = await cashfreeService.getOrder(ordId);
                const paymentsList = await cashfreeService.getOrderPayments(ordId);
                const orderStatus = (orderData.order_status || '').toUpperCase();
                const successfulPayments = Array.isArray(paymentsList)
                    ? paymentsList.filter(pay => (pay.payment_status || '').toUpperCase() === 'SUCCESS')
                    : [];

                if (orderStatus === 'PAID' || successfulPayments.length > 0) {
                    const primaryPayment = successfulPayments[0] || null;
                    const reconciliation = await processConfirmedCashfreeOrder(orderData, primaryPayment, req.user, 'Batch Reconciliation');
                    results.push({ orderId: ordId, status: 'RECONCILED_SUCCESS', verifiedAmount: reconciliation.verifiedAmount });
                } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(orderStatus)) {
                    p.status = 'Failed';
                    p.rejectionReason = `Cashfree confirmed order ${orderStatus}`;
                    await p.save();
                    results.push({ orderId: ordId, status: 'RECONCILED_FAILED' });
                } else {
                    results.push({ orderId: ordId, status: 'RECONCILED_PENDING' });
                }
            } catch (err) {
                results.push({ orderId: ordId, status: 'ERROR', message: err.message });
            }
        }

        res.json({
            success: true,
            message: `Reconciliation batch completed for ${candidatePayments.length} record(s).`,
            reconciledCount: results.filter(r => r.status === 'RECONCILED_SUCCESS').length,
            results
        });
    } catch (err) {
        console.error('Reconciliation error:', err);
        res.status(500).json({ message: err.message });
    }
};



