const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true }, // upi, bank_transfer, cash, card, other, UPI QR, UPI ID, Bank Transfer, Cash, Card
    referenceId: { type: String }, // For UPI Ref or UTR
    transactionReference: { type: String },
    status: { type: String, default: 'WAITING_FOR_VERIFICATION' }, // pending, verified, rejected, failed, WAITING_FOR_VERIFICATION, APPROVED, REJECTED, VERIFIED, PAID, PARTIAL, ADVANCE, REFUNDED
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingLodge' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    paymentType: { type: String, default: 'Rent' }, // Rent, Additional Charge, Payment Request, Advance
    chargeCategory: { type: String, default: 'Rent' },
    billingPeriodStart: { type: Date },
    billingPeriodEnd: { type: Date },
    billingCycle: { type: String },
    invoiceNumber: { type: String },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'LodgeRentBill' },
    previousDue: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 },
    additionalCharges: [{
        name: { type: String },
        amount: { type: Number }
    }],
    grandTotal: { type: Number },
    receiptNumber: { type: String },
    receiptUrl: { type: String },
    uploadedProof: { type: String },
    tenantName: { type: String },
    notes: { type: String },
    name: { type: String },
    paymentDate: { type: Date, default: Date.now },
    rejectionReason: { type: String },
    verifiedByName: { type: String },
    createdAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LodgePaymentRequest' },
    originalJson: { type: String },
    auditLog: [{
        action: { type: String },
        performedBy: { type: String },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String }
    }]
});

module.exports = mongoose.model('Payment', paymentSchema);
