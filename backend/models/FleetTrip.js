const mongoose = require('mongoose');

const tripDocumentSchema = new mongoose.Schema({
    docType: {
        type: String,
        enum: [
            'E-Way Bill',
            'Delivery Challan',
            'Transport Bill / Bilty',
            'Tax Invoice',
            'Material Gate Pass',
            'Consignment Note',
            'Weight Slip / Weighbridge',
            'Other'
        ],
        required: true
    },
    docNumber: { type: String, default: '', trim: true },
    validUntil: { type: Date },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: String, default: 'Staff' },
    uploadedAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
}, { _id: true });

const tripPauseSchema = new mongoose.Schema({
    pausedAt: { type: Date, default: Date.now },
    resumedAt: { type: Date, default: null },
    reason: { type: String, default: 'Driver Break' }
}, { _id: true });

const fleetTripSchema = new mongoose.Schema({
    tripNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },
    driverUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, default: '' },
    driverLicenseNumber: { type: String, default: '' },

    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    vehicleRegistration: { type: String, required: true, uppercase: true, trim: true },
    vehicleName: { type: String, default: '' },
    vehicleType: { type: String, default: '' },

    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    projectTitle: { type: String, default: '' },

    startLocation: { type: String, required: true, trim: true },
    startAddress: { type: String, default: '' },
    startCoords: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },

    destination: { type: String, required: true, trim: true },
    destinationAddress: { type: String, default: '' },
    destinationCoords: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },

    pickupDateTime: { type: Date, default: Date.now },
    deliveryExpectedDateTime: { type: Date },
    actualDeliveryDateTime: { type: Date },

    routeDetails: { type: String, default: '' },
    purpose: { type: String, default: 'Site Delivery / Material Transport' },
    cargoDetails: { type: String, default: '' },
    specialInstructions: { type: String, default: '' },

    // Stock Transfer Linking & Load Details
    stockTransferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockTransfer',
        default: null,
        index: true
    },
    stockTransferNumber: { type: String, default: '', trim: true },
    isStockTransferTrip: { type: Boolean, default: false, index: true },

    items: [{
        inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            default: null
        },
        itemName: { type: String, required: true },
        itemCode: { type: String, default: '' },
        unit: { type: String, default: 'Pcs' },
        dispatchedQuantity: { type: Number, default: 0 },
        deliveredQuantity: { type: Number, default: 0 },
        damagedQuantity: { type: Number, default: 0 },
        missingQuantity: { type: Number, default: 0 },
        returnedQuantity: { type: Number, default: 0 },
        condition: { type: String, default: 'Good' },
        remarks: { type: String, default: '' }
    }],

    loadingDetails: {
        packages: { type: Number, default: 0 },
        weight: { type: Number, default: 0 },
        weightUnit: { type: String, default: 'Kg' },
        supervisor: { type: String, default: '' },
        specialInstructions: { type: String, default: '' }
    },

    deliveryOutcome: {
        type: String,
        enum: ['Pending', 'Fully Delivered', 'Partially Delivered', 'Returned to Source', 'Delivery Failed', 'Cancelled'],
        default: 'Pending',
        index: true
    },

    proofOfDelivery: {
        receiverName: { type: String, default: '' },
        receiverPhone: { type: String, default: '' },
        signatureUrl: { type: String, default: '' },
        photos: [{ type: String }],
        remarks: { type: String, default: '' },
        submittedAt: { type: Date }
    },

    reportedIssues: [{
        issueType: {
            type: String,
            enum: ['Vehicle Breakdown', 'Traffic Delay', 'Accident', 'Material Damage', 'Quantity Mismatch', 'Delivery Location Issue', 'Other'],
            required: true
        },
        description: { type: String, required: true },
        photos: [{ type: String }],
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            address: { type: String, default: '' }
        },
        reportedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['Open', 'Acknowledged', 'Resolved'], default: 'Open' },
        resolvedAt: { type: Date },
        adminNotes: { type: String, default: '' }
    }],

    timeline: [{
        stage: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        performedBy: { type: String, default: 'System' },
        notes: { type: String, default: '' }
    }],

    isVerifiedByAdmin: { type: Boolean, default: false, index: true },
    adminVerification: {
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        verifiedByName: { type: String, default: '' },
        verifiedAt: { type: Date },
        reconciliationStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Discrepancy Reconciled', 'Rejected'],
            default: 'Pending'
        },
        adminRemarks: { type: String, default: '' }
    },

    status: {
        type: String,
        enum: ['Assigned', 'Confirmed', 'Started', 'In Transit', 'Paused', 'Completed', 'Cancelled'],
        default: 'Assigned',
        index: true
    },

    pauseHistory: [tripPauseSchema],

    // Start-to-End Trip Report Data
    startReport: {
        odometer: { type: Number, default: 0 },
        fuelLevel: { type: String, default: 'Full' }, // E.g., '100%', '75%', '50%', '25%'
        vehicleCondition: { type: String, default: 'Good' },
        photos: [{ type: String }],
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            address: { type: String, default: '' }
        },
        timestamp: { type: Date }
    },

    endReport: {
        odometer: { type: Number, default: 0 },
        distanceKm: { type: Number, default: 0 },
        fuelConsumption: { type: Number, default: 0 }, // Liters or approximate
        deliveryTime: { type: Date },
        deliveryConfirmation: { type: String, default: '' },
        deliveryPhotos: [{ type: String }],
        remarks: { type: String, default: '' },
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            address: { type: String, default: '' }
        },
        timestamp: { type: Date }
    },

    // Transport Documents & E-Way Bills
    documents: [tripDocumentSchema],

    // Live Tracking & Location Updates
    liveLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        speed: { type: Number, default: 0 },
        heading: { type: Number, default: 0 },
        address: { type: String, default: '' },
        updatedAt: { type: Date }
    },

    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedByName: { type: String, default: 'Admin' },
    assignedAt: { type: Date, default: Date.now },

    auditTrail: [{
        action: { type: String, required: true },
        performedBy: { type: String, default: 'System' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' }
    }]
}, {
    timestamps: true
});

fleetTripSchema.index({ createdAt: -1 });
fleetTripSchema.index({ status: 1, pickupDateTime: -1 });

module.exports = mongoose.model('FleetTrip', fleetTripSchema);
