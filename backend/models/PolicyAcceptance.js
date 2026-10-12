const mongoose = require('mongoose');

const policyAcceptanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    userName: {
        type: String,
        default: ''
    },
    policyType: {
        type: String,
        required: true,
        enum: ['privacy', 'terms', 'both']
    },
    policyVersion: {
        type: String,
        required: true,
        trim: true
    },
    acceptedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    }
}, { timestamps: true });

policyAcceptanceSchema.index({ userId: 1, policyType: 1, policyVersion: 1 });

module.exports = mongoose.model('PolicyAcceptance', policyAcceptanceSchema);
