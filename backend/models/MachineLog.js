const mongoose = require('mongoose');

const machineLogSchema = new mongoose.Schema({
    machineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
        index: true
    },
    machineName: { type: String, required: true },
    machineCode: { type: String, default: '' },
    logType: {
        type: String,
        enum: ['OPERATION', 'DOWNTIME', 'IDLE', 'MAINTENANCE'],
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationHours: { type: Number, required: true, default: 0 },
    plannedHours: { type: Number, default: 8 },
    operatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    operatorName: { type: String, default: '' },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    productionPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionPlan',
        default: null
    },
    stageName: { type: String, default: '' },
    // Downtime attributes
    downtimeReason: {
        type: String,
        enum: [
            'None',
            'Mechanical Breakdown',
            'Electrical Failure',
            'Hydraulic / Pneumatic Issue',
            'Tool Wear / Blade Replacement',
            'Power Outage / Generator Switch',
            'Material Shortage',
            'Operator Unavailable',
            'Scheduled Preventive Maintenance',
            'Other'
        ],
        default: 'None'
    },
    downtimeDescription: { type: String, default: '' },
    productionImpact: {
        type: String,
        enum: ['None', 'Minor Delay (<1 hr)', 'Moderate Delay (1-4 hrs)', 'Severe Stoppage (>4 hrs)', 'Job Rescheduled'],
        default: 'None'
    },
    maintenanceCost: { type: Number, default: 0 },
    toolRepairId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ToolRepair',
        default: null
    },
    notes: { type: String, default: '' },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recordedByName: { type: String, default: 'Supervisor' }
}, { timestamps: true });

module.exports = mongoose.model('MachineLog', machineLogSchema);
