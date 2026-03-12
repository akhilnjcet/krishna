const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    staff_id: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    phone_number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    designation: { type: String, required: true }, // Changed from position to designation as requested
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    profile_photo: { type: String }, // Path or URL
    face_descriptor: { type: [Number], default: [] }, // Array of 128 numbers from face-api.js
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staff', staffSchema);

