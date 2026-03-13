const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    full_name: { type: String, required: true },
    login_time: { type: Date, default: Date.now },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    face_match_confidence: { type: Number, default: 0 },
    device_ip: { type: String },
    status: { type: String, enum: ['success', 'fail'], default: 'success' }
});

// We might want multiple logs per day if it's "verification logs", or just one for attendance.
// I'll leave the indexing for now or remove if multiple logs are okay.

module.exports = mongoose.model('Attendance', attendanceSchema);

