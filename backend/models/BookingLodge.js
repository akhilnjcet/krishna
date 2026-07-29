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
  },
  agreementNumber: { type: String },
  acknowledgementVersion: { type: Number, default: 1 },
  versionHistory: [{
      version: { type: Number, required: true },
      generatedAt: { type: Date, default: Date.now },
      reason: { type: String, default: 'Booking Initialized' },
      snapshot: { type: Object }
  }]
}, { timestamps: true });

// Auto generate agreementNumber if missing
bookingSchema.pre('save', function() {
  if (!this.agreementNumber) {
      const year = new Date().getFullYear();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      this.agreementNumber = `AGR-${year}-${randomId}`;
  }
  if (this.checkOut <= this.checkIn) {
    throw new Error('checkOut date must be after checkIn date');
  }
});


module.exports = mongoose.model('BookingLodge', bookingSchema);
