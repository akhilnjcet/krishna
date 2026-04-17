const express = require('express');
const router = express.Router();
const { getAllRooms, getAvailableRooms, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getAllRooms);
router.get('/available', getAvailableRooms);

// Admin only routes
router.post('/', protect, admin, createRoom);
router.put('/:id', protect, admin, updateRoom);
router.delete('/:id', protect, admin, deleteRoom);

module.exports = router;
