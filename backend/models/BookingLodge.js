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
  }],
  securityDeposit: { type: Number, default: 0 },
  depositAdjustments: [{
      adjustmentId: { type: String },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      reason: { type: String, required: true },
      rentPeriod: { type: String, required: true },
      performedBy: { type: String, default: 'Owner' }
  }],
  extraCharges: [{
      id: { type: String },
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      paidAmount: { type: Number, default: 0 },
      notes: { type: String },
      dateAdded: { type: Date, default: Date.now }
  }],
  actualCheckOut: { type: Date },
  checkoutNotes: { type: String },
  checkoutSettlement: { type: Object },
  checkedOutBy: { type: String },
  bookedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminNotes: { type: String }
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

// Performance indexes for sub-second query lookups
bookingSchema.index({ roomId: 1, status: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ lodgeId: 1, status: 1 });
bookingSchema.index({ checkIn: -1, checkOut: -1 });
bookingSchema.index({ status: 1, checkIn: 1 });
bookingSchema.index({ agreementNumber: 1 });

module.exports = mongoose.model('BookingLodge', bookingSchema);
