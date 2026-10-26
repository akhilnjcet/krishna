const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    clientEmail: {
        type: String,
        required: true,
        trim: true
    },
    clientRole: {
        type: String,
        default: 'customer'
    },
    projectId: {
        type: String,
        required: true,
        trim: true
    },
    projectTitle: {
        type: String,
        required: true,
        trim: true
    },
    reason: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'closed'],
        default: 'pending'
    },
    chatId: {
        type: String,
        default: ''
    },
    supportLink: {
        type: String,
        default: ''
    },
    firestoreId: {
        type: String,
        default: ''
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    closedBy: {
        type: String
    },
    closedAt: {
        type: Date
    },
    adminEmailDelivery: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        to: { type: String },
        error: { type: String }
    },
    clientEmailDelivery: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
        to: { type: String },
        error: { type: String }
    }
}, {
    timestamps: true
});

// Index to quickly find pending requests and avoid duplicates
supportRequestSchema.index({ projectId: 1, clientEmail: 1, status: 1 });
supportRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
