const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'finance_admin', 'staff', 'driver', 'customer'],
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    staff_id: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    photoUrl: {
        type: String,
        default: ''
    },
    department: {
        type: String,
        default: 'Operations'
    },
    isSharing: {
        type: Boolean,
        default: true,
        index: true
    },
    coords: {
        lat: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },
        lng: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        }
    },
    accuracy: {
        type: Number,
        default: null
    },
    speed: {
        type: Number,
        default: null
    },
    heading: {
        type: Number,
        default: null
    },
    altitude: {
        type: Number,
        default: null
    },
    batteryLevel: {
        type: Number,
        default: null,
        min: 0,
        max: 100
    },
    isCharging: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['browser', 'capacitor_apk', 'mobile_browser', 'manual'],
        default: 'browser'
    },
    dutyStatus: {
        isOnDuty: { type: Boolean, default: true },
        attendanceStatus: { type: String, default: 'On Duty' },
        activeTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetTrip', default: null },
        activeTripNumber: { type: String, default: '' },
        vehicleRegistration: { type: String, default: '' },
        destination: { type: String, default: '' }
    },
    // Breadcrumbs for path visualization (capped at 30 points)
    recentPath: [{
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
        speed: { type: Number, default: null }
    }],
    startedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for active personnel queries
liveLocationSchema.index({ isSharing: 1, role: 1, lastUpdated: -1 });

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
