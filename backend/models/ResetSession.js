const mongoose = require('mongoose');

const resetSessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    adminEmail: { 
        type: String, 
        required: true 
    },
    adminName: { 
        type: String 
    },
    otpHash: { 
        type: String 
    },
    attempts: { 
        type: Number, 
        default: 0 
    },
    maxAttempts: { 
        type: Number, 
        default: 5 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    resetToken: { 
        type: String, 
        index: true 
    },
    tokenExpiresAt: { 
        type: Date 
    },
    clientIp: { 
        type: String 
    },
    status: { 
        type: String, 
        enum: ['PENDING', 'VERIFIED', 'CONSUMED', 'CANCELLED'], 
        default: 'PENDING' 
    }
}, { timestamps: true });

// Auto-purge sessions after 1 hour (3600 seconds)
resetSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('ResetSession', resetSessionSchema);
