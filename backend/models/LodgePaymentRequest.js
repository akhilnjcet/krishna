const mongoose = require('mongoose');

const lodgePaymentRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  reason: { type: String, required: true },
  lateFee: { type: Number, default: 0 },
  additionalCharges: [{
    name: { type: String },
    amount: { type: Number }
  }],
  customMessage: { type: String },
  status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LodgePaymentRequest', lodgePaymentRequestSchema);
