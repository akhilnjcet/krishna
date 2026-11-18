const mongoose = require('mongoose');

const vehicleDocumentSchema = new mongoose.Schema({
    docType: {
        type: String,
        enum: [
            'Registration Certificate (RC)',
            'Insurance Policy',
            'Pollution / PUC Certificate',
            'Fitness Certificate',
            'Road Tax Permit',
            'National Permit',
            'Other'
        ],
        required: true
    },
    documentNumber: { type: String, default: '' },
    issueDate: { type: Date },
    expiryDate: { type: Date, required: true },
    fileUrl: { type: String, default: '' },
    notes: { type: String, default: '' }
});

const vehicleTripSchema = new mongoose.Schema({
    tripNumber: { type: String, required: true },
    date: { type: Date, default: Date.now },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    projectTitle: { type: String, default: '' },
    destination: { type: String, required: true },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    driverName: { type: String, default: '' },
    startOdometer: { type: Number, required: true },
    endOdometer: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    purpose: { type: String, default: 'Material / Site Delivery' },
    status: {
        type: String,
        enum: ['Started', 'Completed', 'Cancelled'],
        default: 'Started'
    },
    completedAt: { type: Date }
});

const vehicleFuelLogSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    liters: { type: Number, required: true },
    costPerLiter: { type: Number, default: 0 },
    totalCost: { type: Number, required: true },
    odometerReading: { type: Number, required: true },
    kmDrivenSinceLastRefuel: { type: Number, default: 0 },
    fuelEconomyKmPerLiter: { type: Number, default: 0 },
    fuelStation: { type: String, default: '' },
    expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
        default: null
    },
    receiptUrl: { type: String, default: '' },
    notes: { type: String, default: '' }
});

const vehicleServiceLogSchema = new mongoose.Schema({
    serviceDate: { type: Date, default: Date.now },
    serviceType: {
        type: String,
        enum: [
            'Scheduled Maintenance',
            'Oil & Filter Change',
            'Brake Service',
            'Tyre Replacement',
            'Engine / Transmission Repair',
            'Accident Repair',
            'Electrical / Battery',
            'Suspension / Wheel Alignment',
            'Other'
        ],
        required: true
    },
    odometerReading: { type: Number, default: 0 },
    garageName: { type: String, default: 'Authorized Workshop' },
    totalCost: { type: Number, required: true, default: 0 },
    expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
        default: null
    },
    invoiceUrl: { type: String, default: '' },
    nextServiceDueOdometer: { type: Number, default: 0 },
    nextServiceDueDate: { type: Date },
    notes: { type: String, default: '' }
});

const vehicleSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    vehicleName: {
        type: String,
        required: true,
        trim: true
    },
    vehicleType: {
        type: String,
        enum: [
            'Pickup Truck',
            'Flatbed Truck',
            'Heavy Commercial Trailer',
            'Crane / Boom Truck',
            'Utility Van',
            'Company Car',
            'Two Wheeler'
        ],
        required: true,
        index: true
    },
    assignedDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedDriverName: { type: String, default: '' },
    assignedDriverPhone: { type: String, default: '' },
    driverLicenseNumber: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Available', 'On Trip', 'In Maintenance', 'Out of Service'],
        default: 'Available',
        index: true
    },
    currentOdometer: {
        type: Number,
        default: 0
    },
    fuelType: {
        type: String,
        enum: ['Diesel', 'Petrol', 'Electric', 'CNG'],
        default: 'Diesel'
    },
    tankCapacityLiters: {
        type: Number,
        default: 60
    },
    documents: [vehicleDocumentSchema],
    trips: [vehicleTripSchema],
    fuelLogs: [vehicleFuelLogSchema],
    serviceLogs: [vehicleServiceLogSchema],
    notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
