const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Shift name is required'], 
        trim: true 
    },
    code: { 
        type: String, 
        required: [true, 'Shift code is required'], 
        unique: true, 
        uppercase: true, 
        trim: true 
    },
    startTime: { 
        type: String, 
        required: [true, 'Start time is required'], // 24-hr "HH:mm" (e.g. "09:00", "22:00")
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in 24-hour HH:mm format']
    },
    endTime: { 
        type: String, 
        required: [true, 'End time is required'], // 24-hr "HH:mm" (e.g. "17:00", "06:00")
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in 24-hour HH:mm format']
    },
    breakDuration: { 
        type: Number, 
        default: 60, // minutes
        min: [0, 'Break duration cannot be negative'] 
    },
    expectedHours: { 
        type: Number, 
        default: 7, // hours excluding break
        min: [1, 'Expected working hours must be at least 1 hour'] 
    },
    gracePeriodMinutes: { 
        type: Number, 
        default: 10, // minutes late arrival grace
        min: [0, 'Grace period cannot be negative'] 
    },
    earlyExitAllowanceMinutes: { 
        type: Number, 
        default: 15, // minutes early exit tolerance
        min: [0, 'Early exit allowance cannot be negative'] 
    },
    earlyExitDetectionEnabled: {
        type: Boolean,
        default: true
    },
    earlyExitNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    earlyExitNotificationChannels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false }
    },
    lateDetectionEnabled: {
        type: Boolean,
        default: true
    },
    lateNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    lateNotificationChannels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false }
    },
    shiftType: { 
        type: String, 
        enum: ['Regular', 'Night', 'Flexible'], 
        default: 'Regular' 
    },
    isOvernight: { 
        type: Boolean, 
        default: false 
    },
    overtimeEnabled: { 
        type: Boolean, 
        default: true 
    },
    minOvertimeMinutes: { 
        type: Number, 
        default: 30, // minimum overtime required before counting
        min: 0 
    },
    overtimeMultiplier: { 
        type: Number, 
        default: 1.0, 
        min: 0.5 
    },
    applicableDepartments: [{ 
        type: String, 
        trim: true 
    }],
    applicableStaff: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    weeklyOffDays: [{ 
        type: String, 
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        default: 'Sunday'
    }],
    isActive: { 
        type: Boolean, 
        default: true 
    },
    isDefault: { 
        type: Boolean, 
        default: false 
    },
    autoShiftClosureEnabled: { 
        type: Boolean, 
        default: false 
    },
    autoShiftClosureMaxHours: { 
        type: Number, 
        default: 16 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }
}, { timestamps: true });

// Ensure only one default shift at any time
shiftSchema.pre('save', async function() {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
});

module.exports = mongoose.model('Shift', shiftSchema);
