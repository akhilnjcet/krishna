const mongoose = require('mongoose');

const defectReworkSchema = new mongoose.Schema({
    defectNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
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
        required: true
    },
    jobOrderNumber: {
        type: String,
        default: '',
        index: true
    },
    productItem: {
        type: String,
        required: true,
        trim: true
    },
    defectCategory: {
        type: String,
        enum: [
            'Welding defects',
            'Incorrect measurements',
            'Cutting errors',
            'Alignment problems',
            'Surface finishing defects',
            'Painting defects',
            'Material defects',
            'Installation defects',
            'Other defects'
        ],
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    photos: [{
        type: String
    }],
    inspectionDate: {
        type: Date,
        default: Date.now
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportedByName: {
        type: String,
        required: true
    },
    responsibleDepartment: {
        type: String,
        enum: ['Fabrication', 'Welding', 'Machining', 'Assembly', 'Surface Prep & Paint', 'Site Installation', 'Stores & Material', 'General Quality'],
        default: 'Fabrication'
    },
    severity: {
        type: String,
        enum: ['Minor', 'Moderate', 'Critical'],
        default: 'Moderate'
    },
    status: {
        type: String,
        enum: [
            'Defect Reported', 
            'Under Inspection', 
            'Rework Assigned', 
            'Rework in Progress', 
            'Reinspection', 
            'Approved', 
            'Rejected', 
            'Closed'
        ],
        default: 'Defect Reported',
        index: true
    },
    // Rework Assignment & Tracking
    assignedEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedEmployeeName: {
        type: String,
        default: ''
    },
    reworkInstructions: {
        type: String,
        default: ''
    },
    reworkStartTime: {
        type: Date
    },
    reworkCompletionTime: {
        type: Date
    },
    labourHours: {
        type: Number,
        default: 0
    },
    labourHourlyRate: {
        type: Number,
        default: 0
    },
    labourCost: {
        type: Number,
        default: 0
    },
    additionalMaterialsConsumed: [{
        inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem'
        },
        materialName: { type: String },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: 'Pcs' },
        unitCost: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 }
    }],
    materialCost: {
        type: Number,
        default: 0
    },
    totalReworkCost: {
        type: Number,
        default: 0
    },
    isRepeatDefect: {
        type: Boolean,
        default: false
    },
    previousDefectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DefectRework',
        default: null
    },
    reinspectionNotes: {
        type: String,
        default: ''
    },
    reinspectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reinspectedByName: {
        type: String,
        default: ''
    },
    reinspectedAt: {
        type: Date
    },
    qcApprovalStatus: {
        type: String,
        enum: ['Pending', 'Passed', 'Failed'],
        default: 'Pending'
    },
    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' }
    }]
}, { timestamps: true });

// Auto calculate rework costs before save
defectReworkSchema.pre('save', function() {
    let matCost = 0;
    if (Array.isArray(this.additionalMaterialsConsumed)) {
        this.additionalMaterialsConsumed.forEach(m => {
            m.totalCost = parseFloat(((Number(m.quantity) || 0) * (Number(m.unitCost) || 0)).toFixed(2));
            matCost += m.totalCost;
        });
    }
    this.materialCost = parseFloat(matCost.toFixed(2));

    const hours = Number(this.labourHours) || 0;
    const rate = Number(this.labourHourlyRate) || 0;
    if (rate > 0) {
        this.labourCost = parseFloat((hours * rate).toFixed(2));
    }
    this.totalReworkCost = parseFloat((this.materialCost + (Number(this.labourCost) || 0)).toFixed(2));
});

defectReworkSchema.index({ projectId: 1, status: 1 });
defectReworkSchema.index({ defectCategory: 1 });
defectReworkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DefectRework', defectReworkSchema);
