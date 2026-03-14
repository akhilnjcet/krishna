const mongoose = require('mongoose');

const faceDataSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    faceEmbedding: { type: [Number], required: true }, // The 128-float vector (or average of 3-5 frames)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FaceData', faceDataSchema);
