const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    type: { type: String, enum: ['Partial', 'Advance', 'Final Settlement', 'Overpayment'], required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'], default: 'Cash' },
    notes: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    approvedBy: { type: String }, // Admin name who approved overpayment
    reason: { type: String }, // Reason for overpayment
    exceededAllowed: { type: Boolean, default: false }
});

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
    advanceRecovery: { type: Number, default: 0 }, // For backward compatibility
    
    // Dynamic salary parameters
    totalEarnedSalary: { type: Number, default: 0 },
    salaryAlreadyPaid: { type: Number, default: 0 },
    salaryAdvance: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    
    netSalary: { type: Number, required: true, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'partially_paid', 'Pending', 'Processing', 'Paid', 'Failed', 'Cancelled', 'pending', 'processing', 'failed', 'cancelled'], default: 'Pending' },
    paidAt: { type: Date },
    payments: [paymentTransactionSchema],
    createdAt: { type: Date, default: Date.now }
});

salarySchema.index({ staffId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);
