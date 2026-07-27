const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    hours: { type: Number, required: true, min: 0 },
    ratePerHour: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    regularHours: { type: Number, default: 8 },
    checkIn: { type: String },
    checkOut: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    approvedBy: { type: String },
    approvalDate: { type: Date },
    remarks: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Ensure a single overtime record per staff member per day
overtimeSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Overtime', overtimeSchema);
