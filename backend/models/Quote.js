const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    serviceType: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Tracking association
    image: { type: String }, // URL from cloudinary
    estimatedCost: { type: Number },
    status: { type: String, enum: ['new', 'reviewed', 'accepted', 'rejected'], default: 'new' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quote', quoteSchema);
