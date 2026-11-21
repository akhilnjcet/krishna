const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceType: { type: String, required: true },
    description: { type: String, default: '' },
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deadline: { type: Date },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled', 'CANCELLED', 'Cancelled', 'In Progress', 'Delayed', 'Stopped', 'Completed', 'Restarted'], default: 'pending' },
    budget: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    sitePhotos: [{ type: String }],
    location: { type: String },
    updateNotes: { type: String },
    nextNotes: { type: String },
    lastAssignmentEmailSentAt: { type: Date },
    lastTimelineEmailSentAt: { type: Date },
    lastTimelineEmailHash: { type: String },
    // Cancellation & Permanent Audit Records (Requirements 1, 2, 8, 9)
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledByName: { type: String },
    cancelledByEmail: { type: String },
    cancellationReason: { type: String },
    previousStatus: { type: String },
    cancellationAudit: [{
        cancelledAt: { type: Date, default: Date.now },
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        cancelledByName: { type: String },
        cancelledByEmail: { type: String },
        reason: { type: String, required: true },
        previousStatus: { type: String }
    }],
    timeline: [{
        title: { type: String, required: true },
        description: { type: String },
        date: { type: Date, required: true },
        status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
    }],
    startDate: { type: Date, default: Date.now },
    milestones: [{
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        assignedStaffNames: [{ type: String }],
        plannedStartDate: { type: Date },
        deadline: { type: Date, required: true },
        actualCompletionDate: { type: Date },
        status: { 
            type: String, 
            enum: ['Pending', 'In Progress', 'Completed', 'Delayed'], 
            default: 'Pending',
            index: true
        },
        progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
        completionEvidence: [{
            url: { type: String },
            notes: { type: String },
            uploadedAt: { type: Date, default: Date.now }
        }],
        notes: { type: String, default: '' },
        delayReason: { type: String, default: '' },
        weightPercentage: { type: Number, default: 10 }
    }],
    milestoneActivity: [{
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: String, default: 'Admin' },
        performedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, default: '' }
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
    handover: {
        status: {
            type: String,
            enum: ['Not Initiated', 'Pending Approval', 'Approved', 'Completed', 'Rejected'],
            default: 'Not Initiated',
            index: true
        },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedByName: { type: String, default: '' },
        requestedAt: { type: Date },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedByName: { type: String, default: '' },
        approvedAt: { type: Date },
        handoverDate: { type: Date },
        handoverNotes: { type: String, default: '' },
        rejectionReason: { type: String, default: '' },
        checklist: {
            fabricationCompleted: { type: Boolean, default: false },
            installationCompleted: { type: Boolean, default: false },
            qualityInspectionPassed: { type: Boolean, default: false },
            defectsResolved: { type: Boolean, default: false },
            siteCleared: { type: Boolean, default: false },
            deliveryCompleted: { type: Boolean, default: false },
            customerInspectionCompleted: { type: Boolean, default: false },
            customerAcceptanceReceived: { type: Boolean, default: false }
        },
        qualityInspectionStatus: {
            type: String,
            enum: ['Pending', 'Passed', 'Conditional Pass', 'Failed'],
            default: 'Pending'
        },
        pendingWorkNotes: { type: String, default: '' },
        deliveryVerificationNotes: { type: String, default: '' },
        finalPhotos: [{ type: String }],
        customerFeedback: {
            rating: { type: Number, min: 1, max: 5, default: 5 },
            comments: { type: String, default: '' },
            acceptedBy: { type: String, default: '' },
            acceptanceDate: { type: Date },
            signatureUrl: { type: String, default: '' }
        },
        certificateNumber: { type: String, default: '' },
        certificateUrl: { type: String, default: '' },
        certificateIssuedAt: { type: Date },
        documentHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentHistory', default: null }
    },
    createdAt: { type: Date, default: Date.now }
});

// Performance optimization indexes
projectSchema.index({ customerId: 1, createdAt: -1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ assignedStaff: 1 });

module.exports = mongoose.model('Project', projectSchema);
