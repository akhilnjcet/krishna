const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const User = require('../models/User');

// ─── LIST VEHICLES ───────────────────────────────────────────────────
exports.getVehicles = async (req, res) => {
    try {
        const { status, vehicleType, search, expiringDocs } = req.query;
        const query = {};

        if (status && status !== 'All') query.status = status;
        if (vehicleType && vehicleType !== 'All') query.vehicleType = vehicleType;

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { registrationNumber: regex },
                { vehicleName: regex },
                { assignedDriverName: regex }
            ];
        }

        const vehicles = await Vehicle.find(query)
            .populate('assignedDriverId', 'name email phone')
            .sort({ createdAt: -1 });

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Check expiring documents
        const processedVehicles = vehicles.map(v => {
            const vObj = v.toObject();
            const expiringList = (vObj.documents || []).filter(d => {
                if (!d.expiryDate) return false;
                const exp = new Date(d.expiryDate);
                return exp <= thirtyDaysFromNow;
            }).map(d => ({
                ...d,
                isExpired: new Date(d.expiryDate) < now,
                daysRemaining: Math.ceil((new Date(d.expiryDate) - now) / (1000 * 60 * 60 * 24))
            }));

            // Calculate total expenses for this vehicle
            const totalFuelExpense = (vObj.fuelLogs || []).reduce((s, f) => s + (f.totalCost || 0), 0);
            const totalServiceExpense = (vObj.serviceLogs || []).reduce((s, srv) => s + (srv.totalCost || 0), 0);
            const totalDistance = (vObj.trips || []).reduce((s, t) => s + (t.distanceKm || 0), 0);

            // Calculate average fuel efficiency
            const validFuelLogs = (vObj.fuelLogs || []).filter(f => f.fuelEconomyKmPerLiter > 0);
            const avgEfficiency = validFuelLogs.length > 0
                ? (validFuelLogs.reduce((s, f) => s + f.fuelEconomyKmPerLiter, 0) / validFuelLogs.length).toFixed(1)
                : 0;

            return {
                ...vObj,
                expiringDocuments: expiringList,
                hasExpiringDocs: expiringList.length > 0,
                totalFuelExpense,
                totalServiceExpense,
                totalExpenses: totalFuelExpense + totalServiceExpense,
                totalDistance,
                avgEfficiency: parseFloat(avgEfficiency)
            };
        });

        if (expiringDocs === 'true') {
            return res.json({
                success: true,
                count: processedVehicles.filter(v => v.hasExpiringDocs).length,
                vehicles: processedVehicles.filter(v => v.hasExpiringDocs)
            });
        }

        res.json({ success: true, count: processedVehicles.length, vehicles: processedVehicles });
    } catch (err) {
        console.error('getVehicles error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET SINGLE VEHICLE ──────────────────────────────────────────────
exports.getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id)
            .populate('assignedDriverId', 'name email phone')
            .populate('trips.projectId', 'title customerId location');

        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── REGISTER / CREATE VEHICLE ──────────────────────────────────────
exports.createVehicle = async (req, res) => {
    try {
        const {
            registrationNumber,
            vehicleName,
            vehicleType,
            assignedDriverId,
            driverLicenseNumber,
            currentOdometer = 0,
            fuelType = 'Diesel',
            tankCapacityLiters = 60,
            notes
        } = req.body;

        if (!registrationNumber || !vehicleName || !vehicleType) {
            return res.status(400).json({ success: false, message: 'Registration number, vehicle name, and vehicle type are required.' });
        }

        const cleanReg = registrationNumber.trim().toUpperCase();
        const existing = await Vehicle.findOne({ registrationNumber: cleanReg });
        if (existing) {
            return res.status(400).json({ success: false, message: `Vehicle with registration ${cleanReg} is already registered.` });
        }

        let assignedDriverName = '';
        let assignedDriverPhone = '';
        let assignedDriverLicense = driverLicenseNumber || '';
        let assignedDriverRef = null;
        let matchedDriver = null;

        if (assignedDriverId) {
            matchedDriver = await Driver.findById(assignedDriverId);
            if (matchedDriver) {
                assignedDriverName = matchedDriver.name;
                assignedDriverPhone = matchedDriver.phone;
                assignedDriverLicense = matchedDriver.licenseNumber;
                assignedDriverRef = matchedDriver._id;
            } else {
                const driver = await User.findById(assignedDriverId);
                if (driver) {
                    assignedDriverName = driver.name;
                    assignedDriverPhone = driver.phone || driver.phoneNumber || '';
                }
            }
        }

        const vehicle = new Vehicle({
            registrationNumber: cleanReg,
            vehicleName: vehicleName.trim(),
            vehicleType,
            assignedDriverId: (matchedDriver?.employeeId || (matchedDriver ? null : assignedDriverId)) || null,
            assignedDriverRef: assignedDriverRef || null,
            assignedDriverName,
            assignedDriverPhone,
            driverLicenseNumber: assignedDriverLicense,
            status: 'Available',
            currentOdometer: parseFloat(currentOdometer) || 0,
            fuelType,
            tankCapacityLiters: parseFloat(tankCapacityLiters) || 60,
            notes: notes || ''
        });

        await vehicle.save();

        // If driver assigned, update Driver record
        if (matchedDriver) {
            matchedDriver.currentAssignedVehicle = {
                vehicleId: vehicle._id,
                registrationNumber: vehicle.registrationNumber,
                vehicleName: vehicle.vehicleName,
                assignedAt: new Date()
            };
            matchedDriver.assignmentHistory.push({
                vehicleId: vehicle._id,
                registrationNumber: vehicle.registrationNumber,
                vehicleName: vehicle.vehicleName,
                assignedAt: new Date(),
                unassignedAt: null,
                assignedBy: req.user?._id || null,
                assignedByName: req.user?.name || 'Administrator',
                reason: 'Vehicle Registration Initial Assignment'
            });
            await matchedDriver.save();
        }

        res.status(201).json({ success: true, message: 'Vehicle registered successfully', vehicle });
    } catch (err) {
        console.error('createVehicle error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── UPDATE VEHICLE DETAILS ─────────────────────────────────────────
exports.updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const {
            vehicleName,
            vehicleType,
            assignedDriverId,
            driverLicenseNumber,
            status,
            currentOdometer,
            fuelType,
            tankCapacityLiters,
            notes
        } = req.body;

        if (vehicleName) vehicle.vehicleName = vehicleName.trim();
        if (vehicleType) vehicle.vehicleType = vehicleType;
        if (status) vehicle.status = status;
        if (currentOdometer !== undefined) vehicle.currentOdometer = parseFloat(currentOdometer);
        if (fuelType) vehicle.fuelType = fuelType;
        if (tankCapacityLiters !== undefined) vehicle.tankCapacityLiters = parseFloat(tankCapacityLiters);
        if (driverLicenseNumber !== undefined) vehicle.driverLicenseNumber = driverLicenseNumber;
        if (notes !== undefined) vehicle.notes = notes;

        if (assignedDriverId !== undefined) {
            const oldDriverRef = vehicle.assignedDriverRef;
            if (assignedDriverId) {
                const newDriver = await Driver.findById(assignedDriverId);
                if (newDriver) {
                    // If vehicle previously had a different driver, unassign old driver
                    if (oldDriverRef && oldDriverRef.toString() !== newDriver._id.toString()) {
                        const oldDriver = await Driver.findById(oldDriverRef);
                        if (oldDriver) {
                            if (oldDriver.assignmentHistory && oldDriver.assignmentHistory.length > 0) {
                                const last = oldDriver.assignmentHistory[oldDriver.assignmentHistory.length - 1];
                                if (!last.unassignedAt) {
                                    last.unassignedAt = new Date();
                                    last.reason = `Replaced by ${newDriver.name}`;
                                }
                            }
                            oldDriver.currentAssignedVehicle = { vehicleId: null, registrationNumber: '', vehicleName: '', assignedAt: null };
                            await oldDriver.save();
                        }
                    }

                    vehicle.assignedDriverRef = newDriver._id;
                    vehicle.assignedDriverId = newDriver.employeeId || null;
                    vehicle.assignedDriverName = newDriver.name;
                    vehicle.assignedDriverPhone = newDriver.phone;
                    vehicle.driverLicenseNumber = newDriver.licenseNumber;

                    // Update new driver
                    newDriver.currentAssignedVehicle = {
                        vehicleId: vehicle._id,
                        registrationNumber: vehicle.registrationNumber,
                        vehicleName: vehicle.vehicleName,
                        assignedAt: new Date()
                    };
                    newDriver.assignmentHistory.push({
                        vehicleId: vehicle._id,
                        registrationNumber: vehicle.registrationNumber,
                        vehicleName: vehicle.vehicleName,
                        assignedAt: new Date(),
                        unassignedAt: null,
                        assignedBy: req.user?._id || null,
                        assignedByName: req.user?.name || 'Administrator',
                        reason: 'Vehicle Assignment Update'
                    });
                    await newDriver.save();
                } else {
                    const driver = await User.findById(assignedDriverId);
                    if (driver) {
                        vehicle.assignedDriverId = driver._id;
                        vehicle.assignedDriverRef = null;
                        vehicle.assignedDriverName = driver.name;
                        vehicle.assignedDriverPhone = driver.phone || driver.phoneNumber || '';
                    }
                }
            } else {
                // Unassign driver
                if (oldDriverRef) {
                    const oldDriver = await Driver.findById(oldDriverRef);
                    if (oldDriver) {
                        if (oldDriver.assignmentHistory && oldDriver.assignmentHistory.length > 0) {
                            const last = oldDriver.assignmentHistory[oldDriver.assignmentHistory.length - 1];
                            if (!last.unassignedAt) {
                                last.unassignedAt = new Date();
                                last.reason = 'Unassigned from vehicle';
                            }
                        }
                        oldDriver.currentAssignedVehicle = { vehicleId: null, registrationNumber: '', vehicleName: '', assignedAt: null };
                        await oldDriver.save();
                    }
                }
                vehicle.assignedDriverId = null;
                vehicle.assignedDriverRef = null;
                vehicle.assignedDriverName = '';
                vehicle.assignedDriverPhone = '';
                vehicle.driverLicenseNumber = '';
            }
        }

        await vehicle.save();
        res.json({ success: true, message: 'Vehicle updated successfully', vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADD VEHICLE DOCUMENT ───────────────────────────────────────────
exports.addVehicleDocument = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const { docType, documentNumber, issueDate, expiryDate, fileUrl, notes } = req.body;
        if (!docType || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Document type and expiry date are required.' });
        }

        vehicle.documents.push({
            docType,
            documentNumber: documentNumber || '',
            issueDate: issueDate ? new Date(issueDate) : undefined,
            expiryDate: new Date(expiryDate),
            fileUrl: fileUrl || '',
            notes: notes || ''
        });

        await vehicle.save();
        res.status(201).json({ success: true, message: 'Document added successfully', documents: vehicle.documents });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── START OR COMPLETE A TRIP ───────────────────────────────────────
exports.recordTrip = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const {
            projectId,
            startLocation = 'Central Yard / Workshop',
            destination,
            driverId,
            startOdometer,
            endOdometer,
            purpose = 'Fabrication Site Delivery',
            isCompleted = false
        } = req.body;

        const effectiveStart = (startOdometer !== undefined) ? parseFloat(startOdometer) : vehicle.currentOdometer;
        const effectiveEnd = endOdometer ? parseFloat(endOdometer) : 0;
        const distanceKm = effectiveEnd > effectiveStart ? (effectiveEnd - effectiveStart) : 0;

        let projectTitle = '';
        if (projectId) {
            const p = await Project.findById(projectId);
            if (p) projectTitle = p.title;
        }

        let tripDriverId = vehicle.assignedDriverRef || vehicle.assignedDriverId;
        let tripDriverName = vehicle.assignedDriverName || 'Driver';
        let tripDriverPhone = vehicle.assignedDriverPhone || '';
        let tripDriverLicense = vehicle.driverLicenseNumber || '';

        if (driverId) {
            const matchedDrv = await Driver.findById(driverId);
            if (matchedDrv) {
                tripDriverId = matchedDrv._id;
                tripDriverName = matchedDrv.name;
                tripDriverPhone = matchedDrv.phone;
                tripDriverLicense = matchedDrv.licenseNumber;
            } else {
                const d = await User.findById(driverId);
                if (d) {
                    tripDriverId = d._id;
                    tripDriverName = d.name;
                    tripDriverPhone = d.phone || d.phoneNumber || '';
                }
            }
        }

        const tripNumber = `TRIP-${Date.now().toString(36).toUpperCase()}`;

        const trip = {
            tripNumber,
            date: new Date(),
            projectId: projectId || null,
            projectTitle,
            startLocation,
            destination: destination || 'Site Delivery',
            driverId: tripDriverId,
            driverName: tripDriverName,
            driverPhone: tripDriverPhone,
            driverLicenseNumber: tripDriverLicense,
            startOdometer: effectiveStart,
            endOdometer: effectiveEnd,
            distanceKm,
            purpose,
            status: isCompleted ? 'Completed' : 'Started',
            completedAt: isCompleted ? new Date() : undefined
        };

        vehicle.trips.unshift(trip);
        if (isCompleted && effectiveEnd > vehicle.currentOdometer) {
            vehicle.currentOdometer = effectiveEnd;
            vehicle.status = 'Available';
        } else if (!isCompleted) {
            vehicle.status = 'On Trip';
        }

        await vehicle.save();
        res.status(201).json({ success: true, message: isCompleted ? 'Trip completed successfully' : 'Trip started successfully', trip, vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── COMPLETE ONGOING TRIP ──────────────────────────────────────────
exports.completeTrip = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const trip = vehicle.trips.id(req.params.tripId);
        if (!trip) return res.status(404).json({ success: false, message: 'Trip record not found' });

        const { endOdometer } = req.body;
        if (!endOdometer || parseFloat(endOdometer) < trip.startOdometer) {
            return res.status(400).json({ success: false, message: 'Valid ending odometer reading greater than start odometer is required.' });
        }

        trip.endOdometer = parseFloat(endOdometer);
        trip.distanceKm = trip.endOdometer - trip.startOdometer;
        trip.status = 'Completed';
        trip.completedAt = new Date();

        vehicle.currentOdometer = trip.endOdometer;
        vehicle.status = 'Available';

        await vehicle.save();
        res.json({ success: true, message: 'Trip completed successfully', trip, vehicle });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── LOG FUEL EXPENSE (INTEGRATED WITH FINANCE / EXPENSE) ───────────
exports.recordFuelExpense = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const {
            liters,
            costPerLiter,
            totalCost,
            odometerReading,
            fuelStation = 'Local Petrol Pump',
            receiptUrl,
            notes,
            projectId
        } = req.body;

        if (!liters || !totalCost || !odometerReading) {
            return res.status(400).json({ success: false, message: 'Fuel liters, total cost, and odometer reading are required.' });
        }

        const odo = parseFloat(odometerReading);
        const ltrs = parseFloat(liters);
        const cost = parseFloat(totalCost);

        // Calculate distance driven since previous fuel log
        let kmDrivenSinceLastRefuel = 0;
        let fuelEconomyKmPerLiter = 0;

        if (vehicle.fuelLogs && vehicle.fuelLogs.length > 0) {
            const lastLog = vehicle.fuelLogs[0]; // sorted newest first
            if (lastLog.odometerReading && odo > lastLog.odometerReading) {
                kmDrivenSinceLastRefuel = odo - lastLog.odometerReading;
                fuelEconomyKmPerLiter = parseFloat((kmDrivenSinceLastRefuel / ltrs).toFixed(2));
            }
        }

        // 1. Single Source of Truth: Create Financial Expense entry
        const expense = new Expense({
            type: 'expense',
            title: `Vehicle Fuel: ${vehicle.registrationNumber} (${ltrs}L)`,
            amount: cost,
            category: 'fuel',
            costType: 'transportation',
            projectId: projectId || null,
            description: `Fuel refill at ${fuelStation}. Odometer: ${odo} km. Notes: ${notes || 'None'}`,
            date: new Date(),
            recordedBy: req.user?._id
        });
        await expense.save();

        // 2. Attach fuel log to vehicle
        const fuelLog = {
            date: new Date(),
            liters: ltrs,
            costPerLiter: costPerLiter ? parseFloat(costPerLiter) : parseFloat((cost / ltrs).toFixed(2)),
            totalCost: cost,
            odometerReading: odo,
            kmDrivenSinceLastRefuel,
            fuelEconomyKmPerLiter,
            fuelStation,
            expenseId: expense._id,
            receiptUrl: receiptUrl || '',
            notes: notes || ''
        };

        vehicle.fuelLogs.unshift(fuelLog);
        if (odo > vehicle.currentOdometer) {
            vehicle.currentOdometer = odo;
        }

        await vehicle.save();
        res.status(201).json({ success: true, message: 'Fuel expense recorded & synced with Finance successfully', fuelLog, expenseId: expense._id });
    } catch (err) {
        console.error('recordFuelExpense error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── LOG VEHICLE SERVICE / MAINTENANCE (INTEGRATED WITH FINANCE) ────
exports.recordServiceExpense = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const {
            serviceType,
            odometerReading,
            garageName = 'Authorized Service Station',
            totalCost,
            nextServiceDueOdometer,
            nextServiceDueDate,
            invoiceUrl,
            notes
        } = req.body;

        if (!serviceType || totalCost === undefined) {
            return res.status(400).json({ success: false, message: 'Service type and total cost are required.' });
        }

        const cost = parseFloat(totalCost) || 0;
        const odo = odometerReading ? parseFloat(odometerReading) : vehicle.currentOdometer;

        // 1. Single Source of Truth: Create Financial Expense entry if cost > 0
        let expenseId = null;
        if (cost > 0) {
            const expense = new Expense({
                type: 'expense',
                title: `Vehicle Service: ${vehicle.registrationNumber} (${serviceType})`,
                amount: cost,
                category: 'machinery',
                costType: 'transportation',
                description: `Maintenance at ${garageName}. Odometer: ${odo} km. Details: ${notes || 'Regular maintenance'}`,
                date: new Date(),
                recordedBy: req.user?._id
            });
            await expense.save();
            expenseId = expense._id;
        }

        // 2. Attach service log to vehicle
        const serviceLog = {
            serviceDate: new Date(),
            serviceType,
            odometerReading: odo,
            garageName,
            totalCost: cost,
            expenseId,
            invoiceUrl: invoiceUrl || '',
            nextServiceDueOdometer: nextServiceDueOdometer ? parseFloat(nextServiceDueOdometer) : 0,
            nextServiceDueDate: nextServiceDueDate ? new Date(nextServiceDueDate) : undefined,
            notes: notes || ''
        };

        vehicle.serviceLogs.unshift(serviceLog);
        if (odo > vehicle.currentOdometer) {
            vehicle.currentOdometer = odo;
        }

        await vehicle.save();
        res.status(201).json({ success: true, message: 'Service record logged & synced with Finance successfully', serviceLog, expenseId });
    } catch (err) {
        console.error('recordServiceExpense error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── FLEET ANALYTICS & REPORTS ──────────────────────────────────────
exports.getFleetReports = async (req, res) => {
    try {
        const vehicles = await Vehicle.find();

        let totalVehicles = vehicles.length;
        let availableVehicles = 0;
        let onTripVehicles = 0;
        let inMaintenanceVehicles = 0;

        let totalFleetFuelCost = 0;
        let totalFleetMaintenanceCost = 0;
        let totalFleetDistance = 0;

        const vehicleSummaries = vehicles.map(v => {
            if (v.status === 'Available') availableVehicles++;
            else if (v.status === 'On Trip') onTripVehicles++;
            else if (v.status === 'In Maintenance') inMaintenanceVehicles++;

            const fuelCost = (v.fuelLogs || []).reduce((s, f) => s + (f.totalCost || 0), 0);
            const serviceCost = (v.serviceLogs || []).reduce((s, srv) => s + (srv.totalCost || 0), 0);
            const distance = (v.trips || []).reduce((s, t) => s + (t.distanceKm || 0), 0);

            totalFleetFuelCost += fuelCost;
            totalFleetMaintenanceCost += serviceCost;
            totalFleetDistance += distance;

            return {
                id: v._id,
                registrationNumber: v.registrationNumber,
                name: v.vehicleName,
                type: v.vehicleType,
                status: v.status,
                driver: v.assignedDriverName || 'Unassigned',
                currentOdometer: v.currentOdometer,
                fuelCost,
                serviceCost,
                totalCost: fuelCost + serviceCost,
                totalDistance: distance
            };
        });

        res.json({
            success: true,
            kpis: {
                totalVehicles,
                availableVehicles,
                onTripVehicles,
                inMaintenanceVehicles,
                totalFleetFuelCost: Math.round(totalFleetFuelCost),
                totalFleetMaintenanceCost: Math.round(totalFleetMaintenanceCost),
                totalFleetExpenses: Math.round(totalFleetFuelCost + totalFleetMaintenanceCost),
                totalFleetDistance
            },
            vehicleSummaries
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
