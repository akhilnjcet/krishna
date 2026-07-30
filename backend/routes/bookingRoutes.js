const express = require('express');
const router = express.Router();
const BookingLodge = require('../models/BookingLodge');
const LodgeBillingSetting = require('../models/LodgeBillingSetting');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/bookings
// @desc    Create new lodge booking
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { lodgeId, roomId, checkIn, checkOut, totalAmount } = req.body;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    // Dynamic overlap logic against BookingLodge
    const conflictingBookings = await BookingLodge.find({
      roomId,
      status: 'active',
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ message: 'Room is already booked for these dates' });
    }

    const booking = await BookingLodge.create({
      userId: req.user.id || req.user._id,
      lodgeId,
      roomId,
      checkIn: start,
      checkOut: end,
      totalAmount
    });

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get logged in user's lodge bookings
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await BookingLodge.find({ userId: req.user.id || req.user._id })
      .populate('lodgeId', 'name location images')
      .populate('roomId', 'type price rentCycle')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/bookings/all
// @desc    Get all lodge bookings for Admin Occupancy tab
// @access  Private Admin
router.get('/all', protect, async (req, res) => {
   if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });
   try {
     const bookings = await BookingLodge.find()
       .populate('userId', 'name email phone phoneNumber')
       .populate('roomId', 'type price rentCycle')
       .sort({ createdAt: -1 });
     res.json(bookings);
   } catch (err) {
     res.status(500).json({ message: 'Server Error' });
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
    await booking.save();

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/bookings/admin-assign
// @desc    Admin manually assign room (bypass limits)
// @access  Private Admin
router.post('/admin-assign', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(401).json({ message: 'Not authorized' });

  try {
    const { lodgeId, roomId, userId, checkIn, checkOut, totalAmount } = req.body;
    
    await BookingLodge.updateMany(
       { roomId, status: 'active', checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } },
       { $set: { status: 'cancelled', refundPercentage: 100 } }
    );

    const booking = await BookingLodge.create({
      userId,
      lodgeId,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalAmount
    });

    req.app.get('io')?.emit('booking_updated', booking);
    req.app.get('io')?.emit('room_updated', { roomId: booking.roomId });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
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
        daysTotal,
        daysRemaining,
        nextDueDate: nextDue,
        totalAmount: booking.totalAmount || 0,
        totalPaid,
        outstanding,
        paymentCycle: settings?.defaultBillingCycle || 'Monthly',
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

module.exports = router;
