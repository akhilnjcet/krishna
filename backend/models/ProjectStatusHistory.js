const mongoose = require('mongoose');

const projectStatusHistorySchema = new mongoose.Schema({
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    projectName: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['In Progress', 'Delayed', 'Stopped', 'Completed', 'Restarted'], 
        required: true 
    },
    reason: { 
        type: String 
    },
    remarks: { 
        type: String 
    },
    expectedResumeDate: { 
        type: Date 
    },
    reportedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    reportedAt: { 
        type: Date, 
        default: Date.now 
    },
    resolvedStatus: { 
        type: String, 
        enum: ['Pending', 'Resolved', 'N/A'], 
        default: 'N/A' 
    },
    restartDate: { 
        type: Date 
    }
}, { timestamps: true });

module.exports = mongoose.model('ProjectStatusHistory', projectStatusHistorySchema);
