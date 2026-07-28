const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema({
    version: { type: Number, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    pdfData: { type: String }, // Base64 of the PDF file
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

const documentHistorySchema = new mongoose.Schema({
    documentType: { 
        type: String, 
        required: true, 
        enum: [
            'Quotation', 'Estimate', 'Invoice', 'Labour Bill', 'Salary Slip',
            'Attendance Report', 'Purchase Bill', 'Expense Report', 'Payment Receipt',
            'Project Report', 'General Report',
            'Lodge Rent Bill', 'Booking Confirmation', 'Advance Payment'
        ]
    },
    documentNumber: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Draft' },
    approvalStatus: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Sent', 'Converted'] },
    preparedBy: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    archived: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Current version original JSON data
    pdfData: { type: String }, // Current version Base64 encoded PDF
    versions: [documentVersionSchema]
});

// Indexes for fast searching and querying
documentHistorySchema.index({ documentType: 1, documentNumber: 1 });
documentHistorySchema.index({ customerId: 1 });
documentHistorySchema.index({ projectId: 1 });
documentHistorySchema.index({ createdBy: 1 });
documentHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
