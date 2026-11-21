const LiveLocation = require('../models/LiveLocation');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const FleetTrip = require('../models/FleetTrip');
const socketUtil = require('../utils/socket');
const { getISTDate } = require('../utils/dateTimeUtil');

/**
 * Update authenticated user's live location
 * POST /api/location/update
 */
exports.updateLiveLocation = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const {
            lat,
            lng,
            accuracy,
            speed,
            heading,
            altitude,
            batteryLevel,
            isCharging,
            address = '',
            source = 'browser'
        } = req.body;

        // 1. Validate coordinates
        const latitude = Number(lat);
        const longitude = Number(lng);

        if (
            isNaN(latitude) || isNaN(longitude) ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid GPS coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180.'
            });
        }

        // 2. Fetch authenticated user profile
        const user = await User.findById(userId).select('name email role staff_id department designation phone photoUrl profilePhoto');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        // 3. Resolve Duty & Attendance Status
        const todayStr = getISTDate(new Date());
        let dutyStatus = {
            isOnDuty: true,
            attendanceStatus: 'Active Duty',
            activeTripId: null,
            activeTripNumber: '',
            vehicleRegistration: '',
            destination: ''
        };

        // Check if user has marked attendance today
        const attendanceSession = await Attendance.findOne({
            staff_id: user._id,
            date: todayStr,
            status: 'success'
        }).sort({ login_time: -1 });

        if (attendanceSession) {
            if (attendanceSession.check_out) {
                dutyStatus.attendanceStatus = 'Shift Completed';
            } else {
                dutyStatus.attendanceStatus = 'Shift In Progress';
            }
        } else {
            dutyStatus.attendanceStatus = 'Attendance Not Marked';
        }

        // If driver or staff, check for active trip in FleetTrip
        const activeTrip = await FleetTrip.findOne({
            driverUserId: user._id,
            status: { $in: ['Started', 'In Transit', 'Paused'] }
        }).sort({ pickupDateTime: -1 });

        if (activeTrip) {
            dutyStatus.activeTripId = activeTrip._id;
            dutyStatus.activeTripNumber = activeTrip.tripNumber || '';
            dutyStatus.vehicleRegistration = activeTrip.vehicleRegistration || '';
            dutyStatus.destination = activeTrip.destination || '';
        }

        const now = new Date();
        const pathPoint = {
            lat: latitude,
            lng: longitude,
            timestamp: now,
            speed: typeof speed === 'number' && !isNaN(speed) ? speed : null
        };

        // 4. Upsert LiveLocation record
        const updatedLocation = await LiveLocation.findOneAndUpdate(
            { userId: user._id },
            {
                $set: {
                    userId: user._id,
                    role: user.role,
                    name: user.name,
                    staff_id: user.staff_id || '',
                    phone: user.phone || '',
                    photoUrl: user.profilePhoto || user.photoUrl || '',
                    department: user.department || user.designation || (user.role === 'driver' ? 'Fleet Transport' : 'Operations'),
                    isSharing: true,
                    coords: { lat: latitude, lng: longitude },
                    accuracy: typeof accuracy === 'number' && !isNaN(accuracy) ? Math.round(accuracy) : null,
                    speed: typeof speed === 'number' && !isNaN(speed) ? Number(speed.toFixed(1)) : null,
                    heading: typeof heading === 'number' && !isNaN(heading) ? Math.round(heading) : null,
                    altitude: typeof altitude === 'number' && !isNaN(altitude) ? Math.round(altitude) : null,
                    batteryLevel: typeof batteryLevel === 'number' && !isNaN(batteryLevel) ? Math.round(batteryLevel) : null,
                    isCharging: Boolean(isCharging),
                    address: address ? String(address).trim().slice(0, 200) : '',
                    source: ['browser', 'capacitor_apk', 'mobile_browser'].includes(source) ? source : 'browser',
                    dutyStatus,
                    lastUpdated: now
                },
                $setOnInsert: {
                    startedAt: now
                },
                $push: {
                    recentPath: {
                        $each: [pathPoint],
                        $slice: -30 // Keep last 30 breadcrumb points
                    }
                }
            },
            { new: true, upsert: true }
        );

        // 5. Real-Time Broadcast to Authorized Admins via Socket.IO
        socketUtil.emitToAdmin('live-location-update', {
            _id: updatedLocation._id,
            userId: user._id.toString(),
            name: updatedLocation.name,
            role: updatedLocation.role,
            staff_id: updatedLocation.staff_id,
            phone: updatedLocation.phone,
            photoUrl: updatedLocation.photoUrl,
            department: updatedLocation.department,
            coords: updatedLocation.coords,
            accuracy: updatedLocation.accuracy,
            speed: updatedLocation.speed,
            heading: updatedLocation.heading,
            batteryLevel: updatedLocation.batteryLevel,
            isCharging: updatedLocation.isCharging,
            address: updatedLocation.address,
            dutyStatus: updatedLocation.dutyStatus,
            isSharing: true,
            freshness: 'live',
            lastUpdated: now
        });

        return res.status(200).json({
            success: true,
            message: 'Live location recorded successfully.',
            location: updatedLocation
        });
    } catch (err) {
        console.error('Error in updateLiveLocation:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error updating location: ' + err.message
        });
    }
};

/**
 * Stop live location sharing
 * POST /api/location/stop
 */
exports.stopLocationSharing = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const now = new Date();

        const loc = await LiveLocation.findOneAndUpdate(
            { userId },
            {
                $set: {
                    isSharing: false,
                    lastUpdated: now
                }
            },
            { new: true }
        );

        // Broadcast stop event to Admin console
        socketUtil.emitToAdmin('live-location-stopped', {
            userId: userId.toString(),
            name: loc?.name || req.user.name,
            lastUpdated: now
        });

        return res.status(200).json({
            success: true,
            message: 'Location sharing has been stopped.'
        });
    } catch (err) {
        console.error('Error in stopLocationSharing:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error stopping location: ' + err.message
        });
    }
};

/**
 * Get authenticated user's current location sharing state
 * GET /api/location/status
 */
exports.getMyLocationStatus = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const location = await LiveLocation.findOne({ userId });

        return res.status(200).json({
            success: true,
            location: location || null,
            isSharing: location ? Boolean(location.isSharing) : false
        });
    } catch (err) {
        console.error('Error in getMyLocationStatus:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error fetching location status: ' + err.message
        });
    }
};

/**
 * Admin: Get all live locations with freshness categorization
 * GET /api/location/live-all
 */
exports.getAllLiveLocations = async (req, res) => {
    try {
        const { role = 'all', status = 'all' } = req.query;

        // Fetch records updated in the last 12 hours
        const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const query = { lastUpdated: { $gte: cutoff } };

        if (role && role !== 'all') {
            query.role = role;
        }

        const records = await LiveLocation.find(query).sort({ lastUpdated: -1 });
        const now = Date.now();

        // Compute freshness & apply status filter
        const formatted = records.map(rec => {
            const timeDiffMs = now - new Date(rec.lastUpdated).getTime();
            const minutesDiff = timeDiffMs / (60 * 1000);

            let freshness = 'live';
            if (!rec.isSharing) {
                freshness = 'stopped';
            } else if (minutesDiff > 30) {
                freshness = 'offline';
            } else if (minutesDiff > 5) {
                freshness = 'stale';
            }

            return {
                _id: rec._id,
                userId: rec.userId,
                name: rec.name,
                role: rec.role,
                staff_id: rec.staff_id,
                phone: rec.phone,
                photoUrl: rec.photoUrl,
                department: rec.department,
                coords: rec.coords,
                accuracy: rec.accuracy,
                speed: rec.speed,
                heading: rec.heading,
                batteryLevel: rec.batteryLevel,
                isCharging: rec.isCharging,
                address: rec.address,
                dutyStatus: rec.dutyStatus,
                isSharing: rec.isSharing,
                freshness,
                lastUpdated: rec.lastUpdated,
                timeSinceUpdateMinutes: Math.round(minutesDiff)
            };
        }).filter(item => {
            if (status === 'all') return true;
            if (status === 'live') return item.freshness === 'live';
            if (status === 'stale') return item.freshness === 'stale';
            if (status === 'stopped') return item.freshness === 'stopped' || item.freshness === 'offline';
            return true;
        });

        // Summary counts
        const summary = {
            total: formatted.length,
            live: formatted.filter(f => f.freshness === 'live').length,
            stale: formatted.filter(f => f.freshness === 'stale').length,
            stopped: formatted.filter(f => f.freshness === 'stopped' || f.freshness === 'offline').length,
            drivers: formatted.filter(f => f.role === 'driver').length,
            staff: formatted.filter(f => f.role === 'staff' || f.role === 'manager').length
        };

        return res.status(200).json({
            success: true,
            summary,
            locations: formatted
        });
    } catch (err) {
        console.error('Error in getAllLiveLocations:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error retrieving live locations: ' + err.message
        });
    }
};

/**
 * Admin: Get specific user's breadcrumb trail
 * GET /api/location/user/:id/trail
 */
exports.getUserLocationTrail = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await LiveLocation.findOne({
            $or: [{ userId: id }, { _id: id }]
        }).select('name role staff_id recentPath coords lastUpdated isSharing');

        if (!record) {
            return res.status(404).json({ success: false, message: 'No location trail found for this user.' });
        }

        return res.status(200).json({
            success: true,
            user: {
                name: record.name,
                role: record.role,
                staff_id: record.staff_id,
                coords: record.coords,
                isSharing: record.isSharing,
                lastUpdated: record.lastUpdated
            },
            trail: record.recentPath || []
        });
    } catch (err) {
        console.error('Error in getUserLocationTrail:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error fetching location trail: ' + err.message
        });
    }
};
