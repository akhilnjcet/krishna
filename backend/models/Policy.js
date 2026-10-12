const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    policyType: {
        type: String,
        required: true,
        enum: ['privacy', 'terms']
    },
    version: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        default: ''
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedByName: {
        type: String,
        default: 'System Administrator'
    },
    publishedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    isCurrent: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

policySchema.index({ policyType: 1, version: 1 }, { unique: true });
policySchema.index({ policyType: 1, isCurrent: 1 });

module.exports = mongoose.model('Policy', policySchema);
