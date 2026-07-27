const mongoose = require('mongoose');

const dailyAttendanceSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday'], required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    breakTime: { type: Number, default: 0 },
    workedHours: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyExitMinutes: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

// Ensure a single record per staff member per day
dailyAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
