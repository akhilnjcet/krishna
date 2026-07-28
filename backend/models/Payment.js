const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['upi', 'bank_transfer', 'cash', 'other'], required: true },
    referenceId: { type: String }, // For UPI Ref or UTR
    transactionReference: { type: String },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'failed', 'Waiting for Verification', 'Completed', 'Failed', 'WAITING_FOR_VERIFICATION', 'APPROVED', 'REJECTED'], default: 'WAITING_FOR_VERIFICATION' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    uploadedProof: { type: String },
    tenantName: { type: String },
    notes: { type: String },
    name: { type: String },
    receiptUrl: { type: String }, // In case they upload something
    paymentDate: { type: Date, default: Date.now },
    rejectionReason: { type: String },
    verifiedByName: { type: String },
    createdAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Payment', paymentSchema);
