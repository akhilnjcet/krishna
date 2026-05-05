const express = require('express');
const router = express.Router();
const BookingLodge = require('../models/BookingLodge');
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
    
    // Purge or cancel conflicting active bookings automatically (Force assign)
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

module.exports = router;
