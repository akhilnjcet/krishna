const mongoose = require('mongoose');

const resetAuditLogSchema = new mongoose.Schema({
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
    ipAddress: { 
        type: String 
    },
    backupReference: { 
        type: String, 
        required: true 
    },
    backupLocation: { 
        type: String, 
        required: true 
    },
    backupSize: { 
        type: String 
    },
    totalDocumentsBackedUp: { 
        type: Number, 
        default: 0 
    },
    totalRecordsDeleted: { 
        type: Number, 
        default: 0 
    },
    deletedByCategory: {
        lodgeManager: { count: Number, collections: [String] },
        financeAccounting: { count: Number, collections: [String] },
        operationsEngineering: { count: Number, collections: [String] },
        staffHr: { count: Number, collections: [String] },
        alertsLogs: { count: Number, collections: [String] }
    },
    preservedVerification: {
        userAccountsCount: Number,
        systemSettingsCount: Number,
        status: String
    },
    outcome: { 
        type: String, 
        enum: ['SUCCESS', 'FAILED', 'ABORTED', 'ROLLBACK'], 
        default: 'SUCCESS' 
    },
    errorMessage: { 
        type: String 
    },
    executedAt: { 
        type: Date, 
        default: Date.now 
    },
    durationMs: { 
        type: Number 
    }
}, { timestamps: true });

resetAuditLogSchema.index({ executedAt: -1 });

module.exports = mongoose.model('ResetAuditLog', resetAuditLogSchema);
