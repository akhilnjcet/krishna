const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    baseSalary: { type: Number, required: true, default: 0 },
    salaryType: { type: String, enum: ['Monthly', 'Daily Wage', 'Contract'], default: 'Monthly' },
    totalWorkingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeEarnings: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    advanceRecovery: { type: Number, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paidAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

salarySchema.index({ staffId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);
