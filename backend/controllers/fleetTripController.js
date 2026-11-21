const mongoose = require('mongoose');
const FleetTrip = require('../models/FleetTrip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const StockTransfer = require('../models/StockTransfer');
const InventoryItem = require('../models/InventoryItem');
const Notification = require('../models/Notification');
const { dispatchNotification } = require('../services/notificationDispatcher');
const socketUtil = require('../utils/socket');

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
            stockTransferId,
            items,
            loadingDetails,
            projectId,
            projectTitle,
            startLocation,
            startAddress,
            destination,
            destinationAddress,
            mapLink,
            dropPoint,
            destinationCoords,
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

        // Prevent assigning driver with active ongoing trip
        const activeDriverTrip = await FleetTrip.findOne({
            driverId: driver._id,
            status: { $in: ['Started', 'In Transit', 'Paused'] }
        });
        if (activeDriverTrip) {
            return res.status(400).json({
                success: false,
                message: `Driver ${driver.name} is currently in-transit on active trip ${activeDriverTrip.tripNumber}. Please select an available driver.`
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'Selected vehicle not found.' });
        }
        if (vehicle.status === 'In Maintenance' || vehicle.status === 'Out of Service') {
            return res.status(400).json({ success: false, message: `Vehicle ${vehicle.registrationNumber} is ${vehicle.status}.` });
        }

        // Prevent assigning vehicle with active ongoing trip
        const activeVehTrip = await FleetTrip.findOne({
            vehicleId: vehicle._id,
            status: { $in: ['Started', 'In Transit', 'Paused'] }
        });
        if (activeVehTrip) {
            return res.status(400).json({
                success: false,
                message: `Vehicle ${vehicle.registrationNumber} is currently assigned to active trip ${activeVehTrip.tripNumber}.`
            });
        }

        // Verify and resolve StockTransfer if supplied
        let linkedStockTransfer = null;
        let transferItems = [];
        if (stockTransferId) {
            linkedStockTransfer = await StockTransfer.findById(stockTransferId);
            if (!linkedStockTransfer) {
                return res.status(404).json({ success: false, message: 'Linked stock transfer record not found.' });
            }
            transferItems = linkedStockTransfer.items.map(it => ({
                inventoryItemId: it.inventoryItemId || null,
                itemName: it.itemName,
                itemCode: it.itemCode || '',
                unit: it.unit || 'Pcs',
                dispatchedQuantity: Number(it.requestedQuantity) || 0,
                deliveredQuantity: 0,
                damagedQuantity: 0,
                missingQuantity: 0,
                returnedQuantity: 0,
                condition: 'Good',
                remarks: it.discrepancyNotes || ''
            }));
        } else if (Array.isArray(items) && items.length > 0) {
            transferItems = items.map(it => ({
                inventoryItemId: it.inventoryItemId || null,
                itemName: it.itemName,
                itemCode: it.itemCode || '',
                unit: it.unit || 'Pcs',
                dispatchedQuantity: Number(it.quantity || it.dispatchedQuantity || it.requestedQuantity) || 0,
                deliveredQuantity: 0,
                damagedQuantity: 0,
                missingQuantity: 0,
                returnedQuantity: 0,
                condition: 'Good',
                remarks: it.remarks || ''
            }));
        }

        // Generate unique trip number
        const tripNumber = `TRIP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const now = new Date();

        // 10-Stage Timeline Initialization
        const initialTimeline = [
            {
                stage: linkedStockTransfer ? 'Stock Transfer Created' : 'Manual Trip Created',
                timestamp: linkedStockTransfer?.createdAt || now,
                performedBy: req.user?.name || 'Logistics Admin',
                notes: linkedStockTransfer ? `Linked to ${linkedStockTransfer.transferNumber}` : 'Direct manual cargo trip initialized'
            },
            {
                stage: 'Driver Assigned',
                timestamp: now,
                performedBy: req.user?.name || 'Logistics Admin',
                notes: `Driver: ${driver.name} (${driver.phone || 'No phone'})`
            },
            {
                stage: 'Vehicle Assigned',
                timestamp: now,
                performedBy: req.user?.name || 'Logistics Admin',
                notes: `Vehicle: ${vehicle.registrationNumber} (${vehicle.vehicleName || vehicle.vehicleType || 'Fleet'})`
            },
            {
                stage: 'Load Prepared',
                timestamp: now,
                performedBy: req.user?.name || 'Logistics Admin',
                notes: `Prepared ${transferItems.length} line items. Approx weight: ${loadingDetails?.weight || linkedStockTransfer?.totalWeight || 0} ${loadingDetails?.weightUnit || 'Kg'}`
            }
        ];

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
            projectId: projectId || linkedStockTransfer?.projectId || null,
            projectTitle: projectTitle || linkedStockTransfer?.projectTitle || '',
            startLocation: startLocation.trim(),
            startAddress: startAddress ? startAddress.trim() : (linkedStockTransfer?.sourceAddress || ''),
            destination: destination.trim(),
            destinationAddress: destinationAddress ? destinationAddress.trim() : (linkedStockTransfer?.destinationAddress || ''),
            mapLink: mapLink ? mapLink.trim() : (linkedStockTransfer?.mapLink || ''),
            dropPoint: dropPoint ? dropPoint.trim() : (linkedStockTransfer?.dropPoint || ''),
            destinationCoords: destinationCoords || { lat: null, lng: null },
            pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : new Date(),
            deliveryExpectedDateTime: deliveryExpectedDateTime ? new Date(deliveryExpectedDateTime) : null,
            routeDetails: routeDetails || '',
            purpose: purpose || (linkedStockTransfer ? `Stock Transfer ${linkedStockTransfer.transferNumber}` : 'Material / Site Delivery'),
            cargoDetails: cargoDetails || (transferItems.map(i => `${i.itemName} (${i.dispatchedQuantity} ${i.unit})`).join(', ')),
            specialInstructions: specialInstructions || loadingDetails?.specialInstructions || linkedStockTransfer?.handlingInstructions || '',
            stockTransferId: linkedStockTransfer?._id || null,
            stockTransferNumber: linkedStockTransfer?.transferNumber || '',
            isStockTransferTrip: Boolean(linkedStockTransfer),
            items: transferItems,
            loadingDetails: {
                packages: loadingDetails?.packages || linkedStockTransfer?.packageCount || 0,
                weight: loadingDetails?.weight || linkedStockTransfer?.totalWeight || 0,
                weightUnit: loadingDetails?.weightUnit || linkedStockTransfer?.weightUnit || 'Kg',
                supervisor: loadingDetails?.supervisor || linkedStockTransfer?.loadingSupervisor || (req.user?.name || ''),
                specialInstructions: loadingDetails?.specialInstructions || linkedStockTransfer?.handlingInstructions || ''
            },
            timeline: initialTimeline,
            status: 'Assigned',
            deliveryOutcome: 'Pending',
            documents: Array.isArray(documents) ? documents : [],
            assignedBy: req.user?._id || null,
            assignedByName: req.user?.name || 'Logistics Staff',
            assignedAt: now,
            auditTrail: [{
                action: 'Trip Assigned',
                performedBy: req.user?.name || 'Staff',
                timestamp: now,
                details: `Trip ${tripNumber} assigned from ${startLocation} to ${destination}${linkedStockTransfer ? ` for ${linkedStockTransfer.transferNumber}` : ''}`
            }]
        });

        await trip.save();

        // If linked to StockTransfer, update StockTransfer with trip assignment
        if (linkedStockTransfer) {
            linkedStockTransfer.tripId = trip._id;
            linkedStockTransfer.tripNumber = tripNumber;
            linkedStockTransfer.driverId = driver._id;
            linkedStockTransfer.driverName = driver.name;
            linkedStockTransfer.driverPhone = driver.phone;
            linkedStockTransfer.vehicleId = vehicle._id;
            linkedStockTransfer.vehicleNumber = vehicle.registrationNumber;
            linkedStockTransfer.vehicleName = vehicle.vehicleName;
            linkedStockTransfer.plannedDispatchDate = trip.pickupDateTime;
            if (linkedStockTransfer.status === 'Draft' || linkedStockTransfer.status === 'Requested') {
                linkedStockTransfer.status = 'Approved';
            }
            linkedStockTransfer.auditTrail.push({
                action: 'TRIP_SCHEDULED',
                performedBy: req.user?.name || 'Logistics Admin',
                timestamp: now,
                details: `Assigned to Trip ${tripNumber} (Driver: ${driver.name}, Vehicle: ${vehicle.registrationNumber}). Scheduled for ${new Date(trip.pickupDateTime).toLocaleString()}`
            });
            await linkedStockTransfer.save();
        }

        // Notify Driver if linked user account exists
        if (driver.userId) {
            try {
                await Notification.create({
                    title: `New Trip Assigned: ${tripNumber}`,
                    message: `You have been assigned trip ${tripNumber} to ${destination}. Scheduled departure: ${new Date(trip.pickupDateTime).toLocaleString()}.`,
                    recipientRole: 'driver',
                    recipientUser: driver.userId,
                    category: 'task',
                    priority: 'high',
                    metadata: { tripId: trip._id, tripNumber, type: 'TRIP_ASSIGNED' }
                });
                dispatchNotification({
                    title: `Trip Assigned: ${tripNumber}`,
                    message: `Trip to ${destination} assigned to you.`,
                    recipientRole: 'driver',
                    recipientUser: driver.userId,
                    category: 'fleet',
                    priority: 'high',
                    link: `/driver/trip/${trip._id}`,
                    metadata: { tripId: trip._id }
                }).catch(() => {});
            } catch (err) {
                console.warn('Trip notification error:', err.message);
            }
        }

        // Real-time broadcast
        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-created', trip);
            io.emit('trip-status-changed', trip);
        }

        res.status(201).json({
            success: true,
            message: `Trip ${tripNumber} assigned and scheduled successfully.`,
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

        trip.status = 'In Transit';
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

        // Timeline progression
        trip.timeline.push({
            stage: 'Trip Started',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: `Trip started by driver. Starting odometer: ${startOdo} km. Fuel: ${fuelLevel}.`
        });
        trip.timeline.push({
            stage: 'In Transit',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: `Vehicle en route to destination: ${trip.destination}`
        });

        trip.auditTrail.push({
            action: 'Trip Started',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Trip started. Start Odometer: ${startOdo} km, Fuel: ${fuelLevel}, Condition: ${vehicleCondition}. Status set to In Transit.`
        });

        await trip.save();

        // If linked to StockTransfer, sync status to In Transit and deduct source inventory atomically
        if (trip.stockTransferId) {
            try {
                const st = await StockTransfer.findById(trip.stockTransferId);
                if (st && st.status !== 'In Transit' && st.status !== 'Received') {
                    st.status = 'In Transit';
                    st.dispatchedAt = now;
                    st.dispatchedByName = req.user.name || trip.driverName;
                    st.auditTrail.push({
                        action: 'IN_TRANSIT',
                        performedBy: req.user.name || trip.driverName,
                        timestamp: now,
                        details: `Trip ${trip.tripNumber} departed. Stock marked In Transit.`
                    });

                    // Deduct from source warehouse locationStock
                    const sourceLocId = st.sourceWarehouseId ? st.sourceWarehouseId.toString() : null;
                    for (const it of st.items) {
                        if (!it.inventoryItemId) continue;
                        const inv = await InventoryItem.findById(it.inventoryItemId);
                        if (!inv) continue;

                        const qty = Number(it.requestedQuantity);
                        it.dispatchedQuantity = qty;

                        if (sourceLocId && Array.isArray(inv.locationStock)) {
                            let found = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === sourceLocId);
                            if (found) {
                                found.quantity = Math.max(0, (Number(found.quantity) || 0) - qty);
                            }
                        }

                        if (!st.destinationWarehouseId) {
                            inv.quantity = Math.max(0, (Number(inv.quantity) || 0) - qty);
                        }

                        inv.stockMovements.push({
                            type: 'OUT',
                            quantity: qty,
                            reference: `${st.transferNumber} / ${trip.tripNumber}`,
                            reason: `Dispatched on trip ${trip.tripNumber} to ${st.destinationWarehouseName}`,
                            performedBy: req.user.name || trip.driverName,
                            date: now
                        });

                        await inv.save();
                    }

                    await st.save();
                }
            } catch (stErr) {
                console.warn('StockTransfer sync on trip start warning:', stErr.message);
            }
        }

        // Real-time broadcast
        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-status-changed', trip);
        }

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
            fuelRefillAmount = 0,
            fuelRatePerLiter = 0,
            deliveryOutcome = 'Fully Delivered',
            deliveryConfirmation = 'Fully Delivered',
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

        // Normalize delivery outcome
        const OUTCOME_MAP = {
            'FULLY DELIVERED': 'Fully Delivered',
            'PARTIALLY DELIVERED': 'Partially Delivered',
            'RETURNED TO SOURCE': 'Returned to Source',
            'DELIVERY FAILED': 'Delivery Failed',
            'CANCELLED': 'Cancelled',
            'PENDING': 'Pending'
        };
        const normalizedOutcome = OUTCOME_MAP[String(deliveryOutcome || deliveryConfirmation).trim().toUpperCase()] || deliveryOutcome || 'Fully Delivered';

        // Fuel Refill & Estimation Calculations
        const refillAmount = Math.max(0, parseFloat(fuelRefillAmount) || 0);
        const fuelRate = Math.max(0, parseFloat(fuelRatePerLiter) || 0);
        const refillLiters = (refillAmount > 0 && fuelRate > 0) ? parseFloat((refillAmount / fuelRate).toFixed(2)) : 0;

        // Fetch previous completed trip for this vehicle
        const previousTrip = await FleetTrip.findOne({
            vehicleId: trip.vehicleId,
            _id: { $ne: trip._id },
            status: 'Completed',
            'endReport.odometer': { $gt: 0 }
        }).sort({ actualDeliveryDateTime: -1, createdAt: -1 });

        const prevTripOdo = previousTrip ? (previousTrip.endReport?.odometer || startOdo) : startOdo;
        const kmSincePrevTrip = Math.max(0, endOdo - prevTripOdo);

        const vehicle = await Vehicle.findById(trip.vehicleId);
        const tankCapacity = vehicle?.tankCapacityLiters || 60;
        const defaultBenchmarkMileage = vehicle?.vehicleType === 'Pickup' ? 14 : 10;

        let estimatedMileage = defaultBenchmarkMileage;
        let estimationMethod = 'Fleet Benchmark Standard';

        if (refillLiters > 0 && kmSincePrevTrip > 0) {
            estimatedMileage = parseFloat((kmSincePrevTrip / refillLiters).toFixed(2));
            estimationMethod = 'Calculated from Previous Trip Odometer & Refill';
        } else if (previousTrip?.endReport?.estimatedMileageKmPerLiter > 0) {
            estimatedMileage = previousTrip.endReport.estimatedMileageKmPerLiter;
            estimationMethod = 'Carried from Previous Verified Trip';
        }

        const estimatedConsumed = (distanceKm > 0 && estimatedMileage > 0)
            ? parseFloat((distanceKm / estimatedMileage).toFixed(2))
            : 0;

        const prevRemaining = previousTrip?.endReport?.estimatedRemainingFuelLiters != null
            ? previousTrip.endReport.estimatedRemainingFuelLiters
            : (tankCapacity * 0.5);

        const estimatedRemaining = parseFloat(Math.min(tankCapacity, Math.max(0, prevRemaining + refillLiters - estimatedConsumed)).toFixed(2));

        trip.status = 'Completed';
        trip.deliveryOutcome = normalizedOutcome;
        trip.actualDeliveryDateTime = now;
        trip.endReport = {
            odometer: endOdo,
            distanceKm,
            fuelRefillAmount: refillAmount,
            fuelRatePerLiter: fuelRate,
            fuelRefillLiters: refillLiters,
            previousTripOdometer: prevTripOdo,
            kmSincePreviousTrip,
            estimatedMileageKmPerLiter: estimatedMileage,
            estimatedFuelConsumedLiters: estimatedConsumed,
            estimatedRemainingFuelLiters: estimatedRemaining,
            fuelEstimationMethod: estimationMethod,
            fuelConsumption: estimatedConsumed, // Backward compat
            deliveryTime: now,
            deliveryConfirmation: normalizedOutcome,
            deliveryPhotos: Array.isArray(deliveryPhotos) && deliveryPhotos.length > 0 ? deliveryPhotos : (trip.proofOfDelivery?.photos || []),
            remarks: remarks || trip.proofOfDelivery?.remarks || '',
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

// ─── 11. REPORT TRIP ISSUE (DRIVER & ADMIN) ───────────────────────────
exports.reportTripIssue = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const {
            issueType,
            description,
            photos = [],
            location = { lat: null, lng: null, address: '' }
        } = req.body;

        if (!issueType || !description) {
            return res.status(400).json({ success: false, message: 'Issue type and description are required.' });
        }

        const now = new Date();
        const issueObj = {
            issueType,
            description: String(description).trim(),
            photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
            location: {
                lat: location?.lat ? Number(location.lat) : null,
                lng: location?.lng ? Number(location.lng) : null,
                address: location?.address ? String(location.address).trim() : ''
            },
            reportedAt: now,
            status: 'Open'
        };

        trip.reportedIssues.push(issueObj);
        trip.timeline.push({
            stage: 'Issue Reported',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: `[${issueType}] ${description}`
        });

        trip.auditTrail.push({
            action: 'Issue Reported',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Reported ${issueType}: ${description}`
        });

        await trip.save();

        // High-priority notification to Admin
        try {
            await Notification.create({
                title: `🚨 Issue on Trip ${trip.tripNumber}`,
                message: `Driver ${trip.driverName} reported "${issueType}": ${description}`,
                recipientRole: 'admin',
                category: 'fleet',
                priority: 'urgent',
                metadata: { tripId: trip._id, tripNumber: trip.tripNumber, issueType, type: 'TRIP_ISSUE' }
            });
            dispatchNotification({
                title: `🚨 Fleet Issue: ${trip.tripNumber}`,
                message: `${trip.driverName}: ${issueType} - ${description}`,
                recipientRole: 'admin',
                category: 'fleet',
                priority: 'urgent',
                link: '/admin/fleet',
                metadata: { tripId: trip._id }
            }).catch(() => {});
        } catch (e) {}

        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-issue-reported', { tripId: trip._id, tripNumber: trip.tripNumber, issue: issueObj });
            io.emit('trip-status-changed', trip);
        }

        res.json({
            success: true,
            message: 'Issue reported to logistics dispatch team.',
            trip
        });
    } catch (err) {
        console.error('reportTripIssue error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 12. UPDATE DELIVERY PROGRESS & PROOF (DRIVER) ────────────────────
exports.updateTripDelivery = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const {
            deliveredItems = [],
            receiverName,
            receiverPhone,
            signatureUrl,
            photos = [],
            remarks = ''
        } = req.body;

        const now = new Date();

        // Update items delivered/damaged/missing quantities
        if (Array.isArray(deliveredItems) && deliveredItems.length > 0) {
            for (const dItem of deliveredItems) {
                const target = trip.items.find(it => 
                    (it._id && dItem._id && it._id.toString() === dItem._id.toString()) ||
                    (it.inventoryItemId && dItem.inventoryItemId && it.inventoryItemId.toString() === dItem.inventoryItemId.toString()) ||
                    (it.itemName === dItem.itemName)
                );
                if (target) {
                    if (dItem.deliveredQuantity !== undefined) target.deliveredQuantity = Number(dItem.deliveredQuantity) || 0;
                    if (dItem.damagedQuantity !== undefined) target.damagedQuantity = Number(dItem.damagedQuantity) || 0;
                    if (dItem.missingQuantity !== undefined) target.missingQuantity = Number(dItem.missingQuantity) || 0;
                    if (dItem.returnedQuantity !== undefined) target.returnedQuantity = Number(dItem.returnedQuantity) || 0;
                    if (dItem.condition) target.condition = dItem.condition;
                    if (dItem.remarks) target.remarks = dItem.remarks;
                }
            }
        }

        trip.proofOfDelivery = {
            receiverName: receiverName || trip.proofOfDelivery?.receiverName || '',
            receiverPhone: receiverPhone || trip.proofOfDelivery?.receiverPhone || '',
            signatureUrl: signatureUrl || trip.proofOfDelivery?.signatureUrl || '',
            photos: Array.isArray(photos) && photos.length ? photos : (trip.proofOfDelivery?.photos || []),
            remarks: remarks || trip.proofOfDelivery?.remarks || '',
            submittedAt: now
        };

        trip.timeline.push({
            stage: 'Reached Destination',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: `Destination reached at ${trip.destination}`
        });

        trip.timeline.push({
            stage: 'Delivery Confirmed',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: receiverName ? `Proof recorded. Receiver: ${receiverName}` : 'Proof of delivery submitted by driver'
        });

        trip.auditTrail.push({
            action: 'Delivery Details Updated',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Proof of delivery submitted. Receiver: ${receiverName || 'N/A'}`
        });

        await trip.save();

        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-delivery-updated', { tripId: trip._id, tripNumber: trip.tripNumber });
            io.emit('trip-status-changed', trip);
        }

        res.json({
            success: true,
            message: 'Delivery details recorded successfully.',
            trip
        });
    } catch (err) {
        console.error('updateTripDelivery error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 13. FINISH TRIP WITH DELIVERY OUTCOME (DRIVER) ───────────────────
exports.finishTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const {
            deliveryOutcome = 'Fully Delivered',
            odometer,
            fuelRefillAmount = 0,
            fuelRatePerLiter = 0,
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

        // 1. Normalize delivery outcome to Title Case accepted by backend schema
        const OUTCOME_MAP = {
            'FULLY DELIVERED': 'Fully Delivered',
            'PARTIALLY DELIVERED': 'Partially Delivered',
            'RETURNED TO SOURCE': 'Returned to Source',
            'DELIVERY FAILED': 'Delivery Failed',
            'CANCELLED': 'Cancelled',
            'PENDING': 'Pending'
        };
        const normalizedOutcome = OUTCOME_MAP[String(deliveryOutcome).trim().toUpperCase()] || deliveryOutcome;

        // 2. Fuel Refill & Estimation Calculations (Replacing manual fuel consumption)
        const refillAmount = Math.max(0, parseFloat(fuelRefillAmount) || 0);
        const fuelRate = Math.max(0, parseFloat(fuelRatePerLiter) || 0);
        const refillLiters = (refillAmount > 0 && fuelRate > 0) ? parseFloat((refillAmount / fuelRate).toFixed(2)) : 0;

        // Fetch previous completed trip for this vehicle
        const previousTrip = await FleetTrip.findOne({
            vehicleId: trip.vehicleId,
            _id: { $ne: trip._id },
            status: 'Completed',
            'endReport.odometer': { $gt: 0 }
        }).sort({ actualDeliveryDateTime: -1, createdAt: -1 });

        const prevTripOdo = previousTrip ? (previousTrip.endReport?.odometer || startOdo) : startOdo;
        const kmSincePrevTrip = Math.max(0, endOdo - prevTripOdo);

        const vehicle = await Vehicle.findById(trip.vehicleId);
        const tankCapacity = vehicle?.tankCapacityLiters || 60;
        const defaultBenchmarkMileage = vehicle?.vehicleType === 'Pickup' ? 14 : 10;

        // Calculate Estimated Mileage (km/L)
        let estimatedMileage = defaultBenchmarkMileage;
        let estimationMethod = 'Fleet Benchmark Standard';

        if (refillLiters > 0 && kmSincePrevTrip > 0) {
            estimatedMileage = parseFloat((kmSincePrevTrip / refillLiters).toFixed(2));
            estimationMethod = 'Calculated from Previous Trip Odometer & Refill';
        } else if (previousTrip?.endReport?.estimatedMileageKmPerLiter > 0) {
            estimatedMileage = previousTrip.endReport.estimatedMileageKmPerLiter;
            estimationMethod = 'Carried from Previous Verified Trip';
        }

        // Estimated fuel consumed during this trip
        const estimatedConsumed = (distanceKm > 0 && estimatedMileage > 0)
            ? parseFloat((distanceKm / estimatedMileage).toFixed(2))
            : 0;

        // Estimated remaining fuel in tank
        const prevRemaining = previousTrip?.endReport?.estimatedRemainingFuelLiters != null
            ? previousTrip.endReport.estimatedRemainingFuelLiters
            : (tankCapacity * 0.5);

        const estimatedRemaining = parseFloat(Math.min(tankCapacity, Math.max(0, prevRemaining + refillLiters - estimatedConsumed)).toFixed(2));

        trip.status = 'Completed';
        trip.deliveryOutcome = normalizedOutcome;
        trip.actualDeliveryDateTime = now;

        trip.endReport = {
            odometer: endOdo,
            distanceKm,
            fuelRefillAmount: refillAmount,
            fuelRatePerLiter: fuelRate,
            fuelRefillLiters: refillLiters,
            previousTripOdometer: prevTripOdo,
            kmSincePreviousTrip,
            estimatedMileageKmPerLiter: estimatedMileage,
            estimatedFuelConsumedLiters: estimatedConsumed,
            estimatedRemainingFuelLiters: estimatedRemaining,
            fuelEstimationMethod: estimationMethod,
            fuelConsumption: estimatedConsumed, // Backward compat
            deliveryTime: now,
            deliveryConfirmation: normalizedOutcome,
            deliveryPhotos: trip.proofOfDelivery?.photos || [],
            remarks: remarks || trip.proofOfDelivery?.remarks || '',
            location: {
                lat: location?.lat || null,
                lng: location?.lng || null,
                address: location?.address || trip.destination
            },
            timestamp: now
        };

        trip.timeline.push({
            stage: normalizedOutcome === 'Returned to Source' ? 'Trip Completed / Returned' : 'Trip Completed',
            timestamp: now,
            performedBy: req.user.name || 'Driver',
            notes: `Outcome: ${normalizedOutcome}. Distance: ${distanceKm} km. Est. Mileage: ${estimatedMileage} km/L.`
        });

        trip.auditTrail.push({
            action: 'Trip Finished',
            performedBy: req.user.name || 'Driver',
            timestamp: now,
            details: `Trip finished with outcome ${normalizedOutcome}. End Odo: ${endOdo} km. Distance: ${distanceKm} km. Refill: ₹${refillAmount} (${refillLiters}L).`
        });

        await trip.save();

        // Release vehicle back to Available and log fuel refuels
        if (vehicle) {
            vehicle.status = 'Available';
            vehicle.assignedDriverId = null;
            vehicle.assignedDriverName = '';
            vehicle.currentOdometer = Math.max(vehicle.currentOdometer || 0, endOdo);
            if (refillAmount > 0 && refillLiters > 0) {
                vehicle.fuelLogs.push({
                    date: now,
                    liters: refillLiters,
                    costPerLiter: fuelRate,
                    totalCost: refillAmount,
                    odometerReading: endOdo,
                    kmDrivenSinceLastRefuel: kmSincePrevTrip,
                    fuelEconomyKmPerLiter: estimatedMileage,
                    fuelStation: 'Trip Refill',
                    notes: `Refill logged on trip ${trip.tripNumber}`
                });
            }
            await vehicle.save();
        }
            vehicle.currentOdometer = endOdo;
            await vehicle.save();
        }

        // If linked to StockTransfer, update StockTransfer status and items
        if (trip.stockTransferId) {
            const st = await StockTransfer.findById(trip.stockTransferId);
            if (st) {
                st.deliveryOutcome = deliveryOutcome;
                st.status = deliveryOutcome === 'Fully Delivered' ? 'Received' :
                            deliveryOutcome === 'Partially Delivered' ? 'Discrepancy Reported' :
                            deliveryOutcome === 'Returned to Source' ? 'In Transit' :
                            'Discrepancy Reported';

                st.receiverName = trip.proofOfDelivery?.receiverName || '';
                st.receiverSignature = trip.proofOfDelivery?.signatureUrl || '';
                st.deliveryPhotos = trip.proofOfDelivery?.photos || [];
                st.deliveryRemarks = remarks || trip.proofOfDelivery?.remarks || '';
                st.receivedAt = now;

                for (const tItem of trip.items) {
                    const stItem = st.items.find(i => 
                        (i._id && tItem._id && i._id.toString() === tItem._id.toString()) ||
                        (i.inventoryItemId && tItem.inventoryItemId && i.inventoryItemId.toString() === tItem.inventoryItemId.toString()) ||
                        (i.itemName === tItem.itemName)
                    );
                    if (stItem) {
                        stItem.receivedQuantity = tItem.deliveredQuantity || 0;
                        stItem.damagedQuantity = tItem.damagedQuantity || 0;
                        stItem.missingQuantity = tItem.missingQuantity || 0;
                        stItem.conditionOnArrival = tItem.condition || 'Good';
                        stItem.discrepancyNotes = tItem.remarks || '';
                    }
                }

                st.auditTrail.push({
                    action: 'TRIP_FINISHED',
                    performedBy: req.user.name || 'Driver',
                    timestamp: now,
                    details: `Driver completed trip ${trip.tripNumber}. Outcome: ${deliveryOutcome}. Awaiting Admin verification.`
                });

                await st.save();
            }
        }

        // Dispatch notifications
        try {
            await Notification.create({
                title: `Trip Completed: ${trip.tripNumber} (${deliveryOutcome})`,
                message: `Driver ${trip.driverName} finished trip ${trip.tripNumber}. Outcome: ${deliveryOutcome}. Verification pending.`,
                recipientRole: 'admin',
                category: 'fleet',
                priority: deliveryOutcome === 'Fully Delivered' ? 'medium' : 'high',
                metadata: { tripId: trip._id, tripNumber: trip.tripNumber, deliveryOutcome, type: 'TRIP_FINISHED' }
            });
            dispatchNotification({
                title: `Trip Finished: ${trip.tripNumber}`,
                message: `Outcome: ${deliveryOutcome}. Driver: ${trip.driverName}.`,
                recipientRole: 'admin',
                category: 'fleet',
                priority: 'high',
                link: '/admin/fleet',
                metadata: { tripId: trip._id }
            }).catch(() => {});
        } catch (e) {}

        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-finished', { tripId: trip._id, tripNumber: trip.tripNumber, deliveryOutcome });
            io.emit('trip-status-changed', trip);
        }

        res.json({
            success: true,
            message: `Trip finished successfully with outcome '${deliveryOutcome}'.`,
            trip
        });
    } catch (err) {
        console.error('finishTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 14. ADMIN VERIFICATION & INVENTORY RECONCILIATION ────────────────
exports.verifyAndReconcileTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const {
            reconciliationStatus = 'Approved',
            adminRemarks = '',
            verifiedItems = []
        } = req.body;

        const now = new Date();

        if (trip.isVerifiedByAdmin) {
            return res.status(400).json({
                success: false,
                message: 'This trip has already been verified and reconciled with inventory.'
            });
        }

        let stockTransfer = null;
        if (trip.stockTransferId) {
            stockTransfer = await StockTransfer.findById(trip.stockTransferId);
        }

        // ─── CRITICAL: REAL-TIME INVENTORY RECONCILIATION ───
        // Credits delivered items to destination warehouse
        // Credits returned items back to source warehouse
        // Logs damaged/missing items as inventory loss
        for (const it of trip.items) {
            const vItem = Array.isArray(verifiedItems) 
                ? verifiedItems.find(vi => vi._id && vi._id.toString() === it._id.toString())
                : null;

            const deliveredQty = vItem ? Number(vItem.deliveredQuantity) || 0 : (Number(it.deliveredQuantity) || 0);
            const returnedQty = vItem ? Number(vItem.returnedQuantity) || 0 : (Number(it.returnedQuantity) || 0);
            const damagedQty = vItem ? Number(vItem.damagedQuantity) || 0 : (Number(it.damagedQuantity) || 0);
            const missingQty = vItem ? Number(vItem.missingQuantity) || 0 : (Number(it.missingQuantity) || 0);

            it.deliveredQuantity = deliveredQty;
            it.returnedQuantity = returnedQty;
            it.damagedQuantity = damagedQty;
            it.missingQuantity = missingQty;

            if (!it.inventoryItemId) continue;
            const inv = await InventoryItem.findById(it.inventoryItemId);
            if (!inv) continue;

            const destLocId = stockTransfer?.destinationWarehouseId ? stockTransfer.destinationWarehouseId.toString() : null;
            const sourceLocId = stockTransfer?.sourceWarehouseId ? stockTransfer.sourceWarehouseId.toString() : null;

            // 1. Credit delivered quantities to destination warehouse
            if (deliveredQty > 0 && destLocId) {
                if (!Array.isArray(inv.locationStock)) inv.locationStock = [];
                let destEntry = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === destLocId);
                if (destEntry) {
                    destEntry.quantity = (Number(destEntry.quantity) || 0) + deliveredQty;
                } else {
                    inv.locationStock.push({
                        warehouseId: stockTransfer.destinationWarehouseId,
                        warehouseName: stockTransfer.destinationWarehouseName,
                        quantity: deliveredQty,
                        minThreshold: 5
                    });
                }
                if (!sourceLocId) {
                    inv.quantity = (Number(inv.quantity) || 0) + deliveredQty;
                }

                inv.stockMovements.push({
                    type: 'IN',
                    quantity: deliveredQty,
                    reference: `${trip.tripNumber} / ${stockTransfer?.transferNumber || 'TRIP'}`,
                    reason: `Trip delivery verified at ${trip.destination}`,
                    performedBy: req.user.name || 'Admin',
                    date: now
                });
            }

            // 2. Credit returned quantities BACK to source warehouse
            if (returnedQty > 0 && sourceLocId) {
                if (!Array.isArray(inv.locationStock)) inv.locationStock = [];
                let srcEntry = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === sourceLocId);
                if (srcEntry) {
                    srcEntry.quantity = (Number(srcEntry.quantity) || 0) + returnedQty;
                } else {
                    inv.locationStock.push({
                        warehouseId: stockTransfer.sourceWarehouseId,
                        warehouseName: stockTransfer.sourceWarehouseName,
                        quantity: returnedQty,
                        minThreshold: 5
                    });
                }
                if (!destLocId) {
                    inv.quantity = (Number(inv.quantity) || 0) + returnedQty;
                }

                inv.stockMovements.push({
                    type: 'RETURN',
                    quantity: returnedQty,
                    reference: `${trip.tripNumber} / ${stockTransfer?.transferNumber || 'TRIP'}`,
                    reason: `Trip items returned to source warehouse ${stockTransfer?.sourceWarehouseName}`,
                    performedBy: req.user.name || 'Admin',
                    date: now
                });
            }

            // 3. Log damaged or missing quantities as discrepancy loss
            if (damagedQty > 0 || missingQty > 0) {
                const totalLoss = damagedQty + missingQty;
                if (destLocId && sourceLocId) {
                    inv.quantity = Math.max(0, (Number(inv.quantity) || 0) - totalLoss);
                }
                inv.stockMovements.push({
                    type: 'LOSS',
                    quantity: totalLoss,
                    reference: `${trip.tripNumber} / ${stockTransfer?.transferNumber || 'TRIP'}`,
                    reason: `Trip discrepancy: ${damagedQty} damaged, ${missingQty} missing during transit`,
                    performedBy: req.user.name || 'Admin',
                    date: now
                });
            }

            await inv.save();
        }

        trip.isVerifiedByAdmin = true;
        trip.adminVerification = {
            verifiedBy: req.user._id,
            verifiedByName: req.user.name || 'Admin',
            verifiedAt: now,
            reconciliationStatus,
            adminRemarks
        };

        trip.timeline.push({
            stage: 'Reconciliation Complete',
            timestamp: now,
            performedBy: req.user.name || 'Admin',
            notes: `Delivery verified and reconciled by ${req.user.name}. Status: ${reconciliationStatus}`
        });

        trip.auditTrail.push({
            action: 'Delivery Verified & Reconciled',
            performedBy: req.user.name || 'Admin',
            timestamp: now,
            details: `Admin verified trip delivery. Reconciliation status: ${reconciliationStatus}. ${adminRemarks}`
        });

        await trip.save();

        if (stockTransfer) {
            stockTransfer.verifiedByAdmin = true;
            stockTransfer.verifiedAt = now;
            stockTransfer.verifiedByName = req.user.name || 'Admin';
            stockTransfer.status = 'Reconciled';
            stockTransfer.auditTrail.push({
                action: 'RECONCILED',
                performedBy: req.user.name || 'Admin',
                timestamp: now,
                details: `Admin verified delivery for Trip ${trip.tripNumber}. Stock inventory successfully updated.`
            });
            await stockTransfer.save();
        }

        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-reconciled', { tripId: trip._id, tripNumber: trip.tripNumber });
            io.emit('trip-status-changed', trip);
        }

        res.json({
            success: true,
            message: 'Trip delivery verified and stock inventory successfully reconciled.',
            trip,
            stockTransfer
        });
    } catch (err) {
        console.error('verifyAndReconcileTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 15. REASSIGN DRIVER / VEHICLE / RESCHEDULE TRIP (ADMIN) ──────────
exports.reassignTrip = async (req, res) => {
    try {
        const trip = await FleetTrip.findById(req.params.id);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip not found.' });

        const {
            driverId,
            vehicleId,
            pickupDateTime,
            deliveryExpectedDateTime,
            notes = ''
        } = req.body;

        const now = new Date();
        const prevDriverName = trip.driverName;
        const prevVehicleReg = trip.vehicleRegistration;

        // If new driver selected, validate and check availability
        if (driverId && driverId.toString() !== trip.driverId.toString()) {
            const newDriver = await Driver.findById(driverId);
            if (!newDriver || newDriver.status !== 'Active') {
                return res.status(400).json({ success: false, message: 'New driver not found or not active.' });
            }

            const activeDriverTrip = await FleetTrip.findOne({
                _id: { $ne: trip._id },
                driverId: newDriver._id,
                status: { $in: ['Started', 'In Transit', 'Paused'] }
            });
            if (activeDriverTrip) {
                return res.status(400).json({
                    success: false,
                    message: `Driver ${newDriver.name} is currently on active trip ${activeDriverTrip.tripNumber}.`
                });
            }

            trip.driverId = newDriver._id;
            trip.driverUserId = newDriver.userId || null;
            trip.driverName = newDriver.name;
            trip.driverPhone = newDriver.phone;
            trip.driverLicenseNumber = newDriver.licenseNumber;

            trip.timeline.push({
                stage: 'Driver Reassigned',
                timestamp: now,
                performedBy: req.user.name || 'Admin',
                notes: `Driver changed from ${prevDriverName} to ${newDriver.name}`
            });
        }

        // If new vehicle selected, validate and check availability
        if (vehicleId && vehicleId.toString() !== trip.vehicleId.toString()) {
            const newVeh = await Vehicle.findById(vehicleId);
            if (!newVeh || newVeh.status === 'In Maintenance' || newVeh.status === 'Out of Service') {
                return res.status(400).json({ success: false, message: 'Selected vehicle is unavailable or in maintenance.' });
            }
            const activeVehTrip = await FleetTrip.findOne({
                _id: { $ne: trip._id },
                vehicleId: newVeh._id,
                status: { $in: ['Started', 'In Transit', 'Paused'] }
            });
            if (activeVehTrip) {
                return res.status(400).json({
                    success: false,
                    message: `Vehicle ${newVeh.registrationNumber} is currently on active trip ${activeVehTrip.tripNumber}.`
                });
            }

            trip.vehicleId = newVeh._id;
            trip.vehicleRegistration = newVeh.registrationNumber;
            trip.vehicleName = newVeh.vehicleName;
            trip.vehicleType = newVeh.vehicleType;

            trip.timeline.push({
                stage: 'Vehicle Reassigned',
                timestamp: now,
                performedBy: req.user.name || 'Admin',
                notes: `Vehicle changed from ${prevVehicleReg} to ${newVeh.registrationNumber}`
            });
        }

        if (pickupDateTime) trip.pickupDateTime = new Date(pickupDateTime);
        if (deliveryExpectedDateTime) trip.deliveryExpectedDateTime = new Date(deliveryExpectedDateTime);
        if (req.body.mapLink !== undefined) trip.mapLink = req.body.mapLink ? String(req.body.mapLink).trim() : '';
        if (req.body.dropPoint !== undefined) trip.dropPoint = req.body.dropPoint ? String(req.body.dropPoint).trim() : '';

        trip.auditTrail.push({
            action: 'Trip Reassigned / Rescheduled',
            performedBy: req.user.name || 'Admin',
            timestamp: now,
            details: `Trip reassigned by admin. ${notes}`
        });

        await trip.save();

        if (trip.stockTransferId) {
            const st = await StockTransfer.findById(trip.stockTransferId);
            if (st) {
                st.driverId = trip.driverId;
                st.driverName = trip.driverName;
                st.driverPhone = trip.driverPhone;
                st.vehicleId = trip.vehicleId;
                st.vehicleNumber = trip.vehicleRegistration;
                st.vehicleName = trip.vehicleName;
                await st.save();
            }
        }

        // Notify new driver
        if (trip.driverUserId) {
            try {
                await Notification.create({
                    title: `Trip Assigned: ${trip.tripNumber}`,
                    message: `Trip ${trip.tripNumber} to ${trip.destination} has been assigned to you. Scheduled departure: ${new Date(trip.pickupDateTime).toLocaleString()}.`,
                    recipientRole: 'driver',
                    recipientUser: trip.driverUserId,
                    category: 'task',
                    priority: 'high',
                    metadata: { tripId: trip._id, tripNumber: trip.tripNumber, type: 'TRIP_ASSIGNED' }
                });
            } catch (e) {}
        }

        const io = socketUtil.getIO();
        if (io) {
            io.emit('trip-reassigned', { tripId: trip._id, tripNumber: trip.tripNumber });
            io.emit('trip-status-changed', trip);
        }

        res.json({ success: true, message: 'Trip successfully reassigned and rescheduled.', trip });
    } catch (err) {
        console.error('reassignTrip error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 16. TRIP METRICS SUMMARY (ADMIN) ─────────────────────────────────
exports.getTripMetrics = async (req, res) => {
    try {
        const totalTrips = await FleetTrip.countDocuments();
        const scheduledTrips = await FleetTrip.countDocuments({ status: { $in: ['Assigned', 'Confirmed'] } });
        const inTransitTrips = await FleetTrip.countDocuments({ status: { $in: ['Started', 'In Transit', 'Paused'] } });
        const deliveredTrips = await FleetTrip.countDocuments({ status: 'Completed', deliveryOutcome: 'Fully Delivered' });
        const partiallyDeliveredTrips = await FleetTrip.countDocuments({ status: 'Completed', deliveryOutcome: 'Partially Delivered' });
        const returnedTrips = await FleetTrip.countDocuments({ status: 'Completed', deliveryOutcome: 'Returned to Source' });
        const delayedTrips = await FleetTrip.countDocuments({
            deliveryExpectedDateTime: { $lt: new Date() },
            status: { $nin: ['Completed', 'Cancelled'] }
        });
        const issuesReportedTrips = await FleetTrip.countDocuments({ 'reportedIssues.0': { $exists: true } });

        res.json({
            success: true,
            metrics: {
                totalTrips,
                scheduledTrips,
                inTransitTrips,
                deliveredTrips,
                partiallyDeliveredTrips,
                returnedTrips,
                delayedTrips,
                issuesReportedTrips
            }
        });
    } catch (err) {
        console.error('getTripMetrics error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
