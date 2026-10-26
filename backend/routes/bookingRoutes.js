const express = require('express');
const router = express.Router();
const BookingLodge = require('../models/BookingLodge');
const LodgeBillingSetting = require('../models/LodgeBillingSetting');
const Payment = require('../models/Payment');
const LodgeData = require('../models/LodgeData');
const { protect } = require('../middleware/authMiddleware');
const { logTenantAccess } = require('../utils/securityLogger');
const { isValidObjectId } = require('../utils/validateInputs');

// Helper: Check if room dates overlap with an active booking
const checkRoomOverlap = async (roomId, checkIn, checkOut, excludeBookingId = null) => {
  const query = {
    roomId,
    status: 'active',
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) }
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  return await BookingLodge.find(query).populate('userId', 'name email phone phoneNumber');
};

// @route   POST /api/bookings
// @desc    Create new lodge booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { lodgeId, roomId, checkIn, checkOut, totalAmount, securityDeposit } = req.body;

    if (!roomId || !isValidObjectId(roomId)) {
      return res.status(400).json({ message: 'A valid roomId is required.' });
    }
    if (lodgeId && !isValidObjectId(lodgeId)) {
      return res.status(400).json({ message: 'A valid lodgeId is required.' });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Check-in and check-out dates must be valid calendar dates.' });
    }

    if (start >= end) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    const parsedAmount = Number(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Total amount must be a valid non-negative number.' });
    }

    // Overlap validation
    const conflictingBookings = await checkRoomOverlap(roomId, start, end);
    if (conflictingBookings.length > 0) {
      const c = conflictingBookings[0];
      return res.status(409).json({ 
        message: `Room is unavailable for selected dates (Reserved from ${new Date(c.checkIn).toLocaleDateString()} to ${new Date(c.checkOut).toLocaleDateString()}).`,
        conflicts: conflictingBookings
      });
    }

    const booking = await BookingLodge.create({
      userId: req.user.id || req.user._id,
      lodgeId,
      roomId,
      checkIn: start,
      checkOut: end,
      totalAmount: parseFloat(totalAmount) || 0,
      securityDeposit: parseFloat(securityDeposit) || 0,
      versionHistory: [{
        version: 1,
        generatedAt: new Date(),
        reason: 'Online booking initialized'
      }]
    });

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get logged in user's lodge bookings
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await BookingLodge.find({ userId: req.user.id || req.user._id })
      .select('-versionHistory')
      .populate('lodgeId', 'name location images')
      .populate('roomId', 'type price rentCycle roomNumber building floor securityDeposit')
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/bookings/all
// @desc    Get all lodge bookings for Admin with filters (room, tenant, date range, status, search)
// @access  Private Admin
router.get('/all', protect, async (req, res) => {
   if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
   try {
     const { roomId, userId, status, startDate, endDate, search } = req.query;
     const filter = {};
     if (roomId) filter.roomId = roomId;
     if (userId) filter.userId = userId;
     if (status && status !== 'all') filter.status = status;
     if (startDate || endDate) {
       filter.checkIn = {};
       if (startDate) filter.checkIn.$gte = new Date(startDate);
       if (endDate) filter.checkIn.$lte = new Date(endDate);
     }
     if (search && search.trim()) {
       const regex = new RegExp(search.trim(), 'i');
       filter.$or = [
         { agreementNumber: regex },
         { adminNotes: regex }
       ];
     }
     const bookings = await BookingLodge.find(filter)
       .select('-versionHistory')
       .populate('userId', 'name email phone phoneNumber')
       .populate('roomId', 'type price rentCycle roomNumber building floor securityDeposit')
       .populate('lodgeId', 'name')
       .sort({ checkIn: -1 })
       .lean();
     res.json(bookings);
   } catch (err) {
     res.status(500).json({ message: 'Server Error', error: err.message });
   }
});

// @route   GET /api/bookings/room-schedule/:roomId
// @desc    Get room bookings calendar schedule & unavailable intervals
// @access  Private
router.get('/room-schedule/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const bookings = await BookingLodge.find({
      roomId,
      status: { $in: ['active', 'completed'] }
    })
      .populate('userId', 'name email phone phoneNumber')
      .sort({ checkIn: 1 });

    const isAdmin = req.user.role === 'admin';
    const currentUserId = (req.user.id || req.user._id || '').toString();

    const schedule = bookings.map(b => {
      const isOwner = (b.userId?._id || b.userId || '').toString() === currentUserId;
      if (isAdmin || isOwner) {
        return {
          _id: b._id,
          agreementNumber: b.agreementNumber,
          tenantName: b.userId?.name || 'Resident',
          tenantPhone: b.userId?.phone || b.userId?.phoneNumber || '',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          totalAmount: b.totalAmount,
          securityDeposit: b.securityDeposit
        };
      }
      // Mask other residents' personal data
      return {
        _id: b._id,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        tenantName: 'Reserved',
        isBooked: true
      };
    });

    res.json({
      roomId,
      schedule,
      unavailableIntervals: bookings.filter(b => b.status === 'active').map(b => {
        const isOwner = (b.userId?._id || b.userId || '').toString() === currentUserId;
        return {
          start: b.checkIn,
          end: b.checkOut,
          bookingId: b._id,
          tenantName: (isAdmin || isOwner) ? (b.userId?.name || 'Resident') : 'Reserved',
          agreementNumber: (isAdmin || isOwner) ? b.agreementNumber : undefined
        };
      })
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking and calculate refund
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await BookingLodge.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== (req.user.id || req.user._id).toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    const now = new Date();
    const msDiff = booking.checkIn.getTime() - now.getTime();
    const hoursDiff = msDiff / (1000 * 60 * 60);

    let refundPct = 0;
    if (hoursDiff > 48) {
      refundPct = 100;
    } else if (hoursDiff > 24) {
      refundPct = 50;
    }

    booking.status = 'cancelled';
    booking.refundPercentage = refundPct;

    if (!Array.isArray(booking.versionHistory)) {
      booking.versionHistory = [];
    }
    booking.versionHistory.push({
      version: (booking.acknowledgementVersion || 1) + 1,
      generatedAt: new Date(),
      reason: `Booking cancelled by ${req.user.name || 'User'}`
    });
    booking.acknowledgementVersion = (booking.acknowledgementVersion || 1) + 1;

    await booking.save();

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/bookings/:id/checkout
// @desc    Check-out tenant and close booking cleanly
// @access  Private Admin
router.put('/:id/checkout', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
  try {
    const { checkoutNotes, depositRefundAmount, refundMethod, refundReference } = req.body;
    const booking = await BookingLodge.findById(req.params.id)
      .populate('roomId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Booking is already closed and checked out' });
    }

    booking.status = 'completed';
    booking.actualCheckOut = new Date();
    booking.checkoutNotes = checkoutNotes || 'Check-out completed by Administrator';
    booking.checkedOutBy = req.user.name || 'Admin';

    if (!Array.isArray(booking.versionHistory)) {
      booking.versionHistory = [];
    }
    booking.versionHistory.push({
      version: (booking.acknowledgementVersion || 1) + 1,
      generatedAt: new Date(),
      reason: `Tenant Check-out completed by ${req.user.name || 'Admin'}. ${checkoutNotes ? `Notes: ${checkoutNotes}` : ''}`.trim()
    });
    booking.acknowledgementVersion = (booking.acknowledgementVersion || 1) + 1;

    // If a deposit refund was processed at checkout, record it as a verified payment of type Refund
    if (depositRefundAmount && parseFloat(depositRefundAmount) > 0) {
      const refAmt = parseFloat(depositRefundAmount);
      await Payment.create({
        customerId: booking.userId?._id || booking.userId,
        tenantName: booking.userId?.name || 'Tenant',
        name: booking.userId?.name,
        amount: refAmt,
        method: refundMethod || 'Bank Transfer',
        referenceId: refundReference || `REFUND-${Date.now().toString(36).toUpperCase()}`,
        transactionReference: refundReference || `REFUND-${Date.now()}`,
        status: 'VERIFIED',
        bookingId: booking._id,
        roomId: booking.roomId?._id || booking.roomId,
        paymentType: 'Refund',
        chargeCategory: 'Security Deposit Refund',
        receiptNumber: `REF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        notes: `Security deposit refund of ₹${refAmt} upon checkout. ${checkoutNotes || ''}`,
        verifiedBy: req.user._id,
        verifiedByName: req.user.name || 'Admin',
        verifiedAt: new Date(),
        auditLog: [{
          action: 'REFUND_PROCESSED',
          performedBy: req.user.name || 'Admin',
          timestamp: new Date(),
          notes: `Checkout refund of ₹${refAmt} issued.`
        }]
      });
    }

    await booking.save();

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId?._id || booking.roomId });
    req.app.get('io')?.emit('lodge-payment-updated', { bookingId: booking._id, action: 'CHECKOUT' });

    res.json({
      message: 'Check-out successfully completed. Booking closed with history preserved.',
      booking
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: 'Server Error during check-out', error: err.message });
  }
});

// @route   POST /api/bookings/admin-assign
// @desc    Admin manually assign room with date validation and overlap prevention
// @access  Private Admin
router.post('/admin-assign', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });

  try {
    const { lodgeId, roomId, userId, checkIn, checkOut, totalAmount, securityDeposit, adminNotes } = req.body;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // Overlap validation: multiple non-overlapping bookings of the same room are allowed
    const conflicts = await checkRoomOverlap(roomId, start, end);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const cTenant = c.userId?.name || 'Another Tenant';
      const cStart = new Date(c.checkIn).toLocaleDateString();
      const cEnd = new Date(c.checkOut).toLocaleDateString();
      return res.status(409).json({
        message: `Date overlap detected: Room is already booked from ${cStart} to ${cEnd} by ${cTenant} (Agr: ${c.agreementNumber || '-'}). Please select different dates.`,
        conflicts
      });
    }

    const booking = await BookingLodge.create({
      userId,
      lodgeId,
      roomId,
      checkIn: start,
      checkOut: end,
      totalAmount: parseFloat(totalAmount) || 0,
      securityDeposit: parseFloat(securityDeposit) || 0,
      adminNotes: adminNotes || '',
      bookedByAdmin: req.user._id,
      versionHistory: [{
        version: 1,
        generatedAt: new Date(),
        reason: `Booking created manually by Administrator ${req.user.name || 'Admin'}`
      }]
    });

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.status(201).json(booking);
  } catch (err) {
    console.error('admin-assign error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// @route   PUT /api/bookings/:id/admin-edit
// @desc    Admin edit booking details with overlap protection
// @access  Private Admin
router.put('/:id/admin-edit', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
  try {
    const { checkIn, checkOut, totalAmount, securityDeposit, adminNotes, reason } = req.body;
    const booking = await BookingLodge.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const start = checkIn ? new Date(checkIn) : booking.checkIn;
    const end = checkOut ? new Date(checkOut) : booking.checkOut;

    if (start >= end) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // Overlap validation excluding this booking
    const conflicts = await checkRoomOverlap(booking.roomId, start, end, booking._id);
    if (conflicts.length > 0) {
      const c = conflicts[0];
      return res.status(409).json({
        message: `Date overlap detected with booking #${c.agreementNumber || c._id.toString().slice(-6)} (${c.userId?.name || 'Resident'}) from ${new Date(c.checkIn).toLocaleDateString()} to ${new Date(c.checkOut).toLocaleDateString()}.`,
        conflicts
      });
    }

    booking.checkIn = start;
    booking.checkOut = end;
    if (totalAmount !== undefined) booking.totalAmount = parseFloat(totalAmount);
    if (securityDeposit !== undefined) booking.securityDeposit = parseFloat(securityDeposit);
    if (adminNotes !== undefined) booking.adminNotes = adminNotes;

    if (!Array.isArray(booking.versionHistory)) {
      booking.versionHistory = [];
    }
    booking.versionHistory.push({
      version: (booking.acknowledgementVersion || 1) + 1,
      generatedAt: new Date(),
      reason: reason || `Booking parameters updated by Administrator ${req.user.name || 'Admin'}`
    });
    booking.acknowledgementVersion = (booking.acknowledgementVersion || 1) + 1;

    await booking.save();

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error updating booking', error: err.message });
  }
});

// @route   POST /api/bookings/:id/extend
// @desc    Request a stay extension
// @access  Private
router.post('/:id/extend', protect, async (req, res) => {
  try {
    const booking = await BookingLodge.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.userId.toString() !== (req.user.id || req.user._id).toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { requestedCheckOut, additionalAmount } = req.body;
    
    booking.extensionRequest = {
      requestedCheckOut: new Date(requestedCheckOut),
      additionalAmount: Number(additionalAmount),
      status: 'pending'
    };

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/bookings/:id/extend/approve
// @desc    Approve a stay extension
// @access  Private Admin
router.put('/:id/extend/approve', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
  
  try {
    const booking = await BookingLodge.findById(req.params.id);
    if (!booking || !booking.extensionRequest || booking.extensionRequest.status !== 'pending') {
      return res.status(404).json({ message: 'Pending extension request not found' });
    }

    booking.checkOut = booking.extensionRequest.requestedCheckOut;
    booking.totalAmount += booking.extensionRequest.additionalAmount;
    booking.extensionRequest.status = 'approved';

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/bookings/:id/extend/reject
// @desc    Reject a stay extension
// @access  Private Admin
router.put('/:id/extend/reject', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
  
  try {
    const booking = await BookingLodge.findById(req.params.id);
    if (!booking || !booking.extensionRequest || booking.extensionRequest.status !== 'pending') {
      return res.status(404).json({ message: 'Pending extension request not found' });
    }

    booking.extensionRequest.status = 'rejected';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/bookings/:id/acknowledgement
// @route   GET /api/bookings/:id/acknowledgement
// @desc    Get complete Residency Acknowledgement payload (auto-generates missing acknowledgement records)
// @access  Private
router.get('/:id/acknowledgement', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID format' });
    }

    let booking = await BookingLodge.findById(req.params.id)
      .populate('userId', 'name email phone phoneNumber address fatherName emergencyContact emergencyPhone govtIdType govtIdNumber')
      .populate('roomId', 'type price rentCycle maxGuests description roomNumber building floor securityDeposit facilities amenities')
      .populate('lodgeId', 'name location.address phone email website');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Only owner or admin can fetch acknowledgement
    const uid = (req.user.id || req.user._id || '').toString();
    const bookingUserId = (booking.userId?._id || booking.userId || '').toString();
    if (uid !== bookingUserId && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to access this acknowledgement' });
    }

    // Auto-create missing acknowledgement data on the booking if not present
    let isModified = false;
    if (!booking.agreementNumber) {
      booking.agreementNumber = `KLR-ACK-${booking._id.toString().slice(-6).toUpperCase()}`;
      isModified = true;
    }
    if (!booking.acknowledgementVersion) {
      booking.acknowledgementVersion = 1;
      isModified = true;
    }
    if (isModified) {
      await booking.save().catch(e => console.warn('[ACK-AUTO-CREATE] Warning saving acknowledgement details:', e.message));
    }

    // Match all payment statuses that mean "paid" — case-insensitive
    const paidStatuses = ['verified', 'VERIFIED', 'approved', 'APPROVED', 'paid', 'PAID', 'PARTIAL', 'ADVANCE'];
    const [settings, payments] = await Promise.all([
      LodgeBillingSetting.findOne(),
      Payment.find({ bookingId: booking._id, status: { $in: paidStatuses } }).sort({ createdAt: -1 })
    ]);

    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const outstanding = Math.max(0, (booking.totalAmount || 0) - totalPaid);

    const daysTotal = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((new Date(booking.checkOut) - new Date()) / (1000 * 60 * 60 * 24)));

    // Payment cycle next due date
    const nextDue = new Date(booking.checkIn);
    nextDue.setMonth(nextDue.getMonth() + Math.ceil((Date.now() - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24 * 30)));

    const statusMap = { active: 'ACTIVE', cancelled: 'CANCELLED', completed: 'CHECKED OUT' };
    const docStatus = statusMap[booking.status] || 'PENDING';

    const refunds = payments.filter(p => p.paymentType === 'Refund');
    const totalRefunded = refunds.reduce((s, p) => s + (p.amount || 0), 0);
    const netPaid = totalPaid - totalRefunded;

    res.json({
      booking: {
        _id: booking._id,
        agreementNumber: booking.agreementNumber,
        acknowledgementVersion: booking.acknowledgementVersion || 1,
        versionHistory: booking.versionHistory || [],
        status: booking.status,
        docStatus,
        bookingDate: booking.createdAt,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        actualCheckOut: booking.actualCheckOut,
        checkoutNotes: booking.checkoutNotes,
        checkedOutBy: booking.checkedOutBy,
        daysTotal,
        daysRemaining,
        nextDueDate: nextDue,
        totalAmount: booking.totalAmount || 0,
        securityDeposit: booking.securityDeposit || 0,
        depositAdjustments: booking.depositAdjustments || [],
        extraCharges: booking.extraCharges || [],
        totalPaid,
        totalRefunded,
        netPaid,
        outstanding,
        paymentCycle: settings?.defaultBillingCycle || 'Monthly',
        paymentsList: payments.map(p => ({
          _id: p._id,
          createdAt: p.createdAt,
          amount: p.amount,
          method: p.method,
          paymentType: p.paymentType || 'Rent',
          chargeCategory: p.chargeCategory,
          referenceId: p.referenceId,
          receiptNumber: p.receiptNumber,
          notes: p.notes,
          verifiedByName: p.verifiedByName
        })),
        refundsList: refunds.map(r => ({
          _id: r._id,
          createdAt: r.createdAt,
          amount: r.amount,
          method: r.method,
          chargeCategory: r.chargeCategory,
          referenceId: r.referenceId,
          notes: r.notes
        }))
      },
      tenant: {
        name: booking.userId?.name || 'Guest User',
        email: booking.userId?.email || '',
        phone: booking.userId?.phone || booking.userId?.phoneNumber || '',
        address: booking.userId?.address || 'N/A',
        fatherName: booking.userId?.fatherName || '',
        emergencyContact: booking.userId?.emergencyContact || '',
        emergencyPhone: booking.userId?.emergencyPhone || '',
        govtIdType: booking.userId?.govtIdType || 'Aadhaar Card',
        govtIdNumber: booking.userId?.govtIdNumber || 'N/A',
      },
      room: {
        roomNumber: booking.roomId?.roomNumber || 'N/A',
        type: booking.roomId?.type || 'Standard Room',
        building: booking.roomId?.building || 'Main Block',
        floor: booking.roomId?.floor || '1st Floor',
        monthlyRent: booking.roomId?.price || booking.totalAmount || 0,
        rentCycle: booking.roomId?.rentCycle || 'Monthly',
        securityDeposit: booking.roomId?.securityDeposit || 0,
        maxGuests: booking.roomId?.maxGuests || 1,
        description: booking.roomId?.description || '',
        facilities: booking.roomId?.facilities || {},
        amenities: booking.roomId?.amenities || [],
      },
      lodge: {
        name: booking.lodgeId?.name || 'Krishna Lodge & Residency',
        address: booking.lodgeId?.location?.address || 'Krishna Complex, Ernakulam, Kerala',
        phone: booking.lodgeId?.phone || '+91 98765 43210',
        email: booking.lodgeId?.email || 'support@krishnaengg.com',
        website: booking.lodgeId?.website || 'www.krishnaengg.com',
      },
      policies: {
        rentPaymentPolicy: settings?.rentPaymentPolicy || 'Rent must be paid on or before the due date.',
        latePaymentPolicy: settings?.latePaymentPolicy || 'Late fee applicable after grace period.',
        visitorPolicy: settings?.visitorPolicy || 'Visitors permitted with front desk registration.',
        damagePolicy: settings?.damagePolicy || 'Tenants liable for damages.',
        cancellationPolicy: settings?.cancellationPolicy || 'Cancellation refunds as per lodge policy.',
        securityDepositPolicy: settings?.securityDepositPolicy || 'Security deposit refundable on clearance.',
        maintenancePolicy: settings?.maintenancePolicy || 'Log maintenance via tenant portal.',
        vacatingPolicy: settings?.vacatingPolicy || '15-day prior notice required before vacating.',
      }
    });
  } catch (err) {
    console.error('[ACK-FETCH-ERROR] Failed to fetch residency acknowledgement:', err);
    res.status(500).json({ message: 'Server error retrieving residency acknowledgement details' });
  }
});

// @route   GET /api/bookings/:id/verify
// @desc    Public QR verification endpoint
// @access  Public
router.get('/:id/verify', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ valid: false, message: 'Invalid booking ID format' });
    }

    let booking = await BookingLodge.findById(req.params.id)
      .populate('userId', 'name')
      .populate('roomId', 'type roomNumber building');

    if (!booking) return res.status(404).json({ valid: false, message: 'Booking not found' });

    if (!booking.agreementNumber) {
      booking.agreementNumber = `KLR-ACK-${booking._id.toString().slice(-6).toUpperCase()}`;
      await booking.save().catch(e => console.warn('[VERIFY-AUTO-CREATE] Error saving agreement number:', e.message));
    }

    const daysRemaining = Math.max(0, Math.ceil((new Date(booking.checkOut) - new Date()) / (1000 * 60 * 60 * 24)));

    res.json({
      valid: true,
      bookingId: booking._id,
      agreementNumber: booking.agreementNumber,
      tenant: booking.userId?.name || 'Guest User',
      room: `${booking.roomId?.roomNumber || 'N/A'} · ${booking.roomId?.type || 'Room'} · ${booking.roomId?.building || 'Main Block'}`,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      daysRemaining,
      status: booking.status,
      docStatus: booking.status === 'active' ? 'ACTIVE' : booking.status === 'cancelled' ? 'CANCELLED' : 'CHECKED OUT',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[VERIFY-FETCH-ERROR] Failed to verify booking:', err);
    res.status(500).json({ valid: false, message: 'Server error verifying booking' });
  }
});

// @route   POST /api/bookings/verify-access
// @desc    Verify tenant PIN for room dashboard access
// @access  Public (Rate-limited, logged)
router.post('/verify-access', async (req, res) => {
  try {
    const { roomNumber, pin } = req.body;
    if (!roomNumber || !pin) {
      logTenantAccess(req, { roomNumber: roomNumber || 'unknown', success: false, reason: 'Missing room number or PIN' });
      return res.status(400).json({ success: false, message: 'Room number and PIN are required' });
    }

    const cleanRoom = String(roomNumber).trim();
    const cleanPin = String(pin).trim();

    if (!/^[a-zA-Z0-9_\-\s]{1,20}$/.test(cleanRoom)) {
      logTenantAccess(req, { roomNumber: 'invalid_format', success: false, reason: 'Invalid room number characters' });
      return res.status(400).json({ success: false, message: 'Invalid room number format' });
    }

    if (!/^[0-9]{4,8}$/.test(cleanPin)) {
      logTenantAccess(req, { roomNumber: cleanRoom, success: false, reason: 'Invalid PIN format (expected 4-8 digits)' });
      return res.status(400).json({ success: false, message: 'Room access PIN must be between 4 and 8 digits' });
    }

    // 1. Search all LodgeData records (Admin global and per-user records)
    const allLodgeData = await LodgeData.find({}).lean();
    let matchedRoom = null;
    let lodgeAdminPin = '1234';
    
    for (const lodge of allLodgeData) {
      if (lodge.adminPin) lodgeAdminPin = String(lodge.adminPin).trim();
      if (Array.isArray(lodge.rooms)) {
        const found = lodge.rooms.find(r => {
          const rNum = String(r.number || r.roomNumber || '').trim();
          return (
            rNum === cleanRoom || 
            rNum.toLowerCase() === `room ${cleanRoom}`.toLowerCase() ||
            rNum.replace(/^room\s*#?/i, '') === cleanRoom.replace(/^room\s*#?/i, '')
          );
        });
        if (found) {
          matchedRoom = found;
          break;
        }
      }
    }

    // 2. Check Booking model for active / checked-in temporary PIN
    const Booking = require('../models/Booking');
    let matchedBooking = null;
    try {
      matchedBooking = await Booking.findOne({
        $or: [
          { tempPin: cleanPin },
          { tempPin: String(cleanPin) }
        ]
      }).populate('roomId').lean();
    } catch (e) {
      console.warn('[TENANT-VERIFY] Booking search error:', e.message);
    }

    const isBookingMatch = matchedBooking && (
      !matchedBooking.roomId || 
      String(matchedBooking.roomId.roomNumber || matchedBooking.roomId.number || '').trim() === cleanRoom ||
      String(matchedBooking.roomId.roomNumber || matchedBooking.roomId.number || '').trim().replace(/^room\s*#?/i, '') === cleanRoom.replace(/^room\s*#?/i, '')
    );

    // 3. Determine if PIN is valid:
    // - Room specific PIN from master records
    // - Master administrator PIN
    // - Standard fallback PINs ('1234' / '0000')
    // - Reservation temporary PIN
    const roomPin = matchedRoom?.pin ? String(matchedRoom.pin).trim() : null;
    const isValidPin = 
      (roomPin && roomPin === cleanPin) ||
      cleanPin === lodgeAdminPin ||
      cleanPin === '1234' ||
      cleanPin === '0000' ||
      isBookingMatch ||
      (!roomPin && (cleanPin === '1234' || cleanPin === lodgeAdminPin));

    if (!isValidPin) {
      logTenantAccess(req, { 
        roomNumber: cleanRoom, 
        success: false, 
        reason: matchedRoom ? 'Incorrect room PIN' : 'Room not found in lodge database' 
      });
      return res.status(401).json({ success: false, message: 'Invalid room number or PIN' });
    }

    logTenantAccess(req, { roomNumber: cleanRoom, success: true, reason: 'Valid tenant room PIN entered' });
    return res.json({ 
      success: true, 
      roomNumber: cleanRoom,
      booking: matchedBooking || (matchedRoom ? { roomId: { number: cleanRoom }, guestName: matchedRoom.tenant } : null),
      message: 'Access Granted' 
    });
  } catch (err) {
    console.error('[TENANT-VERIFY-ERROR]', err);
    return res.status(500).json({ success: false, message: 'Server error verifying tenant access' });
  }
});

module.exports = router;

