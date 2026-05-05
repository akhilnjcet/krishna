const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lodgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'resolved'], default: 'pending' },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
