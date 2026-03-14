const mongoose = require('mongoose');

const workProgressSchema = new mongoose.Schema({
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    staffId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    progressPercentage: { type: Number, min: 0, max: 100, required: true },
    status: { 
        type: String, 
        enum: ['Not Started', 'In Progress', 'Completed'], 
        default: 'In Progress' 
    },
    photos: [{
        url: { type: String },
        publicId: { type: String }
    }],
    materialsUsed: { type: String },
    issues: { type: String },
    nextPlan: { type: String },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    isApproved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('WorkProgress', workProgressSchema);
