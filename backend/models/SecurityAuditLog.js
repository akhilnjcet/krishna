const mongoose = require('mongoose');

const securityAuditLogSchema = new mongoose.Schema({
    timestamp: { 
        type: Date, 
        default: Date.now, 
        index: true 
    },
    eventType: { 
        type: String, 
        required: true,
        enum: [
            'AUTH_LOGIN_SUCCESS',
            'AUTH_LOGIN_FAILED',
            'AUTH_LOCKOUT',
            'AUTH_LOGOUT',
            'AUTH_REGISTER',
            'AUTH_PASSWORD_RESET',
            'AUTH_OTP_VERIFY_FAILED',
            'TENANT_ACCESS_SUCCESS',
            'TENANT_ACCESS_FAILED',
            'SUSPICIOUS_PROBE',
            'BRUTE_FORCE_TRIGGERED',
            'RATE_LIMIT_EXCEEDED',
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            'API_SERVER_ERROR',
            'BOT_BLOCKED',
            'SCRAPING_DETECTED'
        ],
        index: true
    },
    severity: {
        type: String,
        enum: ['INFO', 'WARN', 'CRITICAL'],
        default: 'INFO',
        index: true
    },
    identifier: { 
        type: String, 
        trim: true,
        index: true 
    }, // Sanitized username, email, or room number
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    role: { 
        type: String 
    },
    ip: { 
        type: String, 
        required: true, 
        index: true 
    },
    userAgent: { 
        type: String 
    },
    method: { 
        type: String 
    },
    path: { 
        type: String 
    },
    statusCode: { 
        type: Number 
    },
    reason: { 
        type: String 
    },
    metadata: { 
        type: mongoose.Schema.Types.Mixed 
    }
}, {
    timestamps: true
});

// Compound index for querying recent security events by severity and time
securityAuditLogSchema.index({ severity: 1, timestamp: -1 });
securityAuditLogSchema.index({ ip: 1, timestamp: -1 });

// TTL index to automatically purge audit records older than 90 days to prevent storage bloat
securityAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityAuditLog', securityAuditLogSchema);
