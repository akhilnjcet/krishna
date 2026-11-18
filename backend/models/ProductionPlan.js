const mongoose = require('mongoose');

const productionStageSchema = new mongoose.Schema({
    stageName: {
        type: String,
        required: true,
        trim: true
    },
    sequence: {
        type: Number,
        default: 1
    },
    machineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        default: null
    },
    machineName: { type: String, default: '' },
    machineCode: { type: String, default: '' },
    assignedStaff: [{
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        role: { type: String }
    }],
    plannedQuantity: { type: Number, default: 0 },
    completedQuantity: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    plannedStartDate: { type: Date, required: true },
    plannedEndDate: { type: Date, required: true },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },
    status: {
        type: String,
        enum: ['Pending', 'Ready', 'In Progress', 'Completed', 'Delayed', 'Blocked'],
        default: 'Pending',
        index: true
    },
    delayReason: { type: String, default: '' },
    delayMinutes: { type: Number, default: 0 },
    qcStatus: {
        type: String,
        enum: ['Pending', 'Passed', 'Rework Required', 'Waived'],
        default: 'Pending'
    },
    notes: { type: String, default: '' },
    logs: [{
        timestamp: { type: Date, default: Date.now },
        recordedBy: { type: String },
        quantityProduced: { type: Number, default: 0 },
        hoursSpent: { type: Number, default: 0 },
        notes: { type: String }
    }]
});

const productionPlanSchema = new mongoose.Schema({
    planNumber: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    projectTitle: { type: String, default: '' },
    jobOrderNumber: {
        type: String,
        default: '',
        trim: true,
        index: true
    },
    bomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillOfMaterials',
        default: null
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    customerName: { type: String, default: '' },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium',
        index: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Scheduled', 'In Production', 'On Hold', 'Completed', 'Delayed', 'Cancelled'],
        default: 'Draft',
        index: true
    },
    totalPlannedQuantity: { type: Number, default: 1 },
    totalCompletedQuantity: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    plannedStartDate: { type: Date, required: true },
    plannedCompletionDate: { type: Date, required: true },
    actualStartDate: { type: Date },
    actualCompletionDate: { type: Date },
    stages: [productionStageSchema],
    hasConflicts: { type: Boolean, default: false },
    conflictDetails: [{
        type: { type: String }, // 'MACHINE_CONFLICT' | 'STAFF_CONFLICT'
        entityId: { type: String },
        entityName: { type: String },
        conflictingPlanNumber: { type: String },
        stageName: { type: String },
        overlapStart: { type: Date },
        overlapEnd: { type: Date }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByName: { type: String, default: 'Production Supervisor' },
    notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ProductionPlan', productionPlanSchema);
