const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   POST /api/complaints
// @desc    Submit a complaint (Client)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { lodgeId, roomId, bookingId, title, description } = req.body;
    const complaint = await Complaint.create({
      userId: req.user.id || req.user._id,
      lodgeId,
      roomId,
      bookingId,
      title,
      description
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
