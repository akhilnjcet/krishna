const Room = require('../models/Room');
const Booking = require('../models/Booking');

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAvailableRooms = async (req, res) => {
    try {
        const { check_in, check_out } = req.query;
        if (!check_in || !check_out) {
            return res.status(400).json({ error: 'Check-in and Check-out dates are required' });
        }

        const ci = new Date(check_in);
        const co = new Date(check_out);

        // Find all bookings that overlap with the requested range
        const overlappingBookings = await Booking.find({
            bookingStatus: { $ne: 'cancelled' },
            $and: [
                { checkIn: { $lt: co } },
                { checkOut: { $gt: ci } }
            ]
        }).select('roomId');

        const bookedRoomIds = overlappingBookings.map(b => b.roomId);

        // Find rooms that are NOT in the bookedRoomIds and are active
        const availableRooms = await Room.find({
            _id: { $nin: bookedRoomIds },
            status: 'active'
        });

        res.json(availableRooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createRoom = async (req, res) => {
    try {
        // Admin only - assumed checked by middleware
        const room = new Room(req.body);
        await room.save();
        res.status(201).json(room);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(room);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        await Room.findByIdAndDelete(req.params.id);
        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
