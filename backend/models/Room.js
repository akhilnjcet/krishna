const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  lodgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge', required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  rentCycle: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
  maxGuests: { type: Number, required: true },
  description: { type: String },
  amenities: [{ type: String }],
  interiorPhotos: [{ url: String, publicId: String }],
  exteriorPhotos: [{ url: String, publicId: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
