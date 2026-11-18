const mongoose = require('mongoose');

const scrapRecordSchema = new mongoose.Schema({
    scrapCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
        index: true
    },
    projectTitle: {
        type: String,
        default: ''
    },
    jobOrderNumber: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        default: null,
        index: true
    },
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    materialType: {
        type: String,
        enum: [
            'Mild Steel (MS)',
            'Stainless Steel (SS)',
            'Galvanized Iron (GI)',
            'Aluminium',
            'Copper / Brass',
            'Cast Iron',
            'Structural Pipes / Channels',
            'Plates & Flats Offcuts',
            'Consumables & Wire',
            'Other Scrap'
        ],
        default: 'Mild Steel (MS)',
        index: true
    },
    grade: {
        type: String,
        default: 'IS 2062'
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.01
    },
    unit: {
        type: String,
        default: 'kg'
    },
    estimatedUnitValue: {
        type: Number,
        default: 0
    },
    estimatedTotalValue: {
        type: Number,
        default: 0
    },
    wastageReason: {
        type: String,
        enum: [
            'Offcuts / Trimming',
            'Dimension Error / Cutting Scrap',
            'Punching / CNC Kerf Waste',
            'Welding Defect Cutout',
            'Material Handling Damage',
            'Over-Ordering Scrap',
            'Obsolete Engineering Offcuts',
            'Other Waste'
        ],
        default: 'Offcuts / Trimming',
        index: true
    },
    scrapType: {
        type: String,
        enum: ['Reusable Offcut', 'Non-Reusable Waste'],
        required: true,
        default: 'Non-Reusable Waste',
        index: true
    },
    storageLocation: {
        type: String,
        default: 'Yard Scrap Bay 1'
    },
    status: {
        type: String,
        enum: ['Recorded', 'Verified', 'Returned to Stock', 'Sold', 'Disposed'],
        default: 'Recorded',
        index: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recordedByName: {
        type: String,
        default: 'Staff Operator'
    },
    recordedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    verifiedByName: {
        type: String,
        default: ''
    },
    verifiedAt: {
        type: Date
    },
    verificationNotes: {
        type: String,
        default: ''
    },
    // Reusable Return To Stock Action
    reuseAction: {
        isReturnedToStock: { type: Boolean, default: false },
        targetInventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
        targetItemName: { type: String, default: '' },
        returnedQuantity: { type: Number, default: 0 },
        returnedAt: { type: Date },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedByName: { type: String, default: '' },
        approvalNotes: { type: String, default: '' }
    },
    // External Scrap Sale Transaction (Strictly integrated with Expense model)
    saleAction: {
        isSold: { type: Boolean, default: false },
        buyerName: { type: String, default: '' },
        buyerPhone: { type: String, default: '' },
        buyerGst: { type: String, default: '' },
        salePricePerUnit: { type: Number, default: 0 },
        totalSaleAmount: { type: Number, default: 0 },
        paymentMethod: {
            type: String,
            enum: ['cash', 'bank_transfer', 'upi', 'cheque'],
            default: 'cash'
        },
        saleDate: { type: Date },
        invoiceNumber: { type: String, default: '' },
        expenseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Expense',
            default: null
        },
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        processedByName: { type: String, default: '' },
        saleNotes: { type: String, default: '' }
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

scrapRecordSchema.index({ projectId: 1, scrapType: 1 });
scrapRecordSchema.index({ status: 1, recordedAt: -1 });

module.exports = mongoose.model('ScrapRecord', scrapRecordSchema);
