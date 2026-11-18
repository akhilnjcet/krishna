const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
    inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    itemCode: {
        type: String,
        default: ''
    },
    unit: {
        type: String,
        default: 'Pcs'
    },
    requestedQuantity: {
        type: Number,
        required: true,
        min: [0.01, 'Quantity must be greater than zero']
    },
    dispatchedQuantity: {
        type: Number,
        default: 0
    },
    receivedQuantity: {
        type: Number,
        default: 0
    },
    damagedQuantity: {
        type: Number,
        default: 0
    },
    missingQuantity: {
        type: Number,
        default: 0
    },
    conditionOnArrival: {
        type: String,
        enum: ['Good', 'Damaged', 'Partial Damage', 'Missing'],
        default: 'Good'
    },
    discrepancyNotes: {
        type: String,
        default: ''
    }
}, { _id: true });

const stockTransferSchema = new mongoose.Schema({
    transferNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true
    },
    sourceWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    sourceWarehouseName: {
        type: String,
        required: true
    },
    destinationWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    destinationWarehouseName: {
        type: String,
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    projectTitle: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: [
            'Draft', 
            'Requested', 
            'Approved', 
            'Rejected', 
            'Dispatched', 
            'In Transit', 
            'Received', 
            'Discrepancy Reported', 
            'Reconciled', 
            'Cancelled'
        ],
        default: 'Requested',
        index: true
    },
    items: [transferItemSchema],
    transportMethod: {
        type: String,
        default: 'Internal Vehicle' // e.g. Pickup Truck, Courier, Hand Carry
    },
    vehicleNumber: {
        type: String,
        default: ''
    },
    driverName: {
        type: String,
        default: ''
    },
    driverPhone: {
        type: String,
        default: ''
    },
    trackingReference: {
        type: String,
        default: ''
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedByName: {
        type: String,
        default: ''
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedByName: {
        type: String,
        default: ''
    },
    approvedAt: {
        type: Date
    },
    dispatchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    dispatchedByName: {
        type: String,
        default: ''
    },
    dispatchedAt: {
        type: Date
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    receivedByName: {
        type: String,
        default: ''
    },
    receivedAt: {
        type: Date
    },
    notes: {
        type: String,
        default: ''
    },
    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' }
    }]
}, { timestamps: true });

stockTransferSchema.index({ sourceWarehouseId: 1 });
stockTransferSchema.index({ destinationWarehouseId: 1 });
stockTransferSchema.index({ status: 1 });
stockTransferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
