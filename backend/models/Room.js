const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Single', 'Double', 'Suite', 'Deluxe'], default: 'Double' },
    price: { type: Number, required: true },
    amenities: [{ type: String }],
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    description: { type: String },
    images: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
