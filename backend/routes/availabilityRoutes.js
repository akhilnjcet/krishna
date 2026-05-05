const express = require('express');
const router = express.Router();
const BookingLodge = require('../models/BookingLodge');

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await BookingLodge.find({
      roomId,
      status: 'active',
      checkOut: { $gte: today }
    }).select('checkIn checkOut');

    const unavailableRanges = bookings.map(b => ({
      start: b.checkIn,
      end: b.checkOut
    }));

    res.json(unavailableRanges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;
