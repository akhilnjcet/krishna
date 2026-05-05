const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lodgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
