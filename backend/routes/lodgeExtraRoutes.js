const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/authMiddleware');

// --- WISHLIST ---

router.post('/wishlist', protect, async (req, res) => {
  try {
    const { lodgeId } = req.body;
    const userId = req.user.id || req.user._id;
    
    // Toggle wishlist
    const exists = await Wishlist.findOne({ userId, lodgeId });
    if (exists) {
      await Wishlist.deleteOne({ _id: exists._id });
      return res.json({ message: 'Removed from wishlist', action: 'removed' });
    }
    
    const wish = await Wishlist.create({ userId, lodgeId });
    res.status(201).json({ message: 'Added to wishlist', action: 'added', data: wish });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/wishlist', protect, async (req, res) => {
  try {
    const wishes = await Wishlist.find({ userId: req.user.id || req.user._id }).populate('lodgeId');
    res.json(wishes);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
