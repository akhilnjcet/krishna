const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: [
            'customer',
            'staff',
            'attendance',
            'face_verification',
            'leave',
            'advance',
            'salary',
            'project',
            'inventory',
            'material',
            'quote',
            'invoice',
            'payment',
            'chat',
            'system',
            'security',
            'general'
        ],
        default: 'general',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    recipientRole: {
        type: String,
        enum: ['admin', 'staff', 'customer', 'all'],
        default: 'admin',
        index: true
    },
    recipientUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        default: null
    },
    senderUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    link: {
        type: String,
        default: ''
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date,
        default: null
    },
    channels: [{
        name: {
            type: String,
            enum: ['in_app', 'web_push', 'apk_push', 'desktop', 'sound', 'email'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'delivered', 'failed', 'skipped'],
            default: 'delivered'
        },
        error: {
            type: String,
            default: null
        }
    }],
    deliveryStatus: {
        type: String,
        enum: ['delivered', 'pending', 'failed'],
        default: 'delivered',
        index: true
    },
    failureReason: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes for rapid notification polling and unread counting
notificationSchema.index({ recipientRole: 1, recipientUser: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
