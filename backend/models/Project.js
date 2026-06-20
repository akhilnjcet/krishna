const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceType: { type: String, required: true },
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deadline: { type: Date },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled', 'In Progress', 'Delayed', 'Stopped', 'Completed', 'Restarted'], default: 'pending' },
    budget: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    sitePhotos: [{ type: String }],
    location: { type: String },
    updateNotes: { type: String },
    nextNotes: { type: String },
    timeline: [{
        title: { type: String, required: true },
        description: { type: String },
        date: { type: Date, required: true },
        status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
    }],
    timelineStatus: {
        type: String,
        enum: ['None', 'Proposed by Staff', 'Sent to Client'],
        default: 'None'
    },
    discount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    paidCash: { type: Number, default: 0 },
    paidOnline: { type: Number, default: 0 },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partially-paid', 'fully-paid'],
        default: 'unpaid'
    },
    additionalWork: [{
        title: { type: String, required: true },
        description: { type: String },
        amount: { type: Number, default: 0 },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        requestedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
