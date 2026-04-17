const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guestName: { type: String, required: true },
    guestPhone: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid', 'refunded'], default: 'pending' },
    bookingStatus: { 
        type: String, 
        enum: ['booked', 'checked-in', 'completed', 'cancelled'], 
        default: 'booked' 
    },
    tempPin: { type: String }, // Generated on check-in
    actualCheckIn: { type: Date },
    actualCheckOut: { type: Date },
    transactionId: { type: String }, // For linking with Payment model
    notes: { type: String }
}, { timestamps: true });

// Index for availability checking
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
