const mongoose = require('mongoose');

const driverAssignmentHistorySchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    registrationNumber: { type: String, default: '' },
    vehicleName: { type: String, default: '' },
    assignedAt: { type: Date, default: Date.now },
    unassignedAt: { type: Date, default: null },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedByName: { type: String, default: 'Admin' },
    reason: { type: String, default: 'Initial Assignment' }
}, { _id: true });

const driverAuditTrailSchema = new mongoose.Schema({
    action: { type: String, required: true },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    performedByName: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
}, { _id: false });

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Driver full name is required'],
        trim: true
    },
    photoUrl: {
        type: String,
        default: ''
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        sparse: true,
        index: true
    },
    email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true
    },
    licenseDocUrl: {
        type: String,
        default: ''
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        sparse: true
    },
    staff_id: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Driver phone / mobile number is required'],
        trim: true
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    licenseNumber: {
        type: String,
        required: [true, 'Driving licence number is required'],
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    licenseType: {
        type: String,
        enum: [
            'LMV (Light Motor Vehicle)',
            'LMV-Commercial / Transport',
            'HMV (Heavy Motor Vehicle)',
            'Heavy Trailer (40ft / Low Bed)',
            'Medium Goods Vehicle (MGV)',
            'Crane / Heavy Equipment',
            'Hazardous Goods / Tanker',
            'Two Wheeler',
            'Other'
        ],
        default: 'LMV-Commercial / Transport'
    },
    licenseExpiryDate: {
        type: Date,
        required: [true, 'Driving licence expiry date is required'],
        index: true
    },
    emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        relation: { type: String, default: '' }
    },
    emergencyPhone: {
        type: String,
        default: ''
    },
    joiningDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Suspended'],
        default: 'Active',
        index: true
    },
    currentAssignedVehicle: {
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            default: null
        },
        registrationNumber: { type: String, default: '' },
        vehicleName: { type: String, default: '' },
        assignedAt: { type: Date, default: null }
    },
    assignmentHistory: [driverAssignmentHistorySchema],
    notes: {
        type: String,
        default: ''
    },
    auditTrail: [driverAuditTrailSchema]
}, {
    timestamps: true
});

// Virtual for license expiry status
driverSchema.virtual('isLicenseExpired').get(function() {
    if (!this.licenseExpiryDate) return false;
    return new Date(this.licenseExpiryDate) < new Date();
});

driverSchema.virtual('daysUntilLicenseExpiry').get(function() {
    if (!this.licenseExpiryDate) return null;
    const diff = new Date(this.licenseExpiryDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
