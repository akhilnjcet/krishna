const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
    
    // Staff specific fields
    staff_id: { type: String, unique: true, sparse: true },
    phone: { type: String },
    phoneNumber: { type: String },
    department: { type: String },
    designation: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    faceDescriptor: { type: [Number], default: [] },
    profilePhoto: { type: String },
    joiningDate: { type: Date, default: Date.now },
    address: { type: String },
    emergencyContact: { type: String },

    createdAt: { type: Date, default: Date.now },
    last_login: { type: Date },
    
    // Financial Specific Fields
    upi_id: { type: String },
    bank_name: { type: String },
    account_number: { type: String },
    ifsc_code: { type: String },
    base_salary: { type: Number, default: 0 },
    salaryType: { type: String, enum: ['Monthly', 'Daily Wage', 'Contract'], default: 'Monthly' },
    overtimeRate: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    deductionAmount: { type: Number, default: 0 },
    standardWorkingHoursPerDay: { type: Number, default: 8 },
    workingDaysPerMonth: { type: Number, default: 26 },
    autoSalaryCalculation: { type: Boolean, default: true },
    otApprovalRequired: { type: Boolean, default: true },

    // Email OTP Auth & Password Reset Fields (Hashed for security)
    resetOTP: { type: String }, // Legacy compatibility
    otpExpiry: { type: Date }, // Legacy compatibility
    resetPasswordHash: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordAttempts: { type: Number, default: 0 },

    // Account Lockout / Brute-Force Defense
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Email Verification Fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationHash: { type: String },
    emailVerificationExpires: { type: Date },
    emailVerificationAttempts: { type: Number, default: 0 },

    // Policy & Terms Acceptance Tracking
    policyAcceptedAt: { type: Date },
    policyVersionAccepted: { type: String, default: '1.0' },
    termsAccepted: { type: Boolean, default: false },
    privacyAcknowledged: { type: Boolean, default: false },

    // Privacy & Account Lifecycle
    deletionStatus: { 
        type: String, 
        enum: ['none', 'pending', 'anonymized', 'deleted'], 
        default: 'none' 
    },
    deletionRequestedAt: { type: Date }
});

// Helper method to check if user account is currently locked out
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Helper method to compare passwords securely via bcrypt
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password || !candidatePassword) return false;
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
