const mongoose = require('mongoose');

const servicePartSchema = new mongoose.Schema({
    inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        default: null
    },
    partName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    unitCost: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    isChargeable: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const serviceRequestSchema = new mongoose.Schema({
    complaintNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    warrantyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warranty',
        default: null,
        index: true
    },
    warrantyNumber: {
        type: String,
        default: ''
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        default: ''
    },
    customerEmail: {
        type: String,
        default: ''
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    projectTitle: {
        type: String,
        required: true
    },
    deliveredItem: {
        type: String,
        required: true
    },
    issueDescription: {
        type: String,
        required: true
    },
    photographs: [{
        type: String
    }],
    complaintDate: {
        type: Date,
        default: Date.now
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Emergency'],
        default: 'Medium',
        index: true
    },
    warrantyStatus: {
        type: String,
        enum: ['Under Warranty', 'Out of Warranty', 'Warranty Void', 'Under Verification'],
        default: 'Under Verification'
    },
    status: {
        type: String,
        enum: [
            'Complaint Received', 
            'Under Review', 
            'Technician Assigned', 
            'Visit Scheduled', 
            'Diagnosis in Progress', 
            'Repair in Progress', 
            'Customer Confirmation', 
            'Closed',
            'Cancelled'
        ],
        default: 'Complaint Received',
        index: true
    },
    assignedTechnicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedTechnicianName: {
        type: String,
        default: ''
    },
    scheduledVisitDate: {
        type: Date
    },
    diagnosisNotes: {
        type: String,
        default: ''
    },
    repairActionsTaken: {
        type: String,
        default: ''
    },
    partsConsumed: [servicePartSchema],
    labourHours: {
        type: Number,
        default: 0
    },
    labourCost: {
        type: Number,
        default: 0
    },
    partsCost: {
        type: Number,
        default: 0
    },
    totalServiceCost: {
        type: Number,
        default: 0
    },
    customerChargeableAmount: {
        type: Number,
        default: 0
    },
    isCustomerPaid: {
        type: Boolean,
        default: false
    },
    customerFeedbackRating: {
        type: Number, // 1 to 5
        min: 1,
        max: 5,
        default: null
    },
    customerFeedbackRemarks: {
        type: String,
        default: ''
    },
    customerSignOffDate: {
        type: Date
    },
    completionReportUrl: {
        type: String,
        default: ''
    },
    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' }
    }]
}, { timestamps: true });

// Auto calculate service costs before save
serviceRequestSchema.pre('save', function() {
    let pCost = 0;
    let chargeablePartCost = 0;
    if (Array.isArray(this.partsConsumed)) {
        this.partsConsumed.forEach(part => {
            const qty = Number(part.quantity) || 0;
            const cost = Number(part.unitCost) || 0;
            part.totalCost = parseFloat((qty * cost).toFixed(2));
            pCost += part.totalCost;
            if (part.isChargeable) {
                chargeablePartCost += part.totalCost;
            }
        });
    }
    this.partsCost = parseFloat(pCost.toFixed(2));
    this.totalServiceCost = parseFloat((this.partsCost + (Number(this.labourCost) || 0)).toFixed(2));

    // If out of warranty, total service cost is chargeable to customer unless overridden
    if (this.warrantyStatus === 'Out of Warranty' || this.warrantyStatus === 'Warranty Void') {
        if (!this.customerChargeableAmount) {
            this.customerChargeableAmount = this.totalServiceCost;
        }
    } else if (this.warrantyStatus === 'Under Warranty') {
        if (!this.customerChargeableAmount) {
            this.customerChargeableAmount = parseFloat(chargeablePartCost.toFixed(2));
        }
    }
});

serviceRequestSchema.index({ customerId: 1, status: 1 });
serviceRequestSchema.index({ assignedTechnicianId: 1, status: 1 });
serviceRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
