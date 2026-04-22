const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const User = require('../models/User');

// SIMULATED AUTH MIDDLEWARE (For college project simplicity)
// In a real app, this would use JWT headers. We'll pass ?userId= in query for simplicity.
const getAuthUser = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized: No User ID provided' });
    
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(401).json({ error: 'Unauthorized: Invalid User' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(400).json({ error: 'Invalid User ID format' });
    }
};

/**
 * 1. GET ALL ROOMS
 */
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 2. POST ADD ROOM (Admin Only)
 */
router.post('/rooms', getAuthUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    
    try {
        const { type, price, capacity } = req.body;
        const newRoom = new Room({ type, price, capacity });
        await newRoom.save();
        res.status(201).json(newRoom);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * 3. GET AVAILABLE ROOMS 
 * Logic: A room is available if it is not in "maintenance" and no confirmed booking overlaps the requested dates.
 */
router.get('/available-rooms', async (req, res) => {
    const { checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
        return res.status(400).json({ error: 'checkIn and checkOut dates are required.' });
    }

    try {
        const ci = new Date(checkIn);
        const co = new Date(checkOut);

        if (ci >= co) {
            return res.status(400).json({ error: 'Check-out date must be after check-in date.' });
        }

        // Find all rooms in maintenance (these are excluded globally)
        const allRooms = await Room.find({ status: 'available' });

        // Identify overlapping bookings across all rooms
        const overlappingBookings = await Booking.find({
            status: 'confirmed',
            $and: [
                { checkIn: { $lt: co } },  // Existing checkIn is before requested checkOut
                { checkOut: { $gt: ci } }  // Existing checkOut is after requested checkIn
            ]
        });

        const bookedRoomIds = overlappingBookings.map(b => b.roomId.toString());

        // Filter out rooms that are solidly booked
        const availableRooms = allRooms.filter(r => !bookedRoomIds.includes(r._id.toString()));

        res.json(availableRooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 4. POST BOOK ROOM (Core UNIFIED Logic)
 * Regardless of Admin or User, this logic strictly mathematically prevents overlapping dates.
 */
router.post('/book-room', getAuthUser, async (req, res) => {
    const { roomId, checkIn, checkOut } = req.body;

    if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'roomId, checkIn, and checkOut are required.' });
    }

    try {
        const ci = new Date(checkIn);
        const co = new Date(checkOut);
        
        if (ci >= co) return res.status(400).json({ error: 'Invalid dates.' });

        // -- CRITICAL ATOMIC-LIKE CHECK --
        // This is the absolute core requirement from the instructions.
        const overlapCount = await Booking.countDocuments({
            roomId: roomId,
            status: 'confirmed',
            $and: [
                { checkIn: { $lt: co } },
                { checkOut: { $gt: ci } }
            ]
        });

        // The exact same rule applies to the Admin and normal User. NO BYPASSING allowed.
        if (overlapCount > 0) {
            return res.status(409).json({ 
                error: 'Conflict: This room is already booked for the selected dates. Please select another room.' 
            });
        }

        // If safe, create the booking!
        const booking = new Booking({
            userId: req.user._id,
            roomId: roomId,
            checkIn: ci,
            checkOut: co,
            status: 'confirmed'
        });

        await booking.save();
        res.status(201).json(booking);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 5. GET MY BOOKINGS
 */
router.get('/my-bookings', getAuthUser, async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
        const bookings = await Booking.find(filter)
            .populate('roomId')
            .populate('userId', 'name role')
            .sort({ checkIn: -1 });
            
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET USERS (Utility for frontend switching)
 */
router.get('/users', async (req, res) => {
    try {
        res.json(await User.find());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
