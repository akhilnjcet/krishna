const mongoose = require('mongoose');

const projectLabourCostSchema = new mongoose.Schema({
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: [true, 'Project reference is required'],
        index: true 
    },
    projectTitle: { 
        type: String, 
        default: '',
        trim: true
    },
    jobOrderNumber: { 
        type: String, 
        default: '',
        trim: true,
        index: true
    },
    labourCategory: { 
        type: String, 
        required: [true, 'Labour category is required'],
        trim: true,
        default: 'General Labour'
    },
    workDescription: { 
        type: String, 
        required: [true, 'Work description is required'],
        trim: true 
    },
    workerName: { 
        type: String, 
        default: '',
        trim: true 
    },
    numberOfWorkers: { 
        type: Number, 
        default: 1, 
        min: [1, 'Number of workers must be at least 1'] 
    },
    workDate: { 
        type: Date, 
        default: Date.now,
        required: true,
        index: true 
    },
    rateType: { 
        type: String, 
        enum: ['Hourly', 'Daily', 'Piece Rate', 'Fixed Job'], 
        default: 'Daily' 
    },
    quantity: { 
        type: Number, 
        required: [true, 'Number of hours, days, or units is required'], 
        min: [0, 'Quantity cannot be negative'] 
    },
    rate: { 
        type: Number, 
        required: [true, 'Rate is required'], 
        min: [0, 'Rate cannot be negative'] 
    },
    totalAmount: { 
        type: Number, 
        required: true, 
        min: [0, 'Total labour amount cannot be negative'] 
    },
    notes: { 
        type: String, 
        default: '',
        trim: true 
    },
    attachmentUrl: { 
        type: String, 
        default: '',
        trim: true 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Paid', 'Cancelled'], 
        default: 'Approved',
        index: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    createdByName: { 
        type: String, 
        default: 'Staff' 
    },
    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String }
    }]
}, { timestamps: true });

// Auto-calculate total amount if not explicitly adjusted
projectLabourCostSchema.pre('validate', function() {
    const numWorkers = Number(this.numberOfWorkers) > 0 ? Number(this.numberOfWorkers) : 1;
    const qty = Number(this.quantity) || 0;
    const r = Number(this.rate) || 0;
    
    if (this.totalAmount === undefined || this.totalAmount === null || isNaN(this.totalAmount)) {
        if (this.rateType === 'Fixed Job') {
            this.totalAmount = parseFloat(r.toFixed(2));
        } else {
            this.totalAmount = parseFloat((qty * r * numWorkers).toFixed(2));
        }
    }
});

module.exports = mongoose.model('ProjectLabourCost', projectLabourCostSchema);
