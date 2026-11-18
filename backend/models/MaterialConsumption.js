const mongoose = require('mongoose');

const materialConsumptionSchema = new mongoose.Schema({
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
        default: '',
        index: true 
    },
    bomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'BillOfMaterials',
        default: null
    },
    materialRequestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'MaterialRequest',
        default: null
    },
    inventoryItemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'InventoryItem',
        required: true,
        index: true
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
    movementType: { 
        type: String, 
        enum: ['ISSUE', 'CONSUMPTION', 'RETURN', 'WASTAGE'], 
        required: true,
        index: true 
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: [0, 'Quantity cannot be negative'] 
    },
    unitCost: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    unitPrice: {
        type: Number,
        default: 0
    },
    totalCost: { 
        type: Number, 
        default: 0 
    },
    date: { 
        type: Date, 
        default: Date.now,
        index: true 
    },
    issuedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    issuedByName: { 
        type: String, 
        default: '' 
    },
    receivedBy: { 
        type: String, 
        default: '' 
    },
    notes: { 
        type: String, 
        default: '' 
    },
    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
    }]
}, { timestamps: true });

// Auto calculate total cost before saving
materialConsumptionSchema.pre('save', function() {
    const qty = Number(this.quantity) || 0;
    let cost = Number(this.unitCost) || 0;
    if (cost === 0 && Number(this.unitPrice) > 0) {
        cost = Number(this.unitPrice);
        this.unitCost = cost;
    }
    this.totalCost = parseFloat((qty * cost).toFixed(2));
});

module.exports = mongoose.model('MaterialConsumption', materialConsumptionSchema);
