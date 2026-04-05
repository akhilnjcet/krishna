const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['advance_salary', 'leave', 'emergency_leave', 'salary_request', 'others'], 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number }, // For advance salary or financial requests
    startDate: { type: Date }, // For leave requests
    endDate: { type: Date },   // For leave requests
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    adminRemark: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
