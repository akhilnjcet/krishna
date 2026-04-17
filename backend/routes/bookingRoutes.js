const express = require('express');
const router = express.Router();
const { createBooking, getUserBookings, getAllBookings, updateBookingStatus, verifyRoomAccess } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.post('/verify-access', verifyRoomAccess);
router.get('/user/:user_id', protect, getUserBookings);

// Admin only routes
router.get('/', protect, admin, getAllBookings);
router.put('/:id', protect, admin, updateBookingStatus);

module.exports = router;
