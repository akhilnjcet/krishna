const LodgePaymentSetting = require('../models/LodgePaymentSetting');
const LodgePaymentRequest = require('../models/LodgePaymentRequest');
const Payment = require('../models/Payment');
const LodgeRentBill = require('../models/LodgeRentBill');
const Room = require('../models/Room');
const BookingLodge = require('../models/BookingLodge');
const User = require('../models/User');
const socketUtil = require('../utils/socket');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// Get Admin Payment Settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await LodgePaymentSetting.findOne();
    if (!settings) {
      settings = await LodgePaymentSetting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment settings', error: error.message });
  }
};

// Save Admin Payment Settings
exports.saveSettings = async (req, res) => {
  try {
    let settings = await LodgePaymentSetting.findOne();
    if (!settings) {
      settings = new LodgePaymentSetting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    // Cross-model synchronization for appSettings.upiId in LodgeData
    if (req.body && req.body.upiId) {
      const LodgeData = require('../models/LodgeData');
      await LodgeData.updateMany({}, { $set: { 'appSettings.upiId': req.body.upiId } }).catch(err => {
        console.warn('[SETTINGS-SYNC] LodgeData upiId sync warning:', err.message);
      });
    }

    res.json({ message: 'Payment settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save payment settings', error: error.message });
  }
};

// Submit Tenant Payment
exports.submitPayment = async (req, res) => {
  try {
    const customerId = req.user._id || req.user.id;
    const {
      bookingId,
      roomId,
      billId,
      invoiceNumber,
      paymentType = 'Rent',
      chargeCategory = 'Rent',
      amount,
      paymentMethod = 'UPI QR',
      referenceId,
      notes,
      uploadedProof,
      billingPeriodStart,
      billingPeriodEnd,
      billingCycle,
      previousDue = 0,
      outstandingBalance = 0,
      advanceBalance = 0,
      additionalCharges = [],
      grandTotal,
      paymentRequestId
    } = req.body;

    const finalAmount = parseFloat(amount || grandTotal || 0);
    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount specified.' });
    }

    const payloadRaw = JSON.stringify(req.body);

    const payment = await Payment.create({
      customerId,
      tenantName: req.user.name || 'Tenant',
      name: req.user.name,
      amount: finalAmount,
      method: paymentMethod,
      referenceId: referenceId || `REF-${Date.now().toString(36).toUpperCase()}`,
      transactionReference: referenceId || `TXN-${Date.now()}`,
      status: 'WAITING_FOR_VERIFICATION',
      bookingId: bookingId || undefined,
      roomId: roomId || undefined,
      billId: billId || undefined,
      invoiceNumber: invoiceNumber || (billId ? `INV-${billId.toString().slice(-6)}` : undefined),
      paymentType,
      chargeCategory,
      billingPeriodStart: billingPeriodStart || undefined,
      billingPeriodEnd: billingPeriodEnd || undefined,
      billingCycle: billingCycle || 'Monthly',
      previousDue: parseFloat(previousDue || 0),
      outstandingBalance: parseFloat(outstandingBalance || 0),
      advanceBalance: parseFloat(advanceBalance || 0),
      additionalCharges: Array.isArray(additionalCharges) ? additionalCharges : [],
      grandTotal: parseFloat(grandTotal || finalAmount),
      uploadedProof: uploadedProof || undefined,
      notes: notes || undefined,
      paymentRequestId: paymentRequestId || undefined,
      originalJson: payloadRaw,
      auditLog: [{
        action: 'SUBMITTED',
        performedBy: req.user.name || 'Tenant',
        notes: `Payment of ₹${finalAmount} submitted via ${paymentMethod}.`
      }]
    });

    // Update payment request status if linked
    if (paymentRequestId) {
      await LodgePaymentRequest.findByIdAndUpdate(paymentRequestId, { status: 'PENDING' });
    }

    // Socket IO notification
    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-submitted', payment);
      io.emit('payment-status-changed', payment);
    }

    res.status(201).json({ message: 'Payment submitted successfully for verification.', payment });
  } catch (error) {
    console.error('Lodge payment submission error:', error);
    res.status(500).json({ message: 'Error submitting payment', error: error.message });
  }
};

// Get My Lodge Payments & Requests
exports.getMyPayments = async (req, res) => {
  try {
    const customerId = req.user._id || req.user.id;
    const payments = await Payment.find({ customerId, roomId: { $ne: null } })
      .populate('roomId', 'roomNumber type')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    const requests = await LodgePaymentRequest.find({ customerId })
      .populate('roomId', 'roomNumber type')
      .sort({ createdAt: -1 });

    res.json({ payments, requests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tenant payment records', error: error.message });
  }
};

// Get All Lodge Payments (Admin)
exports.getAllPayments = async (req, res) => {
  try {
    const { search, status, paymentMethod, dateRange } = req.query;
    const query = { roomId: { $ne: null } };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      query.method = paymentMethod;
    }

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const uIds = users.map(u => u._id);

      query.$or = [
        { referenceId: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerId: { $in: uIds } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone')
      .populate('roomId', 'roomNumber type')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lodge payments', error: error.message });
  }
};

// Verify Lodge Payment (Approve / Reject)
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, remarks } = req.body; // VERIFIED, REJECTED, INFO_REQUESTED
    const adminUser = req.user;

    const payment = await Payment.findById(id).populate('customerId').populate('roomId');
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    payment.status = status;
    payment.verifiedBy = adminUser._id || adminUser.id;
    payment.verifiedByName = adminUser.name || adminUser.username || 'Admin';
    payment.verifiedAt = new Date();

    if (status === 'VERIFIED' || status === 'Completed' || status === 'APPROVED') {
      payment.status = 'VERIFIED';
      payment.receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      payment.rejectionReason = undefined;

      // Update associated LodgeRentBill if present
      if (payment.billId) {
        await LodgeRentBill.findByIdAndUpdate(payment.billId, {
          status: 'Paid',
          paymentDate: new Date(),
          paymentMethod: payment.method,
          transactionId: payment.referenceId,
          outstandingAmount: 0
        });
      } else if (payment.roomId && payment.customerId) {
        await LodgeRentBill.findOneAndUpdate(
          { roomId: payment.roomId, userId: payment.customerId._id || payment.customerId, status: 'Due' },
          { status: 'Paid', paymentDate: new Date(), paymentMethod: payment.method, transactionId: payment.referenceId, outstandingAmount: 0 }
        );
      }

      // If linked to payment request, mark paid
      if (payment.paymentRequestId) {
        await LodgePaymentRequest.findByIdAndUpdate(payment.paymentRequestId, { status: 'PAID' });
      }

      payment.auditLog.push({
        action: 'VERIFIED',
        performedBy: adminUser.name || 'Admin',
        notes: `Payment verified & receipt ${payment.receiptNumber} issued.`
      });

      // Send WhatsApp confirmation
      const phone = payment.customerId?.phone || payment.customerId?.phoneNumber;
      if (phone) {
        const msg = `Hello ${payment.customerId.name || 'Tenant'},\n\nYour payment of ₹${payment.amount} (Ref: ${payment.referenceId || 'N/A'}) for Room ${payment.roomId?.roomNumber || 'Residence'} has been VERIFIED successfully.\nReceipt No: ${payment.receiptNumber}\n\nThank you,\nKrishna Engineering & Lodge Manager`;
        sendWhatsAppMessage(phone, msg).catch(err => console.error('WhatsApp Error:', err));
      }
    } else if (status === 'REJECTED' || status === 'Failed') {
      payment.status = 'REJECTED';
      payment.rejectionReason = rejectionReason || remarks || 'Payment verification failed.';

      payment.auditLog.push({
        action: 'REJECTED',
        performedBy: adminUser.name || 'Admin',
        notes: `Payment rejected. Reason: ${payment.rejectionReason}`
      });

      // Send WhatsApp rejection alert
      const phone = payment.customerId?.phone || payment.customerId?.phoneNumber;
      if (phone) {
        const msg = `Hello ${payment.customerId.name || 'Tenant'},\n\nYour payment submission of ₹${payment.amount} (Ref: ${payment.referenceId || 'N/A'}) was REJECTED.\nReason: ${payment.rejectionReason}\n\nPlease submit a new payment proof or contact admin.`;
        sendWhatsAppMessage(phone, msg).catch(err => console.error('WhatsApp Error:', err));
      }
    }

    await payment.save();

    // Socket IO broadcast
    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-updated', payment);
      io.emit('payment-status-changed', payment);
    }

    res.json({ message: `Payment ${payment.status} successfully.`, payment });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};

// Create Payment Request (Admin)
exports.createPaymentRequest = async (req, res) => {
  try {
    const { roomId, bookingId, customerId, amount, dueDate, reason, lateFee = 0, additionalCharges = [], customMessage } = req.body;
    
    if (!roomId || !customerId || !amount || !dueDate || !reason) {
      return res.status(400).json({ message: 'Please provide room, customer, amount, due date, and reason.' });
    }

    const reqCount = await LodgePaymentRequest.countDocuments();
    const requestNumber = `PR-${new Date().getFullYear()}-${(reqCount + 1001).toString()}`;

    const newReq = await LodgePaymentRequest.create({
      requestNumber,
      roomId,
      bookingId: bookingId || undefined,
      customerId,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      reason,
      lateFee: parseFloat(lateFee || 0),
      additionalCharges,
      customMessage,
      createdBy: req.user._id || req.user.id
    });

    const user = await User.findById(customerId);
    const phone = user?.phone || user?.phoneNumber;
    if (phone) {
      const msg = `Hello ${user.name || 'Tenant'},\n\nA new payment request (${requestNumber}) of ₹${amount} has been issued for your residency.\nReason: ${reason}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nPlease login to Krishna Portal to make payment.`;
      sendWhatsAppMessage(phone, msg).catch(err => console.error('WhatsApp dispatch fail:', err));
    }

    res.status(201).json({ message: 'Payment request generated successfully', request: newReq });
  } catch (error) {
    res.status(500).json({ message: 'Error generating payment request', error: error.message });
  }
};

// Get Dashboard Financial Stats
exports.getPaymentStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    // Today's verified collections
    const todayPayments = await Payment.find({
      status: 'VERIFIED',
      verifiedAt: { $gte: startOfToday },
      roomId: { $ne: null }
    });
    const todaysCollections = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    // Pending verification count & sum
    const pendingPayments = await Payment.find({
      status: 'WAITING_FOR_VERIFICATION',
      roomId: { $ne: null }
    });
    const pendingCount = pendingPayments.length;
    const pendingAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

    // Verified payments this month
    const monthPayments = await Payment.find({
      status: 'VERIFIED',
      verifiedAt: { $gte: startOfMonth },
      roomId: { $ne: null }
    });
    const monthlyRevenue = monthPayments.reduce((acc, p) => acc + p.amount, 0);

    // Rejected count
    const rejectedCount = await Payment.countDocuments({
      status: 'REJECTED',
      roomId: { $ne: null }
    });

    // Outstanding Rent Amount
    const dueBills = await LodgeRentBill.find({ status: 'Due', archived: false });
    const outstandingRent = dueBills.reduce((acc, b) => acc + (b.totalAmount || b.rentAmount || 0), 0);

    // Advance collections
    const advancePayments = await Payment.find({
      paymentType: 'Advance',
      status: 'VERIFIED',
      roomId: { $ne: null }
    });
    const advanceCollections = advancePayments.reduce((acc, p) => acc + p.amount, 0);

    res.json({
      todaysCollections,
      pendingCount,
      pendingAmount,
      monthlyRevenue,
      rejectedCount,
      outstandingRent,
      advanceCollections
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating payment statistics', error: error.message });
  }
};
