const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['upi', 'bank_transfer', 'cash', 'other'], required: true },
    referenceId: { type: String }, // For UPI Ref or UTR
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'failed'], default: 'pending' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    notes: { type: String },
    receiptUrl: { type: String }, // In case they upload something
    createdAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Payment', paymentSchema);
