const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    amount: { type: Number, required: true },
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'overdue'], default: 'unpaid' },
    stripePaymentId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
