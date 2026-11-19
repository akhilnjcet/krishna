const mongoose = require('mongoose');

const driverEmergencyAlertSchema = new mongoose.Schema({
    alertNumber: {
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
    driverName: { type: String, required: true },
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

    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        address: { type: String, default: '' }
    },

    description: {
        type: String,
        default: 'Emergency SOS reported by driver'
    },

    status: {
        type: String,
        enum: ['Active', 'Acknowledged', 'Resolved'],
        default: 'Active',
        index: true
    },

    acknowledgedBy: { type: String, default: '' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date },
    notes: { type: String, default: '' },

    timestamp: { type: Date, default: Date.now }
}, {
    timestamps: true
});

driverEmergencyAlertSchema.index({ timestamp: -1 });

module.exports = mongoose.model('DriverEmergencyAlert', driverEmergencyAlertSchema);
