const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    type: { type: String, required: true },       // e.g., 'Single', 'Double', 'Suite'
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['available', 'maintenance'], default: 'available' }
});

module.exports = mongoose.model('Room', roomSchema);
