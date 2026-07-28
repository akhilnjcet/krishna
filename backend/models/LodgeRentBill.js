const mongoose = require('mongoose');

const lodgeRentBillSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billingPeriodStart: { type: Date, required: true },
  billingPeriodEnd: { type: Date, required: true },
  billingCycle: { type: String, required: true },
  rentAmount: { type: Number, required: true },
  electricityCharges: { type: Number, default: 0 },
  waterCharges: { type: Number, default: 0 },
  maintenanceCharges: { type: Number, default: 0 },
  extraCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Paid', 'Due'], default: 'Due' },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  transactionId: { type: String },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  outstandingAmount: { type: Number, default: 0 },
  lateFeeApplied: { type: Number, default: 0 },
  archived: { type: Boolean, default: false }
}, { timestamps: true });

// Indexing for quick search and filters
lodgeRentBillSchema.index({ roomId: 1 });
lodgeRentBillSchema.index({ userId: 1 });
lodgeRentBillSchema.index({ status: 1 });
lodgeRentBillSchema.index({ dueDate: -1 });

module.exports = mongoose.model('LodgeRentBill', lodgeRentBillSchema);
