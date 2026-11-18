const mongoose = require('mongoose');

const requestItemSchema = new mongoose.Schema({
    inventoryItemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'InventoryItem',
        required: true 
    },
    materialName: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        default: 'Raw Material' 
    },
    specification: { 
        type: String, 
        default: '' 
    },
    unit: { 
        type: String, 
        default: 'Pcs' 
    },
    requestedQty: { 
        type: Number, 
        required: true, 
        min: [0, 'Requested quantity cannot be negative'] 
    },
    approvedQty: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    issuedQty: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    consumedQty: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    returnedQty: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    wastageQty: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    unitPrice: { 
        type: Number, 
        default: 0 
    }
}, { _id: true });

const materialRequestSchema = new mongoose.Schema({
    requestNumber: { 
        type: String, 
        unique: true, 
        required: true, 
        index: true 
    },
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true, 
        index: true 
    },
    projectTitle: { 
        type: String, 
        default: '' 
    },
    jobOrderNumber: { 
        type: String, 
        default: '' 
    },
    bomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'BillOfMaterials',
        default: null
    },
    requestedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    requestedByName: { 
        type: String, 
        required: true 
    },
    priority: { 
        type: String, 
        enum: ['Normal', 'High', 'Urgent'], 
        default: 'Normal' 
    },
    items: [requestItemSchema],
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Partially Approved', 'Rejected', 'Issued', 'Completed'], 
        default: 'Pending',
        index: true 
    },
    approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    approvedByName: { 
        type: String 
    },
    approvedAt: { 
        type: Date 
    },
    rejectionReason: { 
        type: String, 
        default: '' 
    },
    allowNegativeStock: { 
        type: Boolean, 
        default: false 
    },
    notes: { 
        type: String, 
        default: '' 
    },
    auditLog: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
    }]
}, { timestamps: true });

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
