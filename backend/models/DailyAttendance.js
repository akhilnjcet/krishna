const mongoose = require('mongoose');

const dailyAttendanceSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    status: { 
        type: String, 
        enum: ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Completed', 'In Progress', 'Missing Out', 'Weekly Off'], 
        required: true 
    },
    checkIn: { type: String },
    checkOut: { type: String },
    breakTime: { type: Number, default: 0 },
    workedHours: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyExitMinutes: { type: Number, default: 0 },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    shiftName: { type: String },
    shiftCode: { type: String },
    overtimeHours: { type: Number, default: 0 },
    isOvernight: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manualCorrectionReason: { type: String },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    correctedAt: { type: Date },
    originalCheckIn: { type: String },
    originalCheckOut: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

// Ensure a single record per staff member per day
dailyAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
dailyAttendanceSchema.index({ date: 1, status: 1 });
dailyAttendanceSchema.index({ shiftId: 1 });

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
