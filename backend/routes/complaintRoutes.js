const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, admin } = require('../middleware/authMiddleware');

const { isValidObjectId } = require('../utils/validateInputs');

// @route   POST /api/complaints
// @desc    Submit a complaint (Client)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { lodgeId, roomId, bookingId, title, description } = req.body;
    const userId = req.user.id || req.user._id;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Complaint title is required.' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Complaint description is required.' });
    }

    if (bookingId) {
      if (!isValidObjectId(bookingId)) {
        return res.status(400).json({ message: 'Invalid bookingId format.' });
      }
      const BookingLodge = require('../models/BookingLodge');
      const booking = await BookingLodge.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found.' });
      }
      const bOwner = (booking.userId?._id || booking.userId || '').toString();
      if (req.user.role !== 'admin' && bOwner !== userId.toString()) {
        return res.status(403).json({ message: 'Access denied: You do not own this booking.' });
      }
    }

    if (roomId && !isValidObjectId(roomId)) {
      return res.status(400).json({ message: 'Invalid roomId format.' });
    }
    if (lodgeId && !isValidObjectId(lodgeId)) {
      return res.status(400).json({ message: 'Invalid lodgeId format.' });
    }

    const complaint = await Complaint.create({
      userId,
      lodgeId: lodgeId || undefined,
      roomId: roomId || undefined,
      bookingId: bookingId || undefined,
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 3000)
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});


// @route   GET /api/complaints/my-complaints
// @desc    Get user matching complaints
// @access  Private
router.get('/my-complaints', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/complaints
// @desc    Get all complaints (Admin)
// @access  Private Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const complaints = await Complaint.find({})
        .populate('userId', 'name phone')
        .populate('lodgeId', 'name')
        .populate('roomId', 'type number')
        .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/complaints/:id/resolve
// @desc    Resolve a complaint (Admin)
// @access  Private Admin
router.put('/:id/resolve', protect, admin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid complaint ID format.' });
    }
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ message: 'Not found' });

    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
