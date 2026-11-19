const mongoose = require('mongoose');
const FleetTrip = require('../models/FleetTrip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Notification = require('../models/Notification');
const { dispatchNotification } = require('../services/notificationDispatcher');

// Helper to resolve driver record for the requesting user
const resolveCurrentDriver = async (user) => {
    if (!user) return null;
    let driver = await Driver.findOne({ userId: user._id });
    if (!driver && user.driverRef) {
        driver = await Driver.findById(user.driverRef);
    }
    if (!driver && user.role === 'driver') {
        driver = await Driver.findOne({ phone: user.phone || user.phoneNumber });
    }
    return driver;
};

// ─── 1. CREATE / ASSIGN NEW TRIP ─────────────────────────────────────
// Accessible by: Admin, Manager (driver.assign_trip), Staff (driver.assign_trip)
exports.createTrip = async (req, res) => {
    try {
        const {
            driverId,
            vehicleId,
            projectId,
            projectTitle,
            startLocation,
            startAddress,
            destination,
            destinationAddress,
            pickupDateTime,
            deliveryExpectedDateTime,
            routeDetails,
            purpose,
            cargoDetails,
            specialInstructions,
            documents
        } = req.body;

        if (!driverId) {
            return res.status(400).json({ success: false, message: 'Driver assignment is required.' });
        }
        if (!vehicleId) {
            return res.status(400).json({ success: false, message: 'Vehicle assignment is required.' });
        }
        if (!startLocation || !destination) {
            return res.status(400).json({ success: false, message: 'Starting location and destination are required.' });
        }

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Selected driver not found.' });
        }
        if (driver.status !== 'Active') {
            return res.status(400).json({ success: false, message: `Driver ${driver.name} is ${driver.status}. Only active drivers can be assigned trips.` });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'Selected vehicle not found.' });
        }
        if (vehicle.status === 'In Maintenance' || vehicle.status === 'Out of Service') {
            return res.status(400).json({ success: false, message: `Vehicle ${vehicle.registrationNumber} is ${vehicle.status}.` });
        }

        // Generate unique trip number
        const tripNumber = `TRIP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const trip = new FleetTrip({
            tripNumber,
            driverId: driver._id,
            driverUserId: driver.userId || null,
            driverName: driver.name,
            driverPhone: driver.phone,
            driverLicenseNumber: driver.licenseNumber,
            vehicleId: vehicle._id,
            vehicleRegistration: vehicle.registrationNumber,
            vehicleName: vehicle.vehicleName,
            vehicleType: vehicle.vehicleType,
            projectId: projectId || null,
            projectTitle: projectTitle || '',
            startLocation: startLocation.trim(),
            startAddress: startAddress ? startAddress.trim() : '',
            destination: destination.trim(),
            destinationAddress: destinationAddress ? destinationAddress.trim() : '',
            pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : new Date(),
            deliveryExpectedDateTime: deliveryExpectedDateTime ? new Date(deliveryExpectedDateTime) : null,
            routeDetails: routeDetails || '',
            purpose: purpose || 'Material / Site Delivery',
            cargoDetails: cargoDetails || '',
            specialInstructions: specialInstructions || '',
            status: 'Assigned',
            documents: Array.isArray(documents) ? documents : [],
            assignedBy: req.user?._id || null,
            assignedByName: req.user?.name || 'Logistics Staff',
            assignedAt: new Date(),
            auditTrail: [{
                action: 'Trip Assigned',
                performedBy: req.user?.name || 'Staff',
                timestamp: new Date(),
                details: `Trip ${tripNumber} assigned from ${startLocation} to ${destination}`
            }]
        });

        await trip.save();

        // Notify Driver if linked account exists
        if (driver.userId) {
            try {
                await Notification.create({
                    title: `New Trip Assigned: ${tripNumber}`,
                    message: `You have been assigned trip ${tripNumber} to ${destination}. Scheduled pickup: ${new Date(trip.pickupDateTime).toLocaleString()}.`,
                    recipientRole: 'driver',
                    recipientUser: driver.userId,
                    category: 'task',
                    priority: 'high',
                    metadata: { tripId: trip._id, tripNumber, type: 'TRIP_ASSIGNED' }
                });
            } catch (err) {
                console.warn('Trip notification error:', err.message);
            }
        }

        res.status(201).json({
            success: true,
            message: `Trip ${tripNumber} assigned successfully.`,
            trip
        });
    } catch (err) {
        console.error('createTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 2. LIST TRIPS (WITH ROLE-BASED SCOPING) ─────────────────────────
exports.getTrips = async (req, res) => {
    try {
        const { status, driverId, vehicleId, search, dateFrom, dateTo } = req.query;
        const query = {};

        // If logged in as driver, enforce ONLY their own trips!
        if (req.user.role === 'driver') {
            const currentDriver = await resolveCurrentDriver(req.user);
            if (!currentDriver) {
                return res.json({ success: true, trips: [], count: 0 });
            }
            query.driverId = currentDriver._id;
        } else if (driverId) {
            query.driverId = driverId;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        if (vehicleId) {
            query.vehicleId = vehicleId;
        }

        if (dateFrom || dateTo) {
            query.pickupDateTime = {};
            if (dateFrom) query.pickupDateTime.$gte = new Date(dateFrom);
            if (dateTo) query.pickupDateTime.$lte = new Date(dateTo);
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { tripNumber: regex },
                { driverName: regex },
                { vehicleRegistration: regex },
                { startLocation: regex },
                { destination: regex },
                { purpose: regex },
                { cargoDetails: regex }
            ];
        }

        const trips = await FleetTrip.find(query).sort({ pickupDateTime: -1, createdAt: -1 });

        res.json({
            success: true,
            count: trips.length,
            trips
        });
    } catch (err) {
        console.error('getTrips error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 3. GET SINGLE TRIP BY ID ────────────────────────────────────────
exports.getTripById = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id)
            .populate('driverId', 'name phone licenseNumber licenseType photoUrl emergencyContact emergencyPhone')
            .populate('vehicleId', 'registrationNumber vehicleName vehicleType currentOdometer status tankCapacityLiters fuelType documents');

        if (!trip) {
            return res.status(404).json({ success: false, message: 'Trip record not found.' });
        }

        // Driver security check: drivers can only see their own assigned trip
        if (req.user.role === 'driver') {
            const currentDriver = await resolveCurrentDriver(req.user);
            if (!currentDriver || trip.driverId._id.toString() !== currentDriver._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied: You can only view trips assigned to you.' });
            }
        }

        res.json({ success: true, trip });
    } catch (err) {
        console.error('getTripById error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 4. CONFIRM TRIP ASSIGNMENT (DRIVER) ──────────────────────────────
exports.confirmTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (req.user.role === 'driver') {
            const currentDriver = await resolveCurrentDriver(req.user);
            if (!currentDriver || trip.driverId.toString() !== currentDriver._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied: You cannot confirm trips assigned to another driver.' });
            }
        }

        if (trip.status !== 'Assigned') {
            return res.status(400).json({ success: false, message: `Trip is already in '${trip.status}' status.` });
        }

        trip.status = 'Confirmed';
        trip.auditTrail.push({
            action: 'Trip Confirmed',
            performedBy: req.user.name || 'Driver',
            timestamp: new Date(),
            details: 'Trip assignment acknowledged and confirmed by driver'
        });

        await trip.save();
        res.json({ success: true, message: 'Trip assignment confirmed.', trip });
    } catch (err) {
        console.error('confirmTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 5. START TRIP WITH START-TO-END REPORT ──────────────────────────
exports.startTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (req.user.role === 'driver') {
            const currentDriver = await resolveCurrentDriver(req.user);
            if (!currentDriver || trip.driverId.toString() !== currentDriver._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied: You cannot start trips assigned to another driver.' });
            }
        }

        if (trip.status === 'Started') {
            return res.status(400).json({ success: false, message: 'Trip is already started and in progress.' });
        }
        if (trip.status === 'Completed' || trip.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: `Cannot start a trip in status '${trip.status}'.` });
        }

        const {
            odometer,
            fuelLevel = 'Full',
            vehicleCondition = 'Good',
            photos = [],
            location = { lat: null, lng: null, address: '' }
        } = req.body;

        const startOdo = parseFloat(odometer);
        if (isNaN(startOdo) || startOdo < 0) {
            return res.status(400).json({ success: false, message: 'A valid starting odometer reading is required.' });
        }

        const now = new Date();

        trip.status = 'Started';
        trip.startReport = {
            odometer: startOdo,
            fuelLevel,
            vehicleCondition,
            photos: Array.isArray(photos) ? photos : [],
            location: {
                lat: location?.lat || null,
                lng: location?.lng || null,
                address: location?.address || trip.startLocation
            },
            timestamp: now
        };

        if (location?.lat && location?.lng) {
            trip.liveLocation = {
                lat: location.lat,
                lng: location.lng,
                speed: 0,
                heading: 0,
                address: location.address || trip.startLocation,
                updatedAt: now
            };
        }

        trip.auditTrail.push({
            action: 'Trip Started',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Trip started. Start Odometer: ${startOdo} km, Fuel: ${fuelLevel}, Condition: ${vehicleCondition}`
        });

        await trip.save();

        // Sync vehicle status & trip record in Vehicle model
        const vehicle = await Vehicle.findById(trip.vehicleId);
        if (vehicle) {
            vehicle.status = 'On Trip';
            vehicle.currentOdometer = Math.max(vehicle.currentOdometer || 0, startOdo);

            // Record into vehicle.trips for legacy compatibility
            const existingVehTrip = vehicle.trips.find(t => t.tripNumber === trip.tripNumber);
            if (!existingVehTrip) {
                vehicle.trips.unshift({
                    tripNumber: trip.tripNumber,
                    date: now,
                    projectId: trip.projectId,
                    projectTitle: trip.projectTitle,
                    startLocation: trip.startLocation,
                    destination: trip.destination,
                    driverId: trip.driverId,
                    driverName: trip.driverName,
                    driverPhone: trip.driverPhone,
                    driverLicenseNumber: trip.driverLicenseNumber,
                    startOdometer: startOdo,
                    endOdometer: 0,
                    distanceKm: 0,
                    purpose: trip.purpose,
                    status: 'Started'
                });
            }
            await vehicle.save();
        }

        res.json({
            success: true,
            message: 'Trip started successfully. Safe travels!',
            trip
        });
    } catch (err) {
        console.error('startTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 6. PAUSE TRIP (DRIVER) ──────────────────────────────────────────
exports.pauseTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (trip.status !== 'Started') {
            return res.status(400).json({ success: false, message: `Only in-progress trips can be paused (current status: ${trip.status}).` });
        }

        const { reason = 'Driver Rest / Traffic Halt' } = req.body;
        const now = new Date();

        trip.status = 'Paused';
        trip.pauseHistory.push({
            pausedAt: now,
            resumedAt: null,
            reason
        });

        trip.auditTrail.push({
            action: 'Trip Paused',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Trip paused. Reason: ${reason}`
        });

        await trip.save();
        res.json({ success: true, message: 'Trip paused.', trip });
    } catch (err) {
        console.error('pauseTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 7. RESUME TRIP (DRIVER) ─────────────────────────────────────────
exports.resumeTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (trip.status !== 'Paused') {
            return res.status(400).json({ success: false, message: `Trip is not paused (current status: ${trip.status}).` });
        }

        const now = new Date();
        if (trip.pauseHistory.length > 0) {
            const lastPause = trip.pauseHistory[trip.pauseHistory.length - 1];
            if (!lastPause.resumedAt) {
                lastPause.resumedAt = now;
            }
        }

        trip.status = 'Started';
        trip.auditTrail.push({
            action: 'Trip Resumed',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: 'Trip resumed by driver'
        });

        await trip.save();
        res.json({ success: true, message: 'Trip resumed.', trip });
    } catch (err) {
        console.error('resumeTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 8. COMPLETE TRIP & SUBMIT COMPLETION REPORT ──────────────────────
exports.completeTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (req.user.role === 'driver') {
            const currentDriver = await resolveCurrentDriver(req.user);
            if (!currentDriver || trip.driverId.toString() !== currentDriver._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied: You cannot complete trips assigned to another driver.' });
            }
        }

        if (trip.status !== 'Started' && trip.status !== 'Paused') {
            return res.status(400).json({ success: false, message: `Cannot complete trip in status '${trip.status}'.` });
        }

        const {
            odometer,
            fuelConsumption = 0,
            deliveryConfirmation = 'Signed Challan Received',
            deliveryPhotos = [],
            remarks = '',
            location = { lat: null, lng: null, address: '' }
        } = req.body;

        const endOdo = parseFloat(odometer);
        const startOdo = trip.startReport?.odometer || 0;

        if (isNaN(endOdo) || endOdo < startOdo) {
            return res.status(400).json({
                success: false,
                message: `Ending odometer (${endOdo}) cannot be less than starting odometer (${startOdo}).`
            });
        }

        const distanceKm = endOdo - startOdo;
        const now = new Date();

        trip.status = 'Completed';
        trip.actualDeliveryDateTime = now;
        trip.endReport = {
            odometer: endOdo,
            distanceKm,
            fuelConsumption: parseFloat(fuelConsumption) || 0,
            deliveryTime: now,
            deliveryConfirmation,
            deliveryPhotos: Array.isArray(deliveryPhotos) ? deliveryPhotos : [],
            remarks,
            location: {
                lat: location?.lat || null,
                lng: location?.lng || null,
                address: location?.address || trip.destination
            },
            timestamp: now
        };

        // Stop live location tracking
        trip.liveLocation.speed = 0;
        trip.liveLocation.updatedAt = now;

        trip.auditTrail.push({
            action: 'Trip Completed',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Trip completed. Distance travelled: ${distanceKm} km. Odometer: ${endOdo} km.`
        });

        await trip.save();

        // Sync Vehicle model
        const vehicle = await Vehicle.findById(trip.vehicleId);
        if (vehicle) {
            vehicle.status = 'Available';
            vehicle.currentOdometer = endOdo;

            const vTrip = vehicle.trips.find(t => t.tripNumber === trip.tripNumber);
            if (vTrip) {
                vTrip.endOdometer = endOdo;
                vTrip.distanceKm = distanceKm;
                vTrip.status = 'Completed';
                vTrip.completedAt = now;
            }
            await vehicle.save();
        }

        // Notify Admin & Staff
        try {
            await Notification.create({
                title: `Trip Completed: ${trip.tripNumber}`,
                message: `Driver ${trip.driverName} has marked trip ${trip.tripNumber} completed. Total distance: ${distanceKm} km.`,
                recipientRole: 'admin',
                category: 'system',
                priority: 'medium',
                metadata: { tripId: trip._id, tripNumber: trip.tripNumber, type: 'TRIP_COMPLETED' }
            });
        } catch (notifErr) {
            console.warn('Completion notification error:', notifErr.message);
        }

        res.json({
            success: true,
            message: 'Trip completed and completion report submitted successfully.',
            trip
        });
    } catch (err) {
        console.error('completeTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 9. UPDATE LIVE LOCATION DURING ACTIVE TRIP ───────────────────────
exports.updateLiveLocation = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        if (trip.status !== 'Started') {
            return res.status(400).json({ success: false, message: 'Location updates are only accepted during active trips.' });
        }

        const { lat, lng, speed = 0, heading = 0, address = '' } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
        }

        trip.liveLocation = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            speed: parseFloat(speed) || 0,
            heading: parseFloat(heading) || 0,
            address: address || '',
            updatedAt: new Date()
        };

        await trip.save();
        res.json({ success: true, liveLocation: trip.liveLocation });
    } catch (err) {
        console.error('updateLiveLocation error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 10. ATTACH TRANSPORT DOCUMENT / E-WAY BILL ───────────────────────
// Accessible by: Admin, Manager (driver.manage_documents), Staff (driver.manage_documents)
exports.attachTripDocument = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const { docType, docNumber, validUntil, fileUrl, notes } = req.body;
        if (!docType || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Document type and file URL are required.' });
        }

        const newDoc = {
            docType,
            docNumber: docNumber || '',
            validUntil: validUntil ? new Date(validUntil) : null,
            fileUrl,
            uploadedBy: req.user.name || 'Staff',
            uploadedAt: new Date(),
            notes: notes || ''
        };

        trip.documents.push(newDoc);
        trip.auditTrail.push({
            action: 'Document Uploaded',
            performedBy: req.user.name || 'Staff',
            timestamp: new Date(),
            details: `Attached ${docType} (${docNumber || 'No number'})`
        });

        await trip.save();
        res.json({ success: true, message: 'Document attached successfully.', documents: trip.documents });
    } catch (err) {
        console.error('attachTripDocument error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
