const mongoose = require('mongoose');

const driverIssueSchema = new mongoose.Schema({
    issueNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },
    driverUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, default: '' },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    vehicleRegistration: { type: String, default: '' },

    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FleetTrip',
        default: null
    },
    tripNumber: { type: String, default: '' },

    category: {
        type: String,
        enum: [
            'Vehicle breakdown',
            'Accident',
            'Tyre problem',
            'Engine problem',
            'Fuel issue',
            'Route problem',
            'Delivery delay',
            'Document issue',
            'Other'
        ],
        required: true,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Issue description is required'],
        trim: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    photos: [{ type: String }],
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        address: { type: String, default: '' }
    },

    status: {
        type: String,
        enum: ['Submitted', 'Acknowledged', 'Under Review', 'In Progress', 'Resolved', 'Closed'],
        default: 'Submitted',
        index: true
    },

    resolutionNotes: { type: String, default: '' },
    acknowledgedBy: { type: String, default: '' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date },

    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, default: 'System' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' }
    }]
}, {
    timestamps: true
});

driverIssueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DriverIssue', driverIssueSchema);
