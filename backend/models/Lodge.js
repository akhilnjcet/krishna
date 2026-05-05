const mongoose = require('mongoose');

const lodgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    mapUrl: { type: String }
  },
  amenities: [{ type: String }],
  images: [{ url: String, publicId: String }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Keeping compatible with any old arrays if needed, but not used for availability
}, { timestamps: true });

module.exports = mongoose.model('Lodge', lodgeSchema);
