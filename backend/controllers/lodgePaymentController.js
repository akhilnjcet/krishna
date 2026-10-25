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

      // Update associated LodgeRentBill with accurate balance reconciliation
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
        bill.transactionId = payment.referenceId;
        await bill.save();
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

    const VERIFIED_STATUSES = ['VERIFIED', 'Completed', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'];

    // Today's verified collections
    const todayPayments = await Payment.find({
      status: { $in: VERIFIED_STATUSES },
      verifiedAt: { $gte: startOfToday },
      roomId: { $ne: null }
    });
    const todaysCollections = todayPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    // Pending verification count & sum
    const pendingPayments = await Payment.find({
      status: 'WAITING_FOR_VERIFICATION',
      roomId: { $ne: null }
    });
    const pendingCount = pendingPayments.length;
    const pendingAmount = pendingPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    // Verified payments this month
    const monthPayments = await Payment.find({
      status: { $in: VERIFIED_STATUSES },
      verifiedAt: { $gte: startOfMonth },
      roomId: { $ne: null }
    });
    const monthlyRevenue = monthPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    // Rejected count
    const rejectedCount = await Payment.countDocuments({
      status: 'REJECTED',
      roomId: { $ne: null }
    });

    // Outstanding Rent Amount (including partially paid bills)
    const dueBills = await LodgeRentBill.find({ status: { $in: ['Due', 'Unpaid', 'Partially Paid'] }, archived: false });
    const outstandingRent = dueBills.reduce((acc, b) => acc + (b.outstandingAmount !== undefined ? b.outstandingAmount : (b.totalAmount || b.rentAmount || 0)), 0);

    // Advance collections
    const advancePayments = await Payment.find({
      paymentType: 'Advance',
      status: { $in: VERIFIED_STATUSES },
      roomId: { $ne: null }
    });
    const advanceCollections = advancePayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

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

// Get Detailed Booking Financials with Line Items & Deposit Adjustments
exports.getBookingFinancials = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingLodge.findById(bookingId)
      .populate('roomId')
      .populate('lodgeId')
      .populate('userId', 'name email phone phoneNumber');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Rent
    const rentDue = parseFloat(booking.roomId?.price || booking.totalAmount || 0);

    // Security Deposit
    const originalDeposit = parseFloat(booking.securityDeposit || booking.roomId?.securityDeposit || 0);

    // Deposit Adjustments already recorded
    const depositAdjustments = Array.isArray(booking.depositAdjustments) ? booking.depositAdjustments : [];
    const totalDepositAdjusted = depositAdjustments.reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);

    // Extra Charges
    const extraCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];

    // Fetch payments for this booking
    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });

    // Sum paid amounts by category - ONLY count strictly verified/completed payments!
    const VERIFIED_STATUSES = ['Completed', 'VERIFIED', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'];
    const validPayments = payments.filter(p => VERIFIED_STATUSES.includes(p.status));

    let rentPaid = 0;
    let depositPaid = 0;
    let rentRefunded = 0;
    let depositRefunded = 0;
    let totalRefunded = 0;
    const extraChargesPaidMap = {};
    const refundsList = [];

    validPayments.forEach(p => {
      const type = (p.paymentType || '').toLowerCase();
      const amt = parseFloat(p.amount) || 0;
      if (type.includes('refund')) {
        totalRefunded += amt;
        refundsList.push(p);
        const cat = (p.chargeCategory || p.notes || '').toLowerCase();
        if (cat.includes('deposit')) {
          depositRefunded += amt;
        } else {
          rentRefunded += amt;
        }
      } else if (type.includes('rent') && !type.includes('adjustment')) {
        rentPaid += amt;
      } else if (type.includes('deposit') && !type.includes('adjustment')) {
        depositPaid += amt;
      } else if (type.includes('additional') || type.includes('extra') || type.includes('service')) {
        const cat = p.chargeCategory || 'Other';
        extraChargesPaidMap[cat] = (extraChargesPaidMap[cat] || 0) + amt;
      } else if (!type.includes('adjustment')) {
        rentPaid += amt;
      }
    });

    // Net values after accounting for refunds
    const netRentPaid = Math.max(0, rentPaid - rentRefunded);
    const netDepositPaid = Math.max(0, depositPaid - depositRefunded);
    const effectiveRentSettled = netRentPaid + totalDepositAdjusted;
    const remainingRent = Math.max(0, rentDue - effectiveRentSettled);

    // Available deposit held after adjustments and refunds
    const availableDeposit = Math.max(0, originalDeposit - totalDepositAdjusted - depositRefunded);
    const remainingDeposit = Math.max(0, originalDeposit - depositPaid);

    // Calculate extra charges items
    const extraChargesList = extraCharges.map(ec => {
      const amt = parseFloat(ec.amount) || 0;
      const paid = parseFloat(ec.paidAmount || extraChargesPaidMap[ec.name] || 0);
      const rem = Math.max(0, amt - paid);
      return {
        id: ec.id || ec._id,
        name: ec.name,
        due: amt,
        paid,
        remaining: rem,
        status: rem === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Payment Due'),
        dateAdded: ec.dateAdded,
        notes: ec.notes
      };
    });

    const totalExtraDue = extraChargesList.reduce((sum, ec) => sum + ec.due, 0);
    const totalExtraPaid = extraChargesList.reduce((sum, ec) => sum + ec.paid, 0);
    const totalExtraRemaining = extraChargesList.reduce((sum, ec) => sum + ec.remaining, 0);

    // Overall Totals
    const overallTotalDue = rentDue + originalDeposit + totalExtraDue;
    const overallTotalPaid = rentPaid + depositPaid + totalExtraPaid;
    const netOverallPaid = Math.max(0, overallTotalPaid - totalRefunded);
    const overallTotalRemaining = remainingRent + remainingDeposit + totalExtraRemaining;

    // Overall Status
    let overallStatus = 'Payment Due';
    if (overallTotalRemaining === 0) {
      overallStatus = 'Fully Paid';
    } else if (overallTotalPaid > 0 || totalDepositAdjusted > 0) {
      overallStatus = 'Partially Paid';
    }

    res.json({
      booking: {
        _id: booking._id,
        agreementNumber: booking.agreementNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        actualCheckOut: booking.actualCheckOut,
        checkoutNotes: booking.checkoutNotes,
        checkedOutBy: booking.checkedOutBy,
        status: booking.status,
        tenantName: booking.userId?.name || 'Valued Tenant',
        tenantPhone: booking.userId?.phone || booking.userId?.phoneNumber,
        tenantEmail: booking.userId?.email,
        roomNumber: booking.roomId?.roomNumber || 'Suite',
        roomType: booking.roomId?.type || 'Room',
        lodgeName: booking.lodgeId?.name || 'Krishna Lodge',
      },
      lineItems: {
        rent: {
          due: rentDue,
          paid: rentPaid,
          refunded: rentRefunded,
          netPaid: netRentPaid,
          adjusted: totalDepositAdjusted,
          effectiveSettled: effectiveRentSettled,
          remaining: remainingRent,
          status: remainingRent === 0 ? 'Fully Paid' : (effectiveRentSettled > 0 ? 'Partially Paid' : 'Payment Due')
        },
        securityDeposit: {
          original: originalDeposit,
          due: originalDeposit,
          paid: depositPaid,
          refunded: depositRefunded,
          netPaid: netDepositPaid,
          usedForRent: totalDepositAdjusted,
          available: availableDeposit,
          remaining: remainingDeposit,
          status: remainingDeposit === 0 ? 'Fully Paid' : (depositPaid > 0 ? 'Partially Paid' : 'Payment Due')
        },
        extraCharges: extraChargesList,
        extraChargesSummary: {
          due: totalExtraDue,
          paid: totalExtraPaid,
          remaining: totalExtraRemaining,
          status: totalExtraRemaining === 0 && totalExtraDue > 0 ? 'Fully Paid' : (totalExtraPaid > 0 ? 'Partially Paid' : (totalExtraDue > 0 ? 'Payment Due' : 'None'))
        }
      },
      overall: {
        totalDue: overallTotalDue,
        totalPaid: overallTotalPaid,
        totalRefunded: totalRefunded,
        netPaid: netOverallPaid,
        totalAdjusted: totalDepositAdjusted,
        totalRemaining: overallTotalRemaining,
        status: overallStatus
      },
      adjustments: depositAdjustments,
      refunds: refundsList,
      payments
    });
  } catch (error) {
    console.error('getBookingFinancials error:', error);
    res.status(500).json({ message: 'Error retrieving booking financials', error: error.message });
  }
};

// Adjust rent from security deposit (Owner / Admin)
exports.adjustRentFromDeposit = async (req, res) => {
  try {
    const { bookingId, amount, reason, rentPeriod } = req.body;
    const adjAmount = parseFloat(amount);

    if (!adjAmount || adjAmount <= 0) {
      return res.status(400).json({ message: 'Please specify a valid adjustment amount greater than zero.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason for adjustment is required.' });
    }
    if (!rentPeriod || !rentPeriod.trim()) {
      return res.status(400).json({ message: 'Rent period covered is required.' });
    }

    const booking = await BookingLodge.findById(bookingId)
      .populate('roomId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Calculate current available deposit and unpaid rent
    const originalDeposit = parseFloat(booking.securityDeposit || booking.roomId?.securityDeposit || 0);
    const existingAdjustments = Array.isArray(booking.depositAdjustments) ? booking.depositAdjustments : [];
    const totalAdjusted = existingAdjustments.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const availableDeposit = Math.max(0, originalDeposit - totalAdjusted);

    if (adjAmount > availableDeposit) {
      return res.status(400).json({ 
        message: `Adjustment amount (₹${adjAmount.toLocaleString()}) cannot exceed available security deposit of ₹${availableDeposit.toLocaleString()}.` 
      });
    }

    // Calculate unpaid rent
    const rentDue = parseFloat(booking.roomId?.price || booking.totalAmount || 0);
    const rentPayments = await Payment.find({
      bookingId: booking._id,
      paymentType: 'Rent',
      status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid', 'APPROVED', 'verified', 'completed'] }
    });
    const rentPaidDirectly = rentPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const unpaidRent = Math.max(0, rentDue - rentPaidDirectly - totalAdjusted);

    if (adjAmount > unpaidRent) {
      return res.status(400).json({ 
        message: `Adjustment amount (₹${adjAmount.toLocaleString()}) cannot exceed unpaid rent of ₹${unpaidRent.toLocaleString()}.` 
      });
    }

    // Create adjustment entry
    const adjustmentEntry = {
      adjustmentId: `ADJ-${Date.now().toString(36).toUpperCase()}`,
      amount: adjAmount,
      date: new Date(),
      reason: reason.trim(),
      rentPeriod: rentPeriod.trim(),
      performedBy: req.user.name || 'Owner'
    };

    if (!Array.isArray(booking.depositAdjustments)) {
      booking.depositAdjustments = [];
    }
    booking.depositAdjustments.push(adjustmentEntry);
    await booking.save();

    // Create verified Payment record for audit log and transaction history
    const adjPayment = await Payment.create({
      customerId: booking.userId?._id || booking.userId,
      tenantName: booking.userId?.name || 'Tenant',
      name: booking.userId?.name,
      amount: adjAmount,
      method: 'Security Deposit',
      referenceId: adjustmentEntry.adjustmentId,
      transactionReference: adjustmentEntry.adjustmentId,
      status: 'VERIFIED',
      bookingId: booking._id,
      roomId: booking.roomId?._id || booking.roomId,
      paymentType: 'Deposit Adjustment',
      chargeCategory: 'Rent (Deposit Adjustment)',
      billingPeriodStart: booking.checkIn,
      billingPeriodEnd: booking.checkOut,
      receiptNumber: `ADJ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      notes: `Adjusted rent from security deposit. Reason: ${reason}. Period: ${rentPeriod}`,
      auditLog: [{
        action: 'DEPOSIT_ADJUSTMENT',
        performedBy: req.user.name || 'Owner',
        timestamp: new Date(),
        notes: `Adjusted ₹${adjAmount} from security deposit for rent period ${rentPeriod}. Reason: ${reason}`
      }]
    });

    // Real-time broadcast
    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-updated', adjPayment);
      io.emit('payment-status-changed', adjPayment);
    }

    res.json({
      message: `Successfully adjusted ₹${adjAmount.toLocaleString()} from security deposit toward rent.`,
      adjustment: adjustmentEntry,
      payment: adjPayment
    });
  } catch (error) {
    console.error('adjustRentFromDeposit error:', error);
    res.status(500).json({ message: 'Error adjusting rent from deposit', error: error.message });
  }
};

// Add Additional Utility / Service Charge (Owner / Admin)
exports.addExtraCharge = async (req, res) => {
  try {
    const { bookingId, name, amount, notes } = req.body;
    const chargeAmt = parseFloat(amount);

    if (!bookingId || !name || !chargeAmt || chargeAmt <= 0) {
      return res.status(400).json({ message: 'Please provide valid charge name and amount.' });
    }

    const booking = await BookingLodge.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const newCharge = {
      id: `CHG-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      amount: chargeAmt,
      paidAmount: 0,
      notes: notes || undefined,
      dateAdded: new Date()
    };

    if (!Array.isArray(booking.extraCharges)) {
      booking.extraCharges = [];
    }
    booking.extraCharges.push(newCharge);
    await booking.save();

    // Real-time broadcast
    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-updated', { bookingId, newCharge });
    }

    res.json({
      message: `Additional charge '${name}' (₹${chargeAmt.toLocaleString()}) added successfully.`,
      charge: newCharge,
      extraCharges: booking.extraCharges
    });
  } catch (error) {
    console.error('addExtraCharge error:', error);
    res.status(500).json({ message: 'Error adding extra charge', error: error.message });
  }
};

// Add / Set / Update Security Deposit for a Booking (Admin / Owner)
exports.manageSecurityDeposit = async (req, res) => {
  try {
    const { bookingId, amount, mode = 'add', notes = '' } = req.body;
    const depAmount = parseFloat(amount);

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required.' });
    }
    if (isNaN(depAmount) || depAmount < 0) {
      return res.status(400).json({ message: 'Please provide a valid security deposit amount (0 or greater).' });
    }

    const booking = await BookingLodge.findById(bookingId)
      .populate('roomId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const previousDeposit = parseFloat(booking.securityDeposit || booking.roomId?.securityDeposit || 0);
    let newDeposit = 0;

    if (mode === 'add') {
      newDeposit = previousDeposit + depAmount;
    } else {
      // mode === 'set'
      newDeposit = depAmount;
    }

    booking.securityDeposit = newDeposit;

    if (!Array.isArray(booking.versionHistory)) {
      booking.versionHistory = [];
    }
    booking.versionHistory.push({
      version: (booking.acknowledgementVersion || 1) + 1,
      generatedAt: new Date(),
      reason: `Security Deposit updated to ₹${newDeposit.toLocaleString()} (${mode === 'add' ? `Added ₹${depAmount.toLocaleString()}` : `Set to ₹${depAmount.toLocaleString()}`}) by ${req.user?.name || 'Admin'}. ${notes ? `Notes: ${notes}` : ''}`.trim()
    });
    booking.acknowledgementVersion = (booking.acknowledgementVersion || 1) + 1;

    await booking.save();

    // Broadcast update via socket
    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-updated', {
        bookingId: booking._id,
        securityDeposit: newDeposit,
        action: 'SECURITY_DEPOSIT_UPDATED'
      });
      io.emit('booking-updated', booking);
    }

    res.json({
      message: `Security deposit successfully updated to ₹${newDeposit.toLocaleString()}.`,
      securityDeposit: newDeposit,
      previousDeposit,
      booking
    });
  } catch (error) {
    console.error('manageSecurityDeposit error:', error);
    res.status(500).json({ message: 'Failed to update security deposit', error: error.message });
  }
};

// Record Admin Payment Directly
exports.recordAdminPayment = async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentType = 'Rent',
      chargeCategory = 'Rent',
      method = 'Cash',
      referenceId,
      paymentDate,
      notes
    } = req.body;

    const finalAmount = parseFloat(amount);
    if (!bookingId || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: 'Valid booking ID and payment amount greater than zero are required.' });
    }

    const booking = await BookingLodge.findById(bookingId).populate('roomId').populate('userId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const effectiveDate = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await Payment.create({
      customerId: booking.userId?._id || booking.userId,
      tenantName: booking.userId?.name || 'Resident',
      name: booking.userId?.name || 'Resident',
      amount: finalAmount,
      method: method || 'Cash',
      referenceId: referenceId || `ADMIN-${Date.now().toString(36).toUpperCase()}`,
      transactionReference: referenceId || `ADMIN-${Date.now()}`,
      status: 'VERIFIED',
      bookingId: booking._id,
      roomId: booking.roomId?._id || booking.roomId,
      paymentType,
      chargeCategory: chargeCategory || paymentType,
      billingPeriodStart: booking.checkIn,
      billingPeriodEnd: booking.checkOut,
      receiptNumber,
      paymentDate: effectiveDate,
      notes: notes || undefined,
      verifiedByName: req.user.name || 'Administrator',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      auditLog: [{
        action: 'ADMIN_RECORDED',
        performedBy: req.user.name || 'Administrator',
        timestamp: new Date(),
        notes: `Direct payment of ₹${finalAmount.toLocaleString()} recorded by admin via ${method}. Type: ${paymentType}. Ref: ${referenceId || 'N/A'}. Notes: ${notes || 'None'}`
      }]
    });

    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-submitted', payment);
      io.emit('lodge-payment-updated', payment);
      io.emit('payment-status-changed', payment);
    }

    res.status(201).json({
      message: `Payment of ₹${finalAmount.toLocaleString()} recorded successfully.`,
      payment
    });
  } catch (error) {
    console.error('recordAdminPayment error:', error);
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
};

// Correct Payment Record with Mandatory Reason & Audit History
exports.correctPayment = async (req, res) => {
  try {
    const paymentId = req.params.paymentId || req.body.paymentId;
    const { amount, paymentType, chargeCategory, method, referenceId, paymentDate, reason, notes } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A correction reason is strictly required.' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    const oldValues = {
      amount: payment.amount,
      paymentType: payment.paymentType,
      chargeCategory: payment.chargeCategory,
      method: payment.method,
      referenceId: payment.referenceId,
      paymentDate: payment.paymentDate,
      notes: payment.notes
    };

    if (amount !== undefined && !isNaN(parseFloat(amount))) {
      payment.amount = parseFloat(amount);
    }
    if (paymentType) payment.paymentType = paymentType;
    if (chargeCategory) payment.chargeCategory = chargeCategory;
    if (method) payment.method = method;
    if (referenceId !== undefined) payment.referenceId = referenceId;
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (notes !== undefined) payment.notes = notes;

    if (!Array.isArray(payment.auditLog)) {
      payment.auditLog = [];
    }
    payment.auditLog.push({
      action: 'CORRECTED',
      performedBy: req.user.name || 'Administrator',
      timestamp: new Date(),
      notes: `Corrected by Admin. Reason: ${reason.trim()}. Previous: [₹${oldValues.amount}, ${oldValues.paymentType}, ${oldValues.method}, Ref: ${oldValues.referenceId || 'N/A'}]. New: [₹${payment.amount}, ${payment.paymentType}, ${payment.method}, Ref: ${payment.referenceId || 'N/A'}]`
    });

    await payment.save();

    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-updated', payment);
      io.emit('payment-status-changed', payment);
    }

    res.json({
      message: 'Payment record corrected successfully.',
      payment
    });
  } catch (error) {
    console.error('correctPayment error:', error);
    res.status(500).json({ message: 'Failed to correct payment record', error: error.message });
  }
};

// Record Refund for a Booking (e.g. Deposit or Rent Refund)
exports.recordRefund = async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      refundType = 'Security Deposit Refund',
      method = 'Bank Transfer',
      referenceId,
      reason,
      notes
    } = req.body;

    const refundAmt = parseFloat(amount);
    if (!bookingId || isNaN(refundAmt) || refundAmt <= 0) {
      return res.status(400).json({ message: 'Please specify a valid booking ID and refund amount greater than zero.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A reason for the refund is required.' });
    }

    const booking = await BookingLodge.findById(bookingId).populate('roomId').populate('userId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const receiptNumber = `RFD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const refundPayment = await Payment.create({
      customerId: booking.userId?._id || booking.userId,
      tenantName: booking.userId?.name || 'Resident',
      name: booking.userId?.name || 'Resident',
      amount: refundAmt,
      method: method || 'Bank Transfer',
      referenceId: referenceId || `RFD-${Date.now().toString(36).toUpperCase()}`,
      transactionReference: referenceId || `RFD-${Date.now()}`,
      status: 'VERIFIED',
      bookingId: booking._id,
      roomId: booking.roomId?._id || booking.roomId,
      paymentType: 'Refund',
      chargeCategory: refundType || 'Security Deposit Refund',
      billingPeriodStart: booking.checkIn,
      billingPeriodEnd: booking.checkOut,
      receiptNumber,
      paymentDate: new Date(),
      notes: `Refund issued: ${reason.trim()}. ${notes ? `Notes: ${notes}` : ''}`,
      verifiedByName: req.user.name || 'Administrator',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      auditLog: [{
        action: 'REFUND_ISSUED',
        performedBy: req.user.name || 'Administrator',
        timestamp: new Date(),
        notes: `Refund of ₹${refundAmt.toLocaleString()} issued via ${method}. Type: ${refundType}. Reason: ${reason.trim()}. Ref: ${referenceId || 'N/A'}`
      }]
    });

    const io = socketUtil.getIO();
    if (io) {
      io.emit('lodge-payment-submitted', refundPayment);
      io.emit('lodge-payment-updated', refundPayment);
      io.emit('payment-status-changed', refundPayment);
    }

    res.status(201).json({
      message: `Refund of ₹${refundAmt.toLocaleString()} recorded successfully.`,
      refund: refundPayment
    });
  } catch (error) {
    console.error('recordRefund error:', error);
    res.status(500).json({ message: 'Failed to record refund', error: error.message });
  }
};

