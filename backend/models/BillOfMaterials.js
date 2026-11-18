const mongoose = require('mongoose');

const bomItemSchema = new mongoose.Schema({
    inventoryItemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'InventoryItem',
        default: null
    },
    materialName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    category: { 
        type: String, 
        default: 'Raw Material',
        trim: true
    },
    specification: { 
        type: String, 
        default: '',
        trim: true
    },
    requiredQty: { 
        type: Number, 
        required: true, 
        min: [0, 'Quantity cannot be negative'] 
    },
    unit: { 
        type: String, 
        default: 'Pcs',
        trim: true
    },
    estimatedUnitPrice: { 
        type: Number, 
        default: 0, 
        min: [0, 'Unit price cannot be negative'] 
    },
    estimatedTotalCost: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    notes: { 
        type: String, 
        default: '' 
    }
}, { _id: true });

const billOfMaterialsSchema = new mongoose.Schema({
    bomNumber: { 
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
        default: '', 
        trim: true,
        index: true
    },
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    customerName: { 
        type: String, 
        default: '' 
    },
    customerPhone: { 
        type: String, 
        default: '' 
    },
    description: { 
        type: String, 
        default: '' 
    },
    items: [bomItemSchema],

    // Overall Estimated Cost Breakdown
    totalEstimatedMaterialCost: { 
        type: Number, 
        default: 0 
    },
    estimatedLabourHours: { 
        type: Number, 
        default: 0 
    },
    estimatedLabourRate: { 
        type: Number, 
        default: 0 
    },
    estimatedLabourCost: { 
        type: Number, 
        default: 0 
    },
    estimatedTransportCost: { 
        type: Number, 
        default: 0 
    },
    estimatedOtherCost: { 
        type: Number, 
        default: 0 
    },
    totalEstimatedCost: { 
        type: Number, 
        default: 0 
    },

    status: { 
        type: String, 
        enum: ['Draft', 'Approved', 'Active', 'Completed', 'Archived'], 
        default: 'Draft',
        index: true 
    },
    version: { 
        type: Number, 
        default: 1 
    },
    warningThresholdPercentage: { 
        type: Number, 
        default: 100 // Configurable cost overrun alert threshold (%)
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    createdByName: { 
        type: String, 
        default: 'System Admin' 
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
    notes: { 
        type: String, 
        default: '' 
    }
}, { timestamps: true });

// Auto calculate item costs and summary before saving
billOfMaterialsSchema.pre('save', function() {
    if (!this.items && this.materials) {
        this.items = this.materials;
    }

    let materialCost = 0;
    if (Array.isArray(this.items)) {
        this.items.forEach(item => {
            const qty = Number(item.requiredQty ?? item.requiredQuantity) || 0;
            if (item.requiredQty === undefined && item.requiredQuantity !== undefined) {
                item.requiredQty = item.requiredQuantity;
            }
            const price = Number(item.estimatedUnitPrice) || 0;
            item.estimatedTotalCost = parseFloat((qty * price).toFixed(2));
            materialCost += item.estimatedTotalCost;
        });
    }
    this.totalEstimatedMaterialCost = parseFloat(materialCost.toFixed(2));

    let labourCost = (Number(this.estimatedLabourHours) || 0) * (Number(this.estimatedLabourRate) || 0);
    if (labourCost === 0 && Number(this.estimatedLabourCost) > 0) {
        labourCost = Number(this.estimatedLabourCost);
    }
    this.estimatedLabourCost = parseFloat(labourCost.toFixed(2));

    if (!this.estimatedTransportCost && this.estimatedTransportationCost) {
        this.estimatedTransportCost = Number(this.estimatedTransportationCost);
    }
    if (!this.estimatedOtherCost && this.estimatedOtherExpenses) {
        this.estimatedOtherCost = Number(this.estimatedOtherExpenses);
    }

    const total = this.totalEstimatedMaterialCost + 
                  this.estimatedLabourCost + 
                  (Number(this.estimatedTransportCost) || 0) + 
                  (Number(this.estimatedOtherCost) || 0);
    this.totalEstimatedCost = parseFloat(total.toFixed(2));
});

module.exports = mongoose.model('BillOfMaterials', billOfMaterialsSchema);
