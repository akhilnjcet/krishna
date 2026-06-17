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
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
