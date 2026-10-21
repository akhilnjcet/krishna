const mongoose = require('mongoose');

const toolRepairSchema = new mongoose.Schema({
    toolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true,
        index: true
    },
    toolName: {
        type: String,
        required: true
    },
    toolCode: {
        type: String,
        default: ''
    },
    reportedBy: {
        type: String,
        default: 'Workshop Supervisor'
    },
    reportedDate: {
        type: Date,
        default: Date.now
    },
    issueDescription: {
        type: String,
        required: true
    },
    repairVendor: {
        type: String,
        default: 'In-House Workshop'
    },
    status: {
        type: String,
        enum: ['Pending', 'In Workshop', 'Under Repair', 'In Progress', 'Repaired', 'Total loss', 'Total Loss'],
        default: 'Pending',
        index: true
    },
    repairCost: {
        type: Number,
        default: 0
    },
    outcome: {
        type: String,
        enum: ['Pending', 'Repaired', 'Total loss', 'Total Loss'],
        default: 'Pending',
        index: true
    },
    completionDate: {
        type: Date
    },
    resolutionNotes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('ToolRepair', toolRepairSchema);
