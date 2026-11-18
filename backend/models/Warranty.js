const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
    warrantyNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        default: ''
    },
    customerEmail: {
        type: String,
        default: ''
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    projectTitle: {
        type: String,
        required: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },
    invoiceNumber: {
        type: String,
        default: ''
    },
    deliveredItem: {
        type: String,
        required: true,
        trim: true
    },
    serialNumber: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['Structural Steel', 'Roofing & Sheds', 'Rolling Shutters', 'Gates & Railings', 'Stainless Steel Work', 'Industrial Machinery', 'General Fabrication'],
        default: 'General Fabrication'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    durationMonths: {
        type: Number,
        required: true,
        default: 12 // Default 1 year
    },
    expiryDate: {
        type: Date,
        required: true
    },
    coverageTerms: {
        type: String,
        default: 'Full structural weld integrity, anti-sag alignment, and primary installation warranty against manufacturing defects.'
    },
    exclusions: {
        type: String,
        default: 'Damage caused by natural disasters, intentional impact, external mechanical abuse, unapproved third-party alterations, or acid/chemical exposure.'
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Claimed', 'Void'],
        default: 'Active',
        index: true
    },
    documents: [{
        title: { type: String },
        url: { type: String }
    }],
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Auto compute expiry date from start date and duration before validation
warrantySchema.pre('validate', function() {
    if (this.startDate && this.durationMonths) {
        const start = new Date(this.startDate);
        const exp = new Date(start);
        exp.setMonth(exp.getMonth() + Number(this.durationMonths));
        this.expiryDate = exp;
    }
});

warrantySchema.index({ customerId: 1, status: 1 });
warrantySchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Warranty', warrantySchema);
