const mongoose = require('mongoose');

const projectTransportCostSchema = new mongoose.Schema({
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
    transportDate: { 
        type: Date, 
        default: Date.now,
        required: true,
        index: true 
    },
    transportType: { 
        type: String, 
        required: [true, 'Transport type is required'],
        trim: true,
        default: 'Flatbed Trailer'
    },
    vehicleNumber: { 
        type: String, 
        default: '',
        trim: true 
    },
    driverName: { 
        type: String, 
        default: '',
        trim: true 
    },
    startingLocation: { 
        type: String, 
        default: '',
        trim: true 
    },
    destination: { 
        type: String, 
        default: '',
        trim: true 
    },
    transportDescription: { 
        type: String, 
        default: '',
        trim: true 
    },
    numberOfTrips: { 
        type: Number, 
        default: 1, 
        min: [1, 'Number of trips must be at least 1'] 
    },
    freightCharge: { 
        type: Number, 
        default: 0, 
        min: [0, 'Freight charge cannot be negative'] 
    },
    fuelCharge: { 
        type: Number, 
        default: 0, 
        min: [0, 'Fuel charge cannot be negative'] 
    },
    loadingUnloadingCharge: { 
        type: Number, 
        default: 0, 
        min: [0, 'Loading/unloading charge cannot be negative'] 
    },
    tollCharge: { 
        type: Number, 
        default: 0, 
        min: [0, 'Toll charge cannot be negative'] 
    },
    otherCharge: { 
        type: Number, 
        default: 0, 
        min: [0, 'Other transport charge cannot be negative'] 
    },
    totalTransportCost: { 
        type: Number, 
        required: true, 
        min: [0, 'Total transport cost cannot be negative'] 
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

// Auto-calculate total transport cost if not explicitly specified
projectTransportCostSchema.pre('validate', function() {
    const freight = Number(this.freightCharge) || 0;
    const fuel = Number(this.fuelCharge) || 0;
    const loading = Number(this.loadingUnloadingCharge) || 0;
    const toll = Number(this.tollCharge) || 0;
    const other = Number(this.otherCharge) || 0;
    const sum = freight + fuel + loading + toll + other;

    if (this.totalTransportCost === undefined || this.totalTransportCost === null || isNaN(this.totalTransportCost) || (this.totalTransportCost === 0 && sum > 0)) {
        this.totalTransportCost = parseFloat(sum.toFixed(2));
    }
});

module.exports = mongoose.model('ProjectTransportCost', projectTransportCostSchema);
