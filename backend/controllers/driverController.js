const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { dispatchNotification } = require('../services/notificationDispatcher');

// ─── 1. LIST DRIVERS (WITH FILTERS) ──────────────────────────────────
exports.getDrivers = async (req, res) => {
    try {
        const { status, search, expiringOnly, availableOnly } = req.query;
        const query = {};

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: regex },
                { phone: regex },
                { licenseNumber: regex },
                { staff_id: regex },
                { 'currentAssignedVehicle.registrationNumber': regex }
            ];
        }

        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

        if (expiringOnly === 'true') {
            query.licenseExpiryDate = { $lte: thirtyDaysAhead };
        }

        if (availableOnly === 'true') {
            query.status = 'Active';
            query['currentAssignedVehicle.vehicleId'] = null;
        }

        const drivers = await Driver.find(query)
            .populate('employeeId', 'name email phone staff_id designation department')
            .sort({ createdAt: -1 });

        // Augment with active trip status from Vehicle
        const augmented = await Promise.all(drivers.map(async (drv) => {
            const dObj = drv.toObject({ virtuals: true });
            let isOnActiveTrip = false;
            if (dObj.currentAssignedVehicle?.vehicleId) {
                const veh = await Vehicle.findById(dObj.currentAssignedVehicle.vehicleId).select('status');
                if (veh && veh.status === 'On Trip') {
                    isOnActiveTrip = true;
                }
            }
            dObj.isOnActiveTrip = isOnActiveTrip;
            return dObj;
        }));

        res.json({
            success: true,
            count: augmented.length,
            drivers: augmented
        });
    } catch (err) {
        console.error('getDrivers error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 2. DRIVER DASHBOARD SUMMARY & KPIS ─────────────────────────────
exports.getDriverDashboardSummary = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

        const allDrivers = await Driver.find({}).lean({ virtuals: true });
        const totalDrivers = allDrivers.length;
        const activeDrivers = allDrivers.filter(d => d.status === 'Active').length;
        const inactiveDrivers = allDrivers.filter(d => d.status === 'Inactive').length;
        const suspendedDrivers = allDrivers.filter(d => d.status === 'Suspended').length;

        // Currently assigned
        const assignedDrivers = allDrivers.filter(d => d.status === 'Active' && d.currentAssignedVehicle?.vehicleId).length;
        const availableDrivers = allDrivers.filter(d => d.status === 'Active' && !d.currentAssignedVehicle?.vehicleId).length;

        // License alerts
        const expiredLicenses = allDrivers.filter(d => d.licenseExpiryDate && new Date(d.licenseExpiryDate) < now);
        const expiringSoonLicenses = allDrivers.filter(d => {
            if (!d.licenseExpiryDate) return false;
            const exp = new Date(d.licenseExpiryDate);
            return exp >= now && exp <= thirtyDaysAhead;
        });

        // Drivers currently on active trips
        const onTripVehicles = await Vehicle.find({ status: 'On Trip' }).select('assignedDriverRef assignedDriverName');
        const onTripDriverIds = new Set(onTripVehicles.map(v => v.assignedDriverRef?.toString()).filter(Boolean));
        const driversOnTripCount = allDrivers.filter(d => onTripDriverIds.has(d._id.toString())).length;

        res.json({
            success: true,
            kpis: {
                totalDrivers,
                activeDrivers,
                inactiveDrivers,
                suspendedDrivers,
                availableDrivers,
                assignedDrivers,
                driversOnTrip: driversOnTripCount,
                expiredLicensesCount: expiredLicenses.length,
                expiringSoonCount: expiringSoonLicenses.length,
                urgentAlerts: [...expiredLicenses, ...expiringSoonLicenses].map(d => ({
                    _id: d._id,
                    name: d.name,
                    phone: d.phone,
                    licenseNumber: d.licenseNumber,
                    licenseExpiryDate: d.licenseExpiryDate,
                    isExpired: new Date(d.licenseExpiryDate) < now,
                    daysRemaining: Math.ceil((new Date(d.licenseExpiryDate) - now) / (1000 * 60 * 60 * 24))
                }))
            }
        });
    } catch (err) {
        console.error('getDriverDashboardSummary error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 3. GET ELIGIBLE DRIVERS FOR DROPDOWNS ───────────────────────────
exports.getEligibleDrivers = async (req, res) => {
    try {
        const now = new Date();
        const drivers = await Driver.find({ status: 'Active' })
            .select('name phone licenseNumber licenseType licenseExpiryDate currentAssignedVehicle staff_id photoUrl')
            .sort({ name: 1 })
            .lean();

        const formatted = drivers.map(d => {
            const exp = d.licenseExpiryDate ? new Date(d.licenseExpiryDate) : null;
            const isExpired = exp ? exp < now : false;
            const isAssigned = !!d.currentAssignedVehicle?.vehicleId;
            return {
                _id: d._id,
                name: d.name,
                phone: d.phone,
                licenseNumber: d.licenseNumber,
                licenseType: d.licenseType,
                licenseExpiryDate: d.licenseExpiryDate,
                isExpired,
                isAssigned,
                currentAssignedVehicle: d.currentAssignedVehicle,
                displayText: `${d.name} (${d.phone}) • ${d.licenseType}${isAssigned ? ` [Assigned: ${d.currentAssignedVehicle.registrationNumber}]` : ' [Available]'}`
            };
        });

        res.json({
            success: true,
            drivers: formatted
        });
    } catch (err) {
        console.error('getEligibleDrivers error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 4. GET STAFF CANDIDATES TO LINK AS DRIVERS ──────────────────────
exports.getStaffCandidates = async (req, res) => {
    try {
        // Find users with role 'staff' who aren't already registered as drivers
        const existingDrivers = await Driver.find({ employeeId: { $ne: null } }).select('employeeId');
        const existingEmployeeIds = existingDrivers.map(d => d.employeeId?.toString()).filter(Boolean);

        const staffUsers = await User.find({
            role: 'staff',
            status: 'active',
            _id: { $nin: existingEmployeeIds }
        }).select('name email phone phoneNumber staff_id department designation address emergencyContact').sort({ name: 1 });

        res.json({
            success: true,
            staffCandidates: staffUsers.map(s => ({
                _id: s._id,
                name: s.name,
                email: s.email,
                phone: s.phone || s.phoneNumber || '',
                staff_id: s.staff_id || '',
                department: s.department || '',
                designation: s.designation || '',
                address: s.address || '',
                emergencyContact: s.emergencyContact || ''
            }))
        });
    } catch (err) {
        console.error('getStaffCandidates error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 5. GET SINGLE DRIVER WITH PROFILE & TRIP HISTORY ────────────────
exports.getDriverById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('employeeId', 'name email phone staff_id department designation address');

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        // Aggregate trip history across all vehicles for this driver
        const vehiclesWithTrips = await Vehicle.find({
            $or: [
                { 'trips.driverId': driver._id },
                { 'trips.driverName': driver.name },
                { assignedDriverRef: driver._id }
            ]
        }).select('registrationNumber vehicleName vehicleType trips currentOdometer');

        const driverTrips = [];
        vehiclesWithTrips.forEach(v => {
            (v.trips || []).forEach(t => {
                const matchById = t.driverId && t.driverId.toString() === driver._id.toString();
                const matchByName = t.driverName && t.driverName.toLowerCase() === driver.name.toLowerCase();
                if (matchById || matchByName) {
                    driverTrips.push({
                        ...t.toObject(),
                        vehicleRegistration: v.registrationNumber,
                        vehicleName: v.vehicleName,
                        vehicleId: v._id
                    });
                }
            });
        });

        // Sort trips most recent first
        driverTrips.sort((a, b) => new Date(b.date || b.completedAt || 0) - new Date(a.date || a.completedAt || 0));

        const totalKmDriven = driverTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0);
        const completedTripsCount = driverTrips.filter(t => t.status === 'Completed').length;

        res.json({
            success: true,
            driver,
            tripHistory: driverTrips,
            metrics: {
                totalTrips: driverTrips.length,
                completedTrips: completedTripsCount,
                totalKmDriven,
                assignmentsCount: driver.assignmentHistory?.length || 0
            }
        });
    } catch (err) {
        console.error('getDriverById error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 6. REGISTER NEW DRIVER ──────────────────────────────────────────
exports.createDriver = async (req, res) => {
    try {
        const {
            name,
            photoUrl,
            employeeId,
            staff_id,
            phone,
            address,
            licenseNumber,
            licenseType,
            licenseExpiryDate,
            emergencyContact,
            emergencyPhone,
            joiningDate,
            status = 'Active',
            notes
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Driver full name is required.' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, message: 'Driver mobile / phone number is required.' });
        }
        if (!licenseNumber || !licenseNumber.trim()) {
            return res.status(400).json({ success: false, message: 'Driving licence number is required.' });
        }
        if (!licenseExpiryDate) {
            return res.status(400).json({ success: false, message: 'Driving licence expiry date is required.' });
        }

        const cleanLicense = licenseNumber.trim().toUpperCase();

        // Unique licence check
        const existingLic = await Driver.findOne({ licenseNumber: cleanLicense });
        if (existingLic) {
            return res.status(400).json({
                success: false,
                message: `Driving licence ${cleanLicense} is already registered under driver: ${existingLic.name}.`
            });
        }

        let linkedUserId = null;
        let staffIdCode = staff_id || '';
        if (employeeId) {
            const user = await User.findById(employeeId);
            if (!user) {
                return res.status(400).json({ success: false, message: 'Selected employee does not exist.' });
            }
            const existingEmployeeDriver = await Driver.findOne({ employeeId });
            if (existingEmployeeDriver) {
                return res.status(400).json({
                    success: false,
                    message: `Employee ${user.name} is already registered as a driver (${existingEmployeeDriver.name}).`
                });
            }
            linkedUserId = user._id;
            if (!staffIdCode && user.staff_id) staffIdCode = user.staff_id;
        }

        const driver = new Driver({
            name: name.trim(),
            photoUrl: photoUrl || '',
            employeeId: linkedUserId,
            staff_id: staffIdCode,
            phone: phone.trim(),
            address: address ? address.trim() : '',
            licenseNumber: cleanLicense,
            licenseType: licenseType || 'LMV-Commercial / Transport',
            licenseExpiryDate: new Date(licenseExpiryDate),
            emergencyContact: emergencyContact || { name: '', phone: emergencyPhone || '', relation: '' },
            emergencyPhone: emergencyPhone || '',
            joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
            status,
            notes: notes || '',
            auditTrail: [{
                action: 'Driver Registered',
                performedBy: req.user?._id || null,
                performedByName: req.user?.name || 'Administrator',
                timestamp: new Date(),
                details: `Registered with licence ${cleanLicense} (${licenseType || 'LMV-Commercial / Transport'})`
            }]
        });

        await driver.save();

        // Dispatch in-app notification if licence is expiring soon or expired
        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
        const expDate = new Date(driver.licenseExpiryDate);

        if (expDate < now) {
            try {
                await Notification.create({
                    title: `Licence Expired: ${driver.name}`,
                    message: `Driver ${driver.name} was registered with an expired driving licence (${cleanLicense}, expired on ${expDate.toLocaleDateString()}). Please renew immediately before vehicle assignment.`,
                    category: 'system',
                    priority: 'high',
                    metadata: { driverId: driver._id, type: 'DRIVER_LICENSE_EXPIRED' }
                });
            } catch (notifErr) {
                console.warn('Licence notification warning:', notifErr.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Driver registered successfully.',
            driver
        });
    } catch (err) {
        console.error('createDriver error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 7. UPDATE DRIVER DETAILS ────────────────────────────────────────
exports.updateDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        const {
            name,
            photoUrl,
            phone,
            address,
            licenseNumber,
            licenseType,
            licenseExpiryDate,
            emergencyContact,
            emergencyPhone,
            joiningDate,
            status,
            notes
        } = req.body;

        if (licenseNumber && licenseNumber.trim().toUpperCase() !== driver.licenseNumber) {
            const cleanLicense = licenseNumber.trim().toUpperCase();
            const existingLic = await Driver.findOne({ licenseNumber: cleanLicense, _id: { $ne: driver._id } });
            if (existingLic) {
                return res.status(400).json({
                    success: false,
                    message: `Licence ${cleanLicense} is already registered under another driver (${existingLic.name}).`
                });
            }
            driver.licenseNumber = cleanLicense;
        }

        if (name) driver.name = name.trim();
        if (photoUrl !== undefined) driver.photoUrl = photoUrl;
        if (phone) driver.phone = phone.trim();
        if (address !== undefined) driver.address = address.trim();
        if (licenseType) driver.licenseType = licenseType;
        if (licenseExpiryDate) driver.licenseExpiryDate = new Date(licenseExpiryDate);
        if (emergencyContact !== undefined) driver.emergencyContact = emergencyContact;
        if (emergencyPhone !== undefined) driver.emergencyPhone = emergencyPhone;
        if (joiningDate) driver.joiningDate = new Date(joiningDate);
        if (notes !== undefined) driver.notes = notes;

        // Check status change
        const oldStatus = driver.status;
        if (status && status !== oldStatus) {
            driver.status = status;

            // If deactivated / suspended and currently assigned to a vehicle, automatically unassign!
            if ((status === 'Inactive' || status === 'Suspended') && driver.currentAssignedVehicle?.vehicleId) {
                const assignedVehId = driver.currentAssignedVehicle.vehicleId;
                const targetVeh = await Vehicle.findById(assignedVehId);
                if (targetVeh) {
                    targetVeh.assignedDriverId = null;
                    targetVeh.assignedDriverRef = null;
                    targetVeh.assignedDriverName = '';
                    targetVeh.assignedDriverPhone = '';
                    targetVeh.driverLicenseNumber = '';
                    await targetVeh.save();
                }

                // Close assignment history entry
                if (driver.assignmentHistory && driver.assignmentHistory.length > 0) {
                    const lastAssignment = driver.assignmentHistory[driver.assignmentHistory.length - 1];
                    if (!lastAssignment.unassignedAt) {
                        lastAssignment.unassignedAt = new Date();
                        lastAssignment.reason = `Driver status changed to ${status}`;
                    }
                }

                driver.currentAssignedVehicle = {
                    vehicleId: null,
                    registrationNumber: '',
                    vehicleName: '',
                    assignedAt: null
                };

                driver.auditTrail.push({
                    action: `Driver ${status} - Unassigned from vehicle`,
                    performedBy: req.user?._id || null,
                    performedByName: req.user?.name || 'Administrator',
                    timestamp: new Date(),
                    details: `Driver marked ${status}. Vehicle ${targetVeh?.registrationNumber || ''} unassigned automatically.`
                });

                // Notify admin of deactivation & vehicle unassignment
                try {
                    await Notification.create({
                        title: `Driver ${status}: ${driver.name}`,
                        message: `Driver ${driver.name} was marked ${status} and unassigned from vehicle ${targetVeh?.registrationNumber || 'N/A'}.`,
                        category: 'system',
                        priority: 'high',
                        metadata: { driverId: driver._id, type: 'DRIVER_DEACTIVATED' }
                    });
                } catch (notifErr) {
                    console.warn('Deactivation notification error:', notifErr.message);
                }
            }
        }

        driver.auditTrail.push({
            action: 'Driver Profile Updated',
            performedBy: req.user?._id || null,
            performedByName: req.user?.name || 'Administrator',
            timestamp: new Date(),
            details: `Profile updated by ${req.user?.name || 'Admin'}`
        });

        await driver.save();

        // Also sync updated driver name / phone to currently assigned vehicle if any
        if (driver.currentAssignedVehicle?.vehicleId) {
            await Vehicle.findByIdAndUpdate(driver.currentAssignedVehicle.vehicleId, {
                assignedDriverName: driver.name,
                assignedDriverPhone: driver.phone,
                driverLicenseNumber: driver.licenseNumber
            });
        }

        res.json({
            success: true,
            message: 'Driver profile updated successfully.',
            driver
        });
    } catch (err) {
        console.error('updateDriver error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 8. DELETE DRIVER ────────────────────────────────────────────────
exports.deleteDriver = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        // Check if currently assigned to a vehicle
        if (driver.currentAssignedVehicle?.vehicleId) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete driver ${driver.name}. This driver is currently assigned to vehicle ${driver.currentAssignedVehicle.registrationNumber}. Please unassign first.`
            });
        }

        // Check if driver has recorded trips
        const tripCount = await Vehicle.countDocuments({
            $or: [
                { 'trips.driverId': driver._id },
                { 'trips.driverName': driver.name }
            ]
        });

        if (tripCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot permanently delete driver ${driver.name} because they are recorded on ${tripCount} transport trips. Please deactivate the driver instead to preserve transport legal audit records.`
            });
        }

        await Driver.findByIdAndDelete(driver._id);
        res.json({ success: true, message: `Driver ${driver.name} deleted successfully.` });
    } catch (err) {
        console.error('deleteDriver error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 9. ASSIGN OR UNASSIGN DRIVER TO VEHICLE ─────────────────────────
exports.assignDriverToVehicle = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { vehicleId, reason = 'Fleet Management Assignment' } = req.body;

        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        const now = new Date();

        // Case A: UNASSIGN DRIVER
        if (!vehicleId) {
            if (!driver.currentAssignedVehicle?.vehicleId) {
                return res.json({ success: true, message: 'Driver is already unassigned.', driver });
            }

            const oldVehId = driver.currentAssignedVehicle.vehicleId;
            const oldVeh = await Vehicle.findById(oldVehId);
            if (oldVeh) {
                if (oldVeh.status === 'On Trip') {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot unassign driver ${driver.name}. Vehicle ${oldVeh.registrationNumber} is currently on an active trip.`
                    });
                }
                oldVeh.assignedDriverId = null;
                oldVeh.assignedDriverRef = null;
                oldVeh.assignedDriverName = '';
                oldVeh.assignedDriverPhone = '';
                oldVeh.driverLicenseNumber = '';
                await oldVeh.save();
            }

            // Close assignment history
            if (driver.assignmentHistory && driver.assignmentHistory.length > 0) {
                const last = driver.assignmentHistory[driver.assignmentHistory.length - 1];
                if (!last.unassignedAt) {
                    last.unassignedAt = now;
                    last.reason = reason || 'Unassigned by admin';
                }
            }

            driver.currentAssignedVehicle = {
                vehicleId: null,
                registrationNumber: '',
                vehicleName: '',
                assignedAt: null
            };

            driver.auditTrail.push({
                action: 'Vehicle Unassigned',
                performedBy: req.user?._id || null,
                performedByName: req.user?.name || 'Administrator',
                timestamp: now,
                details: `Unassigned from vehicle ${oldVeh?.registrationNumber || ''}. Reason: ${reason}`
            });

            await driver.save();
            return res.json({
                success: true,
                message: `Driver ${driver.name} unassigned from vehicle.`,
                driver
            });
        }

        // Case B: ASSIGN DRIVER TO TARGET VEHICLE
        if (driver.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: `Cannot assign driver ${driver.name}. Driver status is currently ${driver.status}.`
            });
        }

        // Check licence expiry
        if (driver.licenseExpiryDate && new Date(driver.licenseExpiryDate) < now) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign driver ${driver.name}. Driving licence expired on ${new Date(driver.licenseExpiryDate).toLocaleDateString()}. Renew licence first.`
            });
        }

        const targetVehicle = await Vehicle.findById(vehicleId);
        if (!targetVehicle) {
            return res.status(404).json({ success: false, message: 'Target vehicle not found.' });
        }

        if (targetVehicle.status === 'On Trip') {
            return res.status(400).json({
                success: false,
                message: `Cannot reassign vehicle ${targetVehicle.registrationNumber}. It is currently on an active trip.`
            });
        }

        // 1. If driver was already assigned to another vehicle, unassign from old vehicle
        if (driver.currentAssignedVehicle?.vehicleId && driver.currentAssignedVehicle.vehicleId.toString() !== targetVehicle._id.toString()) {
            const prevVeh = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId);
            if (prevVeh) {
                if (prevVeh.status === 'On Trip') {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot reassign driver ${driver.name}. Previous vehicle ${prevVeh.registrationNumber} is actively on a trip.`
                    });
                }
                prevVeh.assignedDriverId = null;
                prevVeh.assignedDriverRef = null;
                prevVeh.assignedDriverName = '';
                prevVeh.assignedDriverPhone = '';
                prevVeh.driverLicenseNumber = '';
                await prevVeh.save();
            }

            // Close previous assignment history entry
            if (driver.assignmentHistory && driver.assignmentHistory.length > 0) {
                const last = driver.assignmentHistory[driver.assignmentHistory.length - 1];
                if (!last.unassignedAt) {
                    last.unassignedAt = now;
                    last.reason = `Reassigned to ${targetVehicle.registrationNumber}`;
                }
            }
        }

        // 2. If target vehicle already had another driver assigned, unassign that driver
        if (targetVehicle.assignedDriverRef && targetVehicle.assignedDriverRef.toString() !== driver._id.toString()) {
            const previousDriver = await Driver.findById(targetVehicle.assignedDriverRef);
            if (previousDriver) {
                if (previousDriver.assignmentHistory && previousDriver.assignmentHistory.length > 0) {
                    const last = previousDriver.assignmentHistory[previousDriver.assignmentHistory.length - 1];
                    if (!last.unassignedAt) {
                        last.unassignedAt = now;
                        last.reason = `Replaced by ${driver.name}`;
                    }
                }
                previousDriver.currentAssignedVehicle = {
                    vehicleId: null,
                    registrationNumber: '',
                    vehicleName: '',
                    assignedAt: null
                };
                previousDriver.auditTrail.push({
                    action: 'Unassigned due to replacement',
                    performedBy: req.user?._id || null,
                    performedByName: req.user?.name || 'Administrator',
                    timestamp: now,
                    details: `Replaced on ${targetVehicle.registrationNumber} by ${driver.name}`
                });
                await previousDriver.save();
            }
        }

        // 3. Assign target vehicle to driver
        driver.currentAssignedVehicle = {
            vehicleId: targetVehicle._id,
            registrationNumber: targetVehicle.registrationNumber,
            vehicleName: targetVehicle.vehicleName,
            assignedAt: now
        };

        driver.assignmentHistory.push({
            vehicleId: targetVehicle._id,
            registrationNumber: targetVehicle.registrationNumber,
            vehicleName: targetVehicle.vehicleName,
            assignedAt: now,
            unassignedAt: null,
            assignedBy: req.user?._id || null,
            assignedByName: req.user?.name || 'Administrator',
            reason: reason || 'Driver assigned to vehicle'
        });

        driver.auditTrail.push({
            action: 'Assigned to Vehicle',
            performedBy: req.user?._id || null,
            performedByName: req.user?.name || 'Administrator',
            timestamp: now,
            details: `Assigned to ${targetVehicle.registrationNumber} (${targetVehicle.vehicleName})`
        });

        await driver.save();

        // 4. Update target vehicle
        targetVehicle.assignedDriverRef = driver._id;
        targetVehicle.assignedDriverId = driver.employeeId || null;
        targetVehicle.assignedDriverName = driver.name;
        targetVehicle.assignedDriverPhone = driver.phone;
        targetVehicle.driverLicenseNumber = driver.licenseNumber;
        await targetVehicle.save();

        // 5. In-app notification
        try {
            await Notification.create({
                title: 'Driver Assigned to Vehicle',
                message: `Driver ${driver.name} has been assigned to vehicle ${targetVehicle.registrationNumber} (${targetVehicle.vehicleName}).`,
                category: 'system',
                priority: 'medium',
                metadata: { driverId: driver._id, vehicleId: targetVehicle._id, type: 'DRIVER_ASSIGNED' }
            });
        } catch (notifErr) {
            console.warn('Assignment notification notice:', notifErr.message);
        }

        res.json({
            success: true,
            message: `Driver ${driver.name} successfully assigned to ${targetVehicle.registrationNumber}.`,
            driver,
            vehicle: targetVehicle
        });
    } catch (err) {
        console.error('assignDriverToVehicle error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 10. CHECK LICENCE EXPIRIES AND NOTIFY ADMINS ─────────────────────
exports.checkLicenseExpiries = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

        const expiringDrivers = await Driver.find({
            status: 'Active',
            licenseExpiryDate: { $lte: thirtyDaysAhead }
        });

        let notificationsCreated = 0;
        for (const drv of expiringDrivers) {
            const exp = new Date(drv.licenseExpiryDate);
            const isExpired = exp < now;
            const daysRemaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            const alertType = isExpired ? 'DRIVER_LICENSE_EXPIRED' : 'DRIVER_LICENSE_EXPIRING';

            // Check if alert already sent in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const existing = await Notification.findOne({
                'metadata.driverId': drv._id,
                'metadata.type': alertType,
                createdAt: { $gte: sevenDaysAgo }
            });

            if (!existing) {
                await Notification.create({
                    title: isExpired ? `Driver Licence Expired: ${drv.name}` : `Licence Expiring Soon: ${drv.name}`,
                    message: isExpired
                        ? `Driving licence (${drv.licenseNumber}) for driver ${drv.name} expired on ${exp.toLocaleDateString()}. Please renew immediately.`
                        : `Driving licence (${drv.licenseNumber}) for driver ${drv.name} expires in ${daysRemaining} days (${exp.toLocaleDateString()}).`,
                    category: 'system',
                    priority: isExpired ? 'high' : 'medium',
                    metadata: { driverId: drv._id, type: alertType }
                });
                notificationsCreated++;
            }
        }

        res.json({
            success: true,
            totalExpiring: expiringDrivers.length,
            notificationsCreated
        });
    } catch (err) {
        console.error('checkLicenseExpiries error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
