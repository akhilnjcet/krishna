const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['tool', 'material'],
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true,
        index: true
    }, // Tool code / Asset number / SKU
    category: {
        type: String,
        default: 'General'
    },
    location: {
        type: String,
        default: 'Main Workshop Store'
    },
    // Multi-location stock breakdown
    locationStock: [{
        warehouseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse'
        },
        warehouseName: { type: String, default: 'Main Warehouse' },
        quantity: { type: Number, default: 0 },
        minThreshold: { type: Number, default: 5 }
    }],
    qrCode: {
        type: String,
        trim: true,
        index: true
    },
    barcode: {
        type: String,
        trim: true,
        index: true
    },
    notes: {
        type: String,
        default: ''
    },

    // ─── Tool-Specific Attributes ───
    brand: {
        type: String,
        default: ''
    },
    modelNumber: {
        type: String,
        default: ''
    },
    serialNumber: {
        type: String,
        default: ''
    },
    purchaseCost: {
        type: Number,
        default: 0
    },
    purchaseDate: {
        type: Date
    },
    condition: {
        type: String,
        enum: ['New', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Total Loss'],
        default: 'Good'
    },
    status: {
        type: String,
        enum: ['Available', 'Assigned', 'In Repair', 'Total Loss'],
        default: 'Available',
        index: true
    },
    // Active assignment details when status is 'Assigned'
    currentAssignment: {
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        staffName: { type: String },
        staffCode: { type: String },
        assignedDate: { type: Date },
        returnByDate: { type: Date },
        purpose: { type: String },
        assignedBy: { type: String }
    },
    // Full assignment and return audit history
    assignmentHistory: [{
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        staffName: { type: String },
        staffCode: { type: String },
        assignedDate: { type: Date },
        returnByDate: { type: Date },
        actualReturnDate: { type: Date },
        returnCondition: { type: String },
        returnNotes: { type: String },
        assignedBy: { type: String },
        receivedBy: { type: String }
    }],

    // ─── Material / Product Specific Attributes ───
    quantity: {
        type: Number,
        default: 0
    },
    unit: {
        type: String,
        default: 'Pcs' // Pcs, Kg, Meters, Pack, Box, Litres, Bags, Bundles
    },
    unitPrice: {
        type: Number,
        default: 0
    },
    minThreshold: {
        type: Number,
        default: 5 // Minimum stock level for low-stock warning
    },
    stockMovements: [{
        type: {
            type: String,
            enum: ['IN', 'OUT', 'ADJUSTMENT'],
            default: 'IN'
        },
        quantity: {
            type: Number,
            required: true
        },
        previousQuantity: { type: Number },
        newQuantity: { type: Number },
        reason: { type: String },
        reference: { type: String }, // e.g. PO number, Project ID
        location: { type: String, default: '' },
        performedBy: { type: String },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
