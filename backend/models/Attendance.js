const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
    action: { 
        type: String, 
        required: true,
        enum: ['RECORDED', 'IMAGE_VIEWED', 'IMAGE_DELETED', 'CORRECTION_REQUESTED', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED', 'MANUALLY_EDITED']
    },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performed_by_name: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' },
    ip_address: { type: String, default: '' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    full_name: { type: String, required: true },
    login_time: { type: Date, default: Date.now },
    check_out: { type: Date },
    duration_minutes: { type: Number, default: 0 },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    shift_code: { type: String },
    is_overnight: { type: Boolean, default: false },
    is_late: { type: Boolean, default: false },
    late_minutes: { type: Number, default: 0 },
    is_early_checkout: { type: Boolean, default: false },
    early_departure_minutes: { type: Number, default: 0 },
    has_approved_early_departure: { type: Boolean, default: false },
    completion_status: { 
        type: String, 
        enum: ['IN_PROGRESS', 'COMPLETED', 'MISSING_OUT', 'MANUALLY_CLOSED'], 
        default: 'IN_PROGRESS' 
    },
    face_match_confidence: { type: Number, default: 0 },
    device_ip: { type: String, default: '' },
    device_info: { type: String, default: '' },
    status: { type: String, enum: ['success', 'fail'], default: 'success' },
    face_verified: { type: Boolean, default: false },
    type: { type: String, enum: ['IN', 'OUT'], default: 'IN' },
    action: { type: String, enum: ['Check in', 'Check out', 'IN', 'OUT'], default: 'Check in' },

    // Captured Face Image Snapshot & Retention
    face_image: { type: String, default: null }, // Protected Base64 or image URL
    face_image_deleted: { type: Boolean, default: false },
    face_image_deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    face_image_deleted_by_name: { type: String },
    face_image_deleted_at: { type: Date },

    // Geolocation verification (collected strictly on attendance submission)
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number },
        address: { type: String, default: '' }
    },

    // Verification Metadata
    verification_reason: { type: String, default: 'Biometric Face Match' },
    verification_result: { 
        type: String, 
        enum: ['success', 'fail', 'mismatch', 'manual_override'], 
        default: 'success' 
    },

    // Manual Correction Workflow
    correction_status: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    correction_details: {
        reason: { type: String },
        requested_action: { type: String, enum: ['Check in', 'Check out', 'IN', 'OUT'] },
        requested_time: { type: Date },
        requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requested_by_name: { type: String },
        requested_at: { type: Date },
        reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewed_by_name: { type: String },
        reviewed_at: { type: Date },
        review_notes: { type: String }
    },

    // Immutable Audit Trail
    audit_trail: [auditEventSchema]
}, { timestamps: true });

// Compound indexes for fast admin querying and filtering
attendanceSchema.index({ staff_id: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ correction_status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
