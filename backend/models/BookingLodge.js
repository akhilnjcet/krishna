const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  lodgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge' },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active' },
  refundPercentage: { type: Number, default: 0 },
  extensionRequest: {
      requestedCheckOut: Date,
      additionalAmount: Number,
      status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  }
}, { timestamps: true });

// Ensure checkOut is after checkIn
bookingSchema.pre('save', function() {
  if (this.checkOut <= this.checkIn) {
    throw new Error('checkOut date must be after checkIn date');
  }
});

module.exports = mongoose.model('BookingLodge', bookingSchema);
