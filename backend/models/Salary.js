const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    salaryAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    createdAt: { type: Date, default: Date.now }
});

salarySchema.index({ staffId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);
