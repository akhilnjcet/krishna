const mongoose = require('mongoose');

const cashFlowAdjustmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    flowType: {
        type: String,
        enum: ['INFLOW', 'OUTFLOW'],
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            'Expected Customer Payment', 
            'Supplier Payment', 
            'Salary Obligation', 
            'Machinery Purchase', 
            'Loan / Credit Payment', 
            'Taxes / Statutory', 
            'Rent / Utilities', 
            'Project Direct Expense', 
            'Other Expected Inflow', 
            'Other Expected Outflow'
        ],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than zero']
    },
    expectedDate: {
        type: Date,
        required: true,
        index: true
    },
    confidenceLevel: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'High'
    },
    isConfirmed: {
        type: Boolean,
        default: false
    },
    sourceReference: {
        type: String, // e.g. PO-2026-081, Quote-4412
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByName: {
        type: String,
        default: 'Admin'
    },
    isRealized: {
        type: Boolean,
        default: false // Set to true once an actual payment/expense receipt is logged in ERP
    }
}, { timestamps: true });

cashFlowAdjustmentSchema.index({ expectedDate: 1, flowType: 1 });

module.exports = mongoose.model('CashFlowAdjustment', cashFlowAdjustmentSchema);
