const mongoose = require('mongoose');

const drawingRevisionSchema = new mongoose.Schema({
    revisionNumber: {
        type: String,
        required: true, // 'R0', 'R1', 'R2', etc.
        trim: true
    },
    revisionDate: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        default: 'Drawing_Revision.pdf'
    },
    fileSize: {
        type: Number,
        default: 0
    },
    fileType: {
        type: String,
        default: 'application/pdf'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedByName: {
        type: String,
        default: 'Engineer'
    },
    status: {
        type: String,
        enum: ['Pending Approval', 'Approved', 'Rejected', 'Superseded'],
        default: 'Pending Approval',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedByName: {
        type: String,
        default: ''
    },
    approvalDate: {
        type: Date
    },
    approvalComments: {
        type: String,
        default: ''
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    supersededAt: {
        type: Date
    },
    supersededBy: {
        type: String,
        default: ''
    }
});

const fabricationDrawingSchema = new mongoose.Schema({
    drawingNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
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
    category: {
        type: String,
        enum: [
            'Structural Fabrication',
            'Sheet Metal / Pressing',
            'Machining / Turning',
            'Welding & Assembly',
            'Piping & Pressure Vessel',
            'Architectural & Façade',
            'Foundation & Layout',
            'Electrical & Schematics',
            'General Engineering'
        ],
        default: 'Structural Fabrication',
        index: true
    },
    partName: {
        type: String,
        default: ''
    },
    materialGrade: {
        type: String,
        default: ''
    },
    tolerance: {
        type: String,
        default: '±0.5mm'
    },
    currentRevision: {
        type: String,
        default: 'R0'
    },
    activeRevisionFileUrl: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending Approval', 'Approved', 'Rejected', 'Superseded', 'Archived'],
        default: 'Pending Approval',
        index: true
    },
    isApprovedForProduction: {
        type: Boolean,
        default: false,
        index: true
    },
    revisions: [drawingRevisionSchema],
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    documentHistoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentHistory',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByName: {
        type: String,
        default: 'System Admin'
    }
}, {
    timestamps: true
});

fabricationDrawingSchema.index({ projectId: 1, drawingNumber: 1 });
fabricationDrawingSchema.index({ status: 1, isApprovedForProduction: 1 });

module.exports = mongoose.model('FabricationDrawing', fabricationDrawingSchema);
