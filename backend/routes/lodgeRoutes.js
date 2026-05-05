const express = require('express');
const router = express.Router();
const Lodge = require('../models/Lodge');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const lodges = await Lodge.find({});
    res.json(lodges);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lodge = await Lodge.findById(req.params.id);
    if (!lodge) return res.status(404).json({ message: 'Lodge not found' });
    res.json(lodge);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, location, amenities, images } = req.body;
    
    const lodge = await Lodge.create({
      name,
      description,
      location,
      amenities,
      images,
      adminId: req.user.id || req.user._id
    });
    
    res.status(201).json(lodge);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

const upload = require('../config/cloudinary');

router.put('/:id', protect, admin, upload.array('newImages', 5), async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse location if it's sent as a stringified JSON
    if (typeof updateData.location === 'string') {
        try {
            updateData.location = JSON.parse(updateData.location);
        } catch (e) {
            console.error("Location parse error", e);
        }
    }

    // Handle existing images
    let images = [];
    if (req.body.existingImages) {
        images = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
        images = images.map(img => {
            try { return JSON.parse(img); } catch(e) { return img; } // Might be objects
        });
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
            url: file.path.startsWith('http') ? file.path : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
            publicId: file.filename
        }));
        images = [...images, ...newImages];
    }
    
    updateData.images = images;

    const lodge = await Lodge.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!lodge) return res.status(404).json({ message: 'Lodge not found' });
    res.json(lodge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Lodge.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lodge deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/sys/stats', protect, admin, async (req, res) => {
    try {
        const Booking = require('../models/BookingLodge');
        const Payment = require('../models/Payment');
        const Room = require('../models/Room');
        const User = require('../models/User');

        const [totalBookings, payments, totalRooms, totalUsers] = await Promise.all([
            Booking.countDocuments(),
            Payment.find({ status: 'verified' }),
            Room.countDocuments(),
            User.countDocuments({ role: 'customer' })
        ]);

        const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
        const activeBookings = await Booking.countDocuments({ status: 'active' });
        const occupancyRate = totalRooms > 0 ? (activeBookings / totalRooms) * 100 : 0;

        res.json({
            totalBookings,
            totalRevenue,
            totalUsers,
            occupancyRate: Math.round(occupancyRate),
            activeBookings
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
