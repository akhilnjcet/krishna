const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    serviceType: { type: String, required: true },
    description: { type: String, required: true },
    worksiteLocation: {
        address: { type: String, default: '' },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        source: { type: String, enum: ['gps', 'manual', 'search', 'none'], default: 'none' },
        accuracy: { type: Number, default: null },
        capturedAt: { type: Date, default: null }
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Tracking association
    image: { type: String }, // URL from cloudinary
    estimatedCost: { type: Number },
    status: { type: String, enum: ['new', 'reviewed', 'accepted', 'rejected'], default: 'new' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quote', quoteSchema);
