const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String }, // alias or unique ID if needed
    name: { type: String, required: true }, // full name, used by frontend
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
    faceDescriptor: { type: [Number], default: [] }, // Array of numbers from face-api.js
    createdAt: { type: Date, default: Date.now },
    last_login: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
