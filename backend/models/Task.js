const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High', 'Critical'], 
        default: 'Medium' 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'In Progress', 'Delayed', 'Completed', 'Cancelled'], 
        default: 'Pending' 
    },
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    estimatedHours: { type: Number },
    remarks: { type: String },
    attachments: [{ type: String }],
    progressPercentage: { type: Number, default: 0 },
    workNotes: [{
        note: { type: String },
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        staffName: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    workPhotos: [{ type: String }],
    delayReason: { type: String },
    delayRemarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
