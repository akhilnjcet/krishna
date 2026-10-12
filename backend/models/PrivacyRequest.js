const mongoose = require('mongoose');

const privacyRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    requestType: {
        type: String,
        required: true,
        enum: ['data_access', 'data_correction', 'account_deletion']
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Completed'],
        default: 'Submitted',
        index: true
    },
    submittedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedByName: {
        type: String
    },
    reviewedAt: {
        type: Date
    },
    resolutionNote: {
        type: String,
        default: ''
    },
    completedAt: {
        type: Date
    }
}, { timestamps: true });

privacyRequestSchema.index({ userId: 1, submittedAt: -1 });

module.exports = mongoose.model('PrivacyRequest', privacyRequestSchema);
