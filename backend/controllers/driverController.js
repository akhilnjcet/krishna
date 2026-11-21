const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const FleetTrip = require('../models/FleetTrip');
const DriverIssue = require('../models/DriverIssue');
const DriverEmergencyAlert = require('../models/DriverEmergencyAlert');
const Notification = require('../models/Notification');
const { dispatchNotification } = require('../services/notificationDispatcher');
const { ALL_DRIVER_PERMISSIONS, STAFF_PROHIBITED_PERMISSIONS } = require('../middleware/driverPermissionMiddleware');

// Helper to resolve driver record for logged-in user
const resolveDriverForUser = async (user) => {
    if (!user) return null;
    let driver = await Driver.findOne({ userId: user._id });
    if (!driver && user.driverRef) {
        driver = await Driver.findById(user.driverRef);
    }
    if (!driver && user.employeeId) {
        driver = await Driver.findOne({ employeeId: user._id });
    }
    if (!driver && (user.phone || user.phoneNumber)) {
        driver = await Driver.findOne({ phone: user.phone || user.phoneNumber });
    }
    return driver;
};

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

// ─── 6. REGISTER NEW DRIVER (WITH OPTIONAL PORTAL LOGIN) ─────────────
exports.createDriver = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();

        // Strict Role Enforcement: Staff can NEVER create driver accounts!
        if (userRole === 'staff') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Staff members are strictly prohibited from creating or registering driver accounts.'
            });
        }

        // Manager requires explicit permission from Admin
        if (userRole === 'manager') {
            const managerPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (!managerPerms.includes('driver.create') && !managerPerms.includes('driver.*')) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Manager lacks explicit driver.create permission granted by Administrator.'
                });
            }
        }

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
            licenseDocUrl,
            emergencyContact,
            emergencyPhone,
            joiningDate,
            status = 'Active',
            notes,
            // Authentication credentials for Driver Portal
            email,
            password,
            enablePortalLogin = true
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

        // Set up driver email & user login credentials if enabled
        let driverLoginEmail = (email || '').trim().toLowerCase();
        if (!driverLoginEmail && enablePortalLogin) {
            driverLoginEmail = `driver.${cleanLicense.replace(/[^A-Z0-9]/gi, '').toLowerCase()}@krishnaerp.local`;
        }

        let createdPortalUser = null;
        if (enablePortalLogin && !linkedUserId) {
            // Check if user with this email already exists
            let existingUser = await User.findOne({ email: driverLoginEmail });
            if (existingUser) {
                if (existingUser.role !== 'driver') {
                    return res.status(400).json({
                        success: false,
                        message: `Account with email ${driverLoginEmail} already exists with role '${existingUser.role}'. Use a distinct email address.`
                    });
                }
                linkedUserId = existingUser._id;
            } else {
                const initialPassword = password && password.trim() ? password.trim() : `Driver@${cleanLicense.slice(-4) || '123'}`;
                const hashedPassword = await bcrypt.hash(initialPassword, 10);

                createdPortalUser = new User({
                    name: name.trim(),
                    email: driverLoginEmail,
                    phone: phone.trim(),
                    phoneNumber: phone.trim(),
                    password: hashedPassword,
                    role: 'driver',
                    status: status === 'Active' ? 'active' : 'inactive',
                    profilePhoto: photoUrl || '',
                    address: address ? address.trim() : '',
                    emergencyContact: emergencyPhone || '',
                    permissions: []
                });

                await createdPortalUser.save();
                linkedUserId = createdPortalUser._id;
            }
        }

        const driver = new Driver({
            name: name.trim(),
            photoUrl: photoUrl || '',
            userId: linkedUserId,
            email: driverLoginEmail,
            licenseDocUrl: licenseDocUrl || '',
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
                details: `Registered with licence ${cleanLicense} (${licenseType || 'LMV-Commercial / Transport'}). Login: ${driverLoginEmail || 'Disabled'}`
            }]
        });

        await driver.save();

        if (createdPortalUser) {
            createdPortalUser.driverRef = driver._id;
            await createdPortalUser.save();
        } else if (linkedUserId) {
            await User.findByIdAndUpdate(linkedUserId, { driverRef: driver._id, role: 'driver' });
        }

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
            driver,
            portalCredentials: enablePortalLogin ? {
                email: driverLoginEmail,
                hasPassword: Boolean(password)
            } : null
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

// ─── 11. ACTIVATE / DEACTIVATE DRIVER ACCOUNT ─────────────────────────
exports.toggleDriverStatus = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();
        if (userRole === 'staff') {
            return res.status(403).json({ success: false, message: 'Access denied: Staff members cannot activate or deactivate driver accounts.' });
        }

        const { status } = req.body; // 'Active' | 'Inactive'
        if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be Active or Inactive.' });
        }

        if (userRole === 'manager') {
            const reqPerm = status === 'Active' ? 'driver.activate' : 'driver.deactivate';
            const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (!perms.includes(reqPerm) && !perms.includes('driver.*')) {
                return res.status(403).json({ success: false, message: `Access denied: Manager lacks '${reqPerm}' permission.` });
            }
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        driver.status = status;

        // If deactivated and currently assigned to a vehicle, unassign automatically
        if ((status === 'Inactive' || status === 'Suspended') && driver.currentAssignedVehicle?.vehicleId) {
            const v = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId);
            if (v) {
                v.assignedDriverId = null;
                v.assignedDriverRef = null;
                v.assignedDriverName = '';
                v.assignedDriverPhone = '';
                v.driverLicenseNumber = '';
                await v.save();
            }
            driver.currentAssignedVehicle = { vehicleId: null, registrationNumber: '', vehicleName: '', assignedAt: null };
        }

        driver.auditTrail.push({
            action: `Driver ${status}`,
            performedBy: req.user?._id || null,
            performedByName: req.user?.name || 'Admin',
            timestamp: new Date(),
            details: `Account marked ${status} by ${req.user?.name || 'Admin'}`
        });

        await driver.save();

        // Sync linked user status
        if (driver.userId) {
            await User.findByIdAndUpdate(driver.userId, {
                status: status === 'Active' ? 'active' : 'inactive'
            });
        }

        res.json({
            success: true,
            message: `Driver ${driver.name} is now ${status}.`,
            driver
        });
    } catch (err) {
        console.error('toggleDriverStatus error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 12. RESET DRIVER PASSWORD ────────────────────────────────────────
exports.resetDriverPassword = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();
        if (userRole === 'staff') {
            return res.status(403).json({ success: false, message: 'Access denied: Staff members cannot reset driver passwords.' });
        }

        if (userRole === 'manager') {
            const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (!perms.includes('driver.password_reset') && !perms.includes('driver.*')) {
                return res.status(403).json({ success: false, message: 'Access denied: Manager lacks driver.password_reset permission.' });
            }
        }

        const { newPassword } = req.body;
        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

        let linkedUser = null;
        if (driver.userId) {
            linkedUser = await User.findById(driver.userId);
        }

        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

        if (!linkedUser) {
            // Create user account if not yet existing
            const email = driver.email || `driver.${driver.licenseNumber.replace(/[^A-Z0-9]/gi, '').toLowerCase()}@krishnaerp.local`;
            linkedUser = new User({
                name: driver.name,
                email,
                phone: driver.phone,
                password: hashedPassword,
                role: 'driver',
                status: driver.status === 'Active' ? 'active' : 'inactive',
                driverRef: driver._id
            });
            await linkedUser.save();
            driver.userId = linkedUser._id;
            driver.email = email;
            await driver.save();
        } else {
            linkedUser.password = hashedPassword;
            linkedUser.failedLoginAttempts = 0;
            linkedUser.lockUntil = undefined;
            await linkedUser.save();
        }

        driver.auditTrail.push({
            action: 'Password Reset',
            performedBy: req.user?._id || null,
            performedByName: req.user?.name || 'Admin',
            timestamp: new Date(),
            details: `Password reset by ${req.user?.name || 'Admin'}`
        });
        await driver.save();

        res.json({
            success: true,
            message: `Password reset successfully for driver ${driver.name}.`,
            loginEmail: linkedUser.email
        });
    } catch (err) {
        console.error('resetDriverPassword error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Metadata descriptors for driver permissions
const DRIVER_PERMISSION_METADATA = {
    'driver.view': { label: 'View Drivers', description: 'Browse driver directory, profiles, and licenses' },
    'driver.create': { label: 'Register Drivers', description: 'Create and register new driver profiles' },
    'driver.edit': { label: 'Edit Driver Details', description: 'Modify contact numbers, license details, and status' },
    'driver.delete': { label: 'Delete Drivers', description: 'Permanently remove driver accounts' },
    'driver.activate': { label: 'Activate Drivers', description: 'Mark driver as available for dispatch' },
    'driver.deactivate': { label: 'Suspend / Deactivate', description: 'Temporarily suspend driver accounts' },
    'driver.password_reset': { label: 'Reset Password', description: 'Change driver portal login password' },
    'driver.assign_vehicle': { label: 'Assign Vehicles', description: 'Allocate or reassign company transport assets' },
    'driver.assign_trip': { label: 'Assign & Dispatch Trips', description: 'Schedule and dispatch delivery routes' },
    'driver.view_reports': { label: 'View Reports & Logs', description: 'Access trip distance and fuel logs' },
    'driver.manage_issues': { label: 'Manage Issues', description: 'Review and resolve vehicle defect tickets' },
    'driver.view_location': { label: 'Track Live Location', description: 'Monitor real-time GPS coordinates' },
    'driver.manage_documents': { label: 'Manage Documents', description: 'Upload and verify permits and PUC' }
};

// ─── 13. DRIVER PERMISSIONS MANAGEMENT MATRIX (ADMIN ONLY) ────────────
exports.getDriverPermissionMatrix = async (req, res) => {
    try {
        const users = await User.find({
            role: { $in: ['admin', 'manager', 'staff'] },
            status: 'active'
        }).select('name email role permissions department designation staff_id phone').sort({ role: 1, name: 1 });

        const enrichedUsers = users.map(u => {
            const uObj = u.toObject();
            if (uObj.role === 'admin') {
                uObj.permissions = ALL_DRIVER_PERMISSIONS;
            }
            return uObj;
        });

        const allPermissions = ALL_DRIVER_PERMISSIONS.map(key => ({
            key,
            label: DRIVER_PERMISSION_METADATA[key]?.label || key,
            description: DRIVER_PERMISSION_METADATA[key]?.description || ''
        }));

        res.json({
            success: true,
            allPermissions,
            prohibitedForStaff: STAFF_PROHIBITED_PERMISSIONS,
            users: enrichedUsers
        });
    } catch (err) {
        console.error('getDriverPermissionMatrix error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateUserDriverPermissions = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: 'Permissions must be an array of permission strings.' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ success: false, message: 'Target user not found.' });

        if (targetUser.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Administrators already have full, unrestricted permissions.' });
        }

        // If target user is staff, filter out any prohibited permissions!
        let finalPerms = permissions.filter(p => ALL_DRIVER_PERMISSIONS.includes(p));
        if (targetUser.role === 'staff') {
            finalPerms = finalPerms.filter(p => !STAFF_PROHIBITED_PERMISSIONS.includes(p));
        }

        targetUser.permissions = finalPerms;
        await targetUser.save();

        res.json({
            success: true,
            message: `Driver permissions updated for ${targetUser.name} (${targetUser.role}).`,
            user: {
                _id: targetUser._id,
                name: targetUser.name,
                role: targetUser.role,
                permissions: targetUser.permissions
            }
        });
    } catch (err) {
        console.error('updateUserDriverPermissions error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyDriverPermissions = async (req, res) => {
    try {
        const user = req.user;
        const perms = user.role === 'admin' 
            ? ALL_DRIVER_PERMISSIONS 
            : (Array.isArray(user.permissions) ? user.permissions : []);

        res.json({
            success: true,
            role: user.role,
            permissions: perms,
            isAdmin: user.role === 'admin',
            isStaff: user.role === 'staff',
            isManager: user.role === 'manager',
            isDriver: user.role === 'driver'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 14. DRIVER PORTAL DASHBOARD (MOBILE-FIRST) ──────────────────────
exports.getDriverPortalData = async (req, res) => {
    try {
        const driver = await resolveDriverForUser(req.user);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'No driver profile linked with this login account. Contact administrator.'
            });
        }

        // Assigned vehicle information (Read-only)
        let assignedVehicle = null;
        if (driver.currentAssignedVehicle?.vehicleId) {
            assignedVehicle = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId)
                .select('registrationNumber vehicleName vehicleType status currentOdometer fuelType tankCapacityLiters documents notes');
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Trips assigned to this driver
        const allTrips = await FleetTrip.find({ driverId: driver._id }).sort({ pickupDateTime: -1 });

        const todayTrips = allTrips.filter(t => {
            const pDate = new Date(t.pickupDateTime);
            return pDate >= startOfToday && pDate <= endOfToday;
        });

        const upcomingTrips = allTrips.filter(t => {
            const pDate = new Date(t.pickupDateTime);
            return pDate > endOfToday && (t.status === 'Assigned' || t.status === 'Confirmed');
        });

        const activeTrip = allTrips.find(t => t.status === 'Started' || t.status === 'In Transit' || t.status === 'Paused');
        const completedTrips = allTrips.filter(t => t.status === 'Completed' || t.status === 'Closed');

        // Active issues reported by this driver
        const driverIssues = await DriverIssue.find({ driverId: driver._id }).sort({ createdAt: -1 });
        const openIssues = driverIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved');

        const FaceData = require('../models/FaceData');
        const userRecord = await User.findById(req.user._id || req.user.id).select('faceDescriptor');
        let hasFaceEnrolled = Boolean(userRecord?.faceDescriptor && userRecord.faceDescriptor.length === 128);
        if (!hasFaceEnrolled) {
            const fd = await FaceData.findOne({ userId: req.user._id });
            if (fd && fd.faceEmbedding && fd.faceEmbedding.length === 128) {
                hasFaceEnrolled = true;
            }
        }

        res.json({
            success: true,
            driver: {
                _id: driver._id,
                name: driver.name,
                phone: driver.phone,
                email: driver.email,
                photoUrl: driver.photoUrl,
                licenseNumber: driver.licenseNumber,
                licenseType: driver.licenseType,
                licenseExpiryDate: driver.licenseExpiryDate,
                licenseDocUrl: driver.licenseDocUrl,
                status: driver.status,
                emergencyContact: driver.emergencyContact,
                emergencyPhone: driver.emergencyPhone,
                address: driver.address,
                hasFaceEnrolled
            },
            assignedVehicle,
            todayTrips,
            upcomingTrips,
            activeTrip: activeTrip || null,
            allTrips,
            recentTrips: allTrips.slice(0, 10),
            issues: {
                total: driverIssues.length,
                open: openIssues.length,
                recent: driverIssues.slice(0, 5)
            },
            metrics: {
                totalTrips: allTrips.length,
                completedTrips: completedTrips.length,
                totalDistanceKm: completedTrips.reduce((acc, t) => acc + (t.endReport?.distanceKm || 0), 0)
            }
        });
    } catch (err) {
        console.error('getDriverPortalData error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 15. GET ASSIGNED VEHICLE INFO (DRIVER READ-ONLY) ─────────────────
exports.getDriverAssignedVehicle = async (req, res) => {
    try {
        const driver = await resolveDriverForUser(req.user);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

        if (!driver.currentAssignedVehicle?.vehicleId) {
            return res.json({ success: true, vehicle: null, message: 'No vehicle currently assigned.' });
        }

        const vehicle = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId);
        res.json({ success: true, vehicle });
    } catch (err) {
        console.error('getDriverAssignedVehicle error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 16. ISSUE REPORTING SYSTEM ──────────────────────────────────────
exports.reportIssue = async (req, res) => {
    try {
        const driver = await resolveDriverForUser(req.user);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

        const {
            category,
            description,
            priority = 'Medium',
            photos = [],
            location = { lat: null, lng: null, address: '' },
            vehicleId,
            tripId
        } = req.body;

        if (!category || !description) {
            return res.status(400).json({ success: false, message: 'Issue category and description are required.' });
        }

        const issueNumber = `ISS-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

        let vId = vehicleId || driver.currentAssignedVehicle?.vehicleId || null;
        let vReg = driver.currentAssignedVehicle?.registrationNumber || '';
        if (vId && !vReg) {
            const v = await Vehicle.findById(vId).select('registrationNumber');
            if (v) vReg = v.registrationNumber;
        }

        let tNumber = '';
        if (tripId) {
            const tr = await FleetTrip.findById(tripId).select('tripNumber');
            if (tr) tNumber = tr.tripNumber;
        }

        const issue = new DriverIssue({
            issueNumber,
            driverId: driver._id,
            driverUserId: driver.userId || req.user._id,
            driverName: driver.name,
            driverPhone: driver.phone,
            vehicleId: vId,
            vehicleRegistration: vReg,
            tripId: tripId || null,
            tripNumber: tNumber,
            category,
            description: description.trim(),
            priority,
            photos: Array.isArray(photos) ? photos : [],
            location: {
                lat: location?.lat || null,
                lng: location?.lng || null,
                address: location?.address || ''
            },
            status: 'Submitted',
            auditTrail: [{
                action: 'Issue Reported',
                performedBy: driver.name,
                timestamp: new Date(),
                details: `Issue ${issueNumber} reported under category: ${category}`
            }]
        });

        await issue.save();

        // Dispatch notifications to Admins & Staff
        try {
            await Notification.create({
                title: `🚨 Driver Issue: ${category}`,
                message: `Driver ${driver.name} reported a ${category} (${issueNumber}) for vehicle ${vReg || 'N/A'}: ${description.slice(0, 100)}`,
                recipientRole: 'admin',
                category: 'system',
                priority: priority === 'Critical' || priority === 'High' ? 'high' : 'medium',
                metadata: { issueId: issue._id, issueNumber, type: 'DRIVER_ISSUE_REPORTED' }
            });
        } catch (notifErr) {
            console.warn('Issue notification error:', notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: `Issue ${issueNumber} submitted successfully. Dispatch team has been notified.`,
            issue
        });
    } catch (err) {
        console.error('reportIssue error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDriverIssues = async (req, res) => {
    try {
        const { status, category, driverId, vehicleId } = req.query;
        const query = {};

        // If driver role, restrict to own issues
        if (req.user.role === 'driver') {
            const currentDriver = await resolveDriverForUser(req.user);
            if (!currentDriver) return res.json({ success: true, issues: [], count: 0 });
            query.driverId = currentDriver._id;
        } else if (driverId) {
            query.driverId = driverId;
        }

        if (status && status !== 'All') query.status = status;
        if (category && category !== 'All') query.category = category;
        if (vehicleId) query.vehicleId = vehicleId;

        const issues = await DriverIssue.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: issues.length,
            issues
        });
    } catch (err) {
        console.error('getDriverIssues error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateIssueStatus = async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;
        const issue = await DriverIssue.findById(req.params.id);
        if (!issue) return res.status(404).json({ success: false, message: 'Issue not found.' });

        const validStatuses = ['Submitted', 'Acknowledged', 'Under Review', 'In Progress', 'Resolved', 'Closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const now = new Date();
        const oldStatus = issue.status;

        if (status) issue.status = status;
        if (resolutionNotes) issue.resolutionNotes = resolutionNotes;

        if (status === 'Acknowledged' && !issue.acknowledgedAt) {
            issue.acknowledgedBy = req.user.name || 'Staff';
            issue.acknowledgedAt = now;
        }

        if ((status === 'Resolved' || status === 'Closed') && !issue.resolvedAt) {
            issue.resolvedBy = req.user.name || 'Staff';
            issue.resolvedAt = now;
        }

        issue.auditTrail.push({
            action: `Status Updated to ${status}`,
            performedBy: req.user.name || 'Staff',
            timestamp: now,
            details: `Status transitioned from ${oldStatus} to ${status}. Notes: ${resolutionNotes || 'None'}`
        });

        await issue.save();

        // Notify Driver of issue resolution/update
        if (issue.driverUserId) {
            try {
                await Notification.create({
                    title: `Issue ${issue.issueNumber} Updated: ${status}`,
                    message: `Your reported issue (${issue.category}) has been marked '${status}'. ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`,
                    recipientRole: 'driver',
                    recipientUser: issue.driverUserId,
                    category: 'task',
                    priority: 'medium',
                    metadata: { issueId: issue._id, type: 'DRIVER_ISSUE_UPDATED' }
                });
            } catch (notifErr) {
                console.warn('Driver issue notification error:', notifErr.message);
            }
        }

        res.json({
            success: true,
            message: `Issue ${issue.issueNumber} updated to ${status}.`,
            issue
        });
    } catch (err) {
        console.error('updateIssueStatus error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── 17. EMERGENCY SOS ALERT SYSTEM ──────────────────────────────────
exports.sendEmergencyAlert = async (req, res) => {
    try {
        const driver = await resolveDriverForUser(req.user);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

        const {
            tripId,
            vehicleId,
            location = { lat: null, lng: null, address: '' },
            description = 'Emergency SOS triggered by driver'
        } = req.body;

        const alertNumber = `SOS-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

        let vId = vehicleId || driver.currentAssignedVehicle?.vehicleId || null;
        let vReg = driver.currentAssignedVehicle?.registrationNumber || '';
        let tNumber = '';

        if (tripId) {
            const tr = await FleetTrip.findById(tripId).select('tripNumber vehicleRegistration vehicleId');
            if (tr) {
                tNumber = tr.tripNumber;
                if (!vReg) vReg = tr.vehicleRegistration;
                if (!vId) vId = tr.vehicleId;
            }
        }

        const alert = new DriverEmergencyAlert({
            alertNumber,
            driverId: driver._id,
            driverUserId: driver.userId || req.user._id,
            driverName: driver.name,
            driverPhone: driver.phone,
            vehicleId: vId,
            vehicleRegistration: vReg,
            tripId: tripId || null,
            tripNumber: tNumber,
            location: {
                lat: location?.lat || null,
                lng: location?.lng || null,
                address: location?.address || 'Location coordinates attached'
            },
            description: description.trim(),
            status: 'Active',
            timestamp: new Date()
        });

        await alert.save();

        // Broadcast Urgent SOS Notification to Admins and Staff
        try {
            await Notification.create({
                title: `🚨 EMERGENCY SOS: ${driver.name}`,
                message: `CRITICAL ALERT: Driver ${driver.name} (${driver.phone}) triggered SOS for vehicle ${vReg || 'N/A'}${tNumber ? ` on trip ${tNumber}` : ''}! Location: ${location?.address || `${location?.lat}, ${location?.lng}`}. Message: ${description}`,
                recipientRole: 'admin',
                category: 'system',
                priority: 'critical',
                metadata: { alertId: alert._id, alertNumber, type: 'DRIVER_EMERGENCY_SOS' }
            });
        } catch (notifErr) {
            console.warn('Emergency alert notification warning:', notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'EMERGENCY ALERT BROADCASTED. Fleet manager and dispatch team have been alerted immediately.',
            alert
        });
    } catch (err) {
        console.error('sendEmergencyAlert error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmergencyAlerts = async (req, res) => {
    try {
        const alerts = await DriverEmergencyAlert.find({}).sort({ timestamp: -1 }).limit(50);
        res.json({ success: true, count: alerts.length, alerts });
    } catch (err) {
        console.error('getEmergencyAlerts error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmergencyContacts = async (req, res) => {
    try {
        const contacts = [
            { role: 'Fleet Manager', name: 'Fleet Operations Desk', phone: '+91 98450 12345', available: '24/7 Toll Free' },
            { role: 'Transport Manager', name: 'Central Logistics Control', phone: '+91 98450 67890', available: '24/7 Emergency' },
            { role: 'Assigned Staff', name: 'Krishna Workshop HQ', phone: '+91 80 2345 6789', available: 'Business Hours' },
            { role: 'Highway Police / Medical SOS', name: 'National Emergency Helpline', phone: '112', available: 'Instant Emergency' }
        ];

        res.json({ success: true, contacts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
