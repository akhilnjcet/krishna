const mongoose = require('mongoose');

const applicationEntrySchema = new mongoose.Schema({
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    requestedIn: { type: String, default: '' }, // e.g. "09:00" or ISO time
    requestedOut: { type: String, default: '' }, // e.g. "20:30" or ISO time
    overtimeHours: { type: Number, default: 0, min: 0 },
    issueType: { 
        type: String, 
        enum: ['unlogged_overtime', 'missing_punch_in', 'missing_punch_out', 'biometric_failure', 'site_duty', 'shift_discrepancy', 'other'],
        default: 'unlogged_overtime' 
    },
    explanation: { type: String, default: '' },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    adminRemark: { type: String, default: '' },
    approvedCheckIn: { type: String },
    approvedCheckOut: { type: String },
    approvedOvertimeHours: { type: Number }
}, { _id: true });

const auditTrailSchema = new mongoose.Schema({
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, default: 'Admin' },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['advance_salary', 'leave', 'emergency_leave', 'salary_request', 'unlogged_overtime', 'attendance_issue', 'others'], 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    reason: { type: String, default: '' },
    amount: { type: Number }, // For advance salary or financial requests
    startDate: { type: Date }, // For leave requests
    endDate: { type: Date },   // For leave requests

    // Multi-date rows for unlogged overtime or attendance issues
    entries: [applicationEntrySchema],

    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'reviewed', 'partially_approved'], 
        default: 'pending' 
    },
    adminRemark: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String },
    reviewedAt: { type: Date },
    auditTrail: [auditTrailSchema],
    createdAt: { type: Date, default: Date.now }
});

applicationSchema.index({ staffId: 1, createdAt: -1 });
applicationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Application', applicationSchema);
