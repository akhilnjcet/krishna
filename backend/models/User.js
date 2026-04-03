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

    createdAt: { type: Date, default: Date.now },
    last_login: { type: Date },
    
    // Financial Specific Fields
    upi_id: { type: String },
    bank_name: { type: String },
    account_number: { type: String },
    ifsc_code: { type: String },
    base_salary: { type: Number, default: 0 },

    // Email OTP Auth Fields
    resetOTP: { type: String },
    otpExpiry: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
