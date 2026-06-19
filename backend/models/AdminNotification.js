const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    projectName: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Delayed', 'Stopped', 'Restarted', 'In Progress', 'Completed'],
        required: true
    },
    title: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    reason: { 
        type: String 
    },
    remarks: { 
        type: String 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Low'
    },
    status: {
        type: String,
        enum: ['Active', 'Acknowledged', 'Resolved'],
        default: 'Active'
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    },
    resolutionNotes: {
        type: String
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
