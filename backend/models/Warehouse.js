const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['Main Warehouse', 'Workshop', 'Project Site', 'Temporary Storage', 'Vehicle / Field Stock', 'Custom Location'],
        default: 'Main Warehouse'
    },
    address: {
        type: String,
        default: ''
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    managerName: {
        type: String,
        default: ''
    },
    managerPhone: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Archived'],
        default: 'Active'
    },
    capacityNotes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

warehouseSchema.index({ code: 1 });
warehouseSchema.index({ status: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
