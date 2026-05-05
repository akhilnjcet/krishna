const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const { protect } = require('../middleware/authMiddleware');

// --- REVIEWS ---

router.post('/reviews', protect, async (req, res) => {
  try {
    const { lodgeId, bookingId, rating, comment } = req.body;
    const review = await Review.create({
      userId: req.user.id || req.user._id,
      lodgeId,
      bookingId,
      rating,
      comment
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});
router.get('/reviews/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id || req.user._id }).populate('lodgeId', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/reviews/lodge/:lodgeId', async (req, res) => {
  try {
    const reviews = await Review.find({ lodgeId: req.params.lodgeId }).populate('userId', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/reviews', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
    try {
      const reviews = await Review.find().populate('userId', 'name').populate('lodgeId', 'name');
      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/reviews/:id', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
    try {
      await Review.findByIdAndDelete(req.params.id);
      res.json({ message: 'Review deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Server Error' });
    }
});

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
