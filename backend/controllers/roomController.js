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
            return res.status(400).json({ error: 'Dates required' });
        }

        const ci = new Date(check_in);
        const co = new Date(check_out);

        // 1. Find all bookings that overlap with the requested range
        const overlappingBookings = await Booking.find({
            bookingStatus: { $ne: 'cancelled' },
            $and: [
                { checkIn: { $lt: co } },
                { checkOut: { $gt: ci } }
            ]
        });

        const bookedRoomNumbers = overlappingBookings.map(b => b.roomId?.number).filter(n => n);

        // 2. Fetch Master Room Inventory from LodgeData
        const LodgeData = require('../models/LodgeData');
        const lodge = await LodgeData.findOne({}); // Get system global data
        
        if (!lodge || !lodge.rooms) {
            // Fallback to individual Room collection if LodgeData is empty
            const availableRooms = await Room.find({ status: 'active' });
            return res.json(availableRooms);
        }

        // 3. Filter master rooms against bookings and status
        const availableRooms = lodge.rooms
            .filter(r => r.status === 'active' || r.status === 'available')
            .filter(r => !bookedRoomNumbers.includes(String(r.number)))
            .map(r => ({
                _id: r.id, // Map for compatibility
                number: r.number,
                price: r.rent,
                type: 'Deluxe', // Default
                status: 'active'
            }));

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
