const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const { EVENTS, sendNotification } = require('../services/notificationService');

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

    // Send Complaint Submitted Notification (Non-blocking)
    const data = {
        name: req.user.name,
        title: title || 'Maintenance Request',
        id: complaint._id.toString().substring(0, 8)
    };
    sendNotification(EVENTS.COMPLAINT_SUBMITTED, req.user, data).catch(err => console.error('Complaint Submit Notify Error:', err));

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

    // Send Complaint Resolved Notification (Non-blocking)
    const user = await User.findById(complaint.userId);
    if (user) {
      const data = {
          name: user.name,
          title: complaint.title || 'Maintenance Request'
      };
      sendNotification(EVENTS.COMPLAINT_RESOLVED, user, data).catch(err => console.error('Complaint Resolve Notify Error:', err));
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
