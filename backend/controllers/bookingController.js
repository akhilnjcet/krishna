const Booking = require('../models/Booking');
const Room = require('../models/Room');

exports.createBooking = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut, guestName, guestPhone, totalAmount } = req.body;
        const userId = req.user.id; // From authMiddleware

        // Re-validate availability on the server to prevent race conditions
        const ci = new Date(checkIn);
        const co = new Date(checkOut);

        const overlap = await Booking.findOne({
            roomId,
            bookingStatus: { $ne: 'cancelled' },
            $and: [
                { checkIn: { $lt: co } },
                { checkOut: { $gt: ci } }
            ]
        });

        if (overlap) {
            return res.status(409).json({ error: 'Room is already booked for these dates.' });
        }

        const booking = new Booking({
            userId,
            roomId,
            checkIn: ci,
            checkOut: co,
            guestName,
            guestPhone,
            totalAmount
        });

        await booking.save();
        res.status(201).json(booking);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.params.user_id })
            .populate('roomId')
            .sort({ checkIn: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        // Admin only
        const bookings = await Booking.find()
            .populate('roomId')
            .populate('userId', 'name email mobile')
            .sort({ checkIn: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const update = { bookingStatus: status };

        if (status === 'checked-in') {
            update.tempPin = Math.floor(1000 + Math.random() * 9000).toString();
            update.actualCheckIn = Date.now();
        } else if (status === 'completed' || status === 'cancelled') {
            update.tempPin = null; // Invalidate PIN
            if (status === 'completed') update.actualCheckOut = Date.now();
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id, 
            update, 
            { new: true }
        );
        res.json(booking);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.verifyRoomAccess = async (req, res) => {
    try {
        const { roomNumber, pin } = req.body;
        
        // Find room by number first
        const room = await Room.findOne({ number: roomNumber });
        if (!room) return res.status(404).json({ error: 'Room not found' });

        // Find active booking for this room with matching PIN
        const booking = await Booking.findOne({
            roomId: room._id,
            tempPin: pin,
            bookingStatus: 'checked-in'
        }).populate('roomId');

        if (!booking) {
            return res.status(401).json({ error: 'Invalid Room Number or PIN' });
        }

        res.json({ 
            success: true, 
            booking,
            message: 'Access Granted' 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
