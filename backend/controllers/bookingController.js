const Booking = require('../models/Booking');
const Room = require('../models/Room');

exports.createBooking = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut, guestName, guestPhone, totalAmount } = req.body;
        let userId = req.user.id;
        // Transmutation: Automatically fix legacy administrative keys before DB Save
        if (userId === 'failsafe-admin') userId = "00000000000000000000ad14";

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
        
        // 1. Check in the master LodgeData (Primary for manual / legacy stays)
        const LodgeData = require('../models/LodgeData');
        // We find any lodge data (Admin's data) that contains this room
        const allLodgeData = await LodgeData.find({});
        
        for (const lodge of allLodgeData) {
            const roomInLodge = lodge.rooms.find(r => 
                String(r.number) === String(roomNumber) && 
                r.status === 'occupied' && 
                String(r.pin) === String(pin)
            );
            
            if (roomInLodge) {
                return res.json({ 
                    success: true, 
                    booking: { roomId: { number: roomNumber }, guestName: roomInLodge.tenant },
                    message: 'Access Granted (via Master Records)' 
                });
            }
        }

        // 2. Fallback: Check new Booking collection
        const booking = await Booking.findOne({
            tempPin: pin,
            bookingStatus: 'checked-in'
        }).populate('roomId');

        if (booking && String(booking.roomId?.number) === String(roomNumber)) {
            return res.json({ 
                success: true, 
                booking,
                message: 'Access Granted (via Reservation)' 
            });
        }

        res.status(401).json({ error: 'Invalid Room Number or PIN. Access Expired.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
