const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
    version: { type: Number, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    pdfData: { type: String }, // Base64 or URL
    fileUrl: { type: String },
    fileName: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

const documentHistorySchema = new mongoose.Schema({
    documentType: { 
        type: String, 
        required: true, 
        enum: [
            // Standard generated documents
            'Quotation', 'Estimate', 'Invoice', 'Tax Invoice', 'Labour Bill', 'Transport Bill', 'Rental Bill', 'Salary Slip',
            'Attendance Report', 'Purchase Bill', 'Expense Report', 'Payment Receipt',
            'Project Report', 'General Report', 'LetterPad', 'Digital LetterPad', 'Delivery Challan',
            'Lodge Rent Bill', 'Booking Confirmation', 'Advance Payment',
            // Industrial Business Documents
            'Customer Documents',
            'Project Documents',
            'Technical Drawings',
            'Site Photographs',
            'Purchase Documents',
            'GRN Documents',
            'Quality Inspection Reports',
            'Warranty Certificates',
            'Service Reports',
            'Project Completion Certificate',
            'Handover Report',
            'Agreements',
            'Employee Documents',
            'Other Business Documents'
        ],
        index: true
    },
    title: { 
        type: String, 
        default: '' 
    },
    documentNumber: { 
        type: String, 
        required: true,
        index: true 
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null,
        index: true 
    },
    manualCustomerId: {
        type: String,
        default: '',
        index: true
    },
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project',
        default: null,
        index: true 
    },
    jobOrderNumber: {
        type: String,
        default: '',
        index: true
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    createdByName: {
        type: String,
        default: ''
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        default: 'Draft' 
    },
    approvalStatus: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Approved', 'Rejected', 'Sent', 'Converted'] 
    },
    preparedBy: { 
        type: String, 
        default: '' 
    },
    totalAmount: { 
        type: Number, 
        default: 0 
    },
    version: { 
        type: Number, 
        default: 1 
    },
    archived: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    data: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    }, // Current version original JSON data
    pdfData: { 
        type: String 
    }, // Current version Base64 encoded PDF or URL
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    fileSize: {
        type: Number,
        default: 0
    },
    mimeType: {
        type: String,
        default: ''
    },
    tags: [{
        type: String
    }],
    expiryDate: {
        type: Date,
        default: null,
        index: true
    },
    reminderEnabled: {
        type: Boolean,
        default: false
    },
    accessRoles: [{
        type: String,
        default: ['admin', 'manager', 'staff']
    }],
    versions: [documentVersionSchema],
    auditLogs: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' }
    }]
}, { timestamps: true });

// Indexes for fast searching and querying
documentHistorySchema.index({ documentType: 1, documentNumber: 1 });
documentHistorySchema.index({ tags: 1 });
documentHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
