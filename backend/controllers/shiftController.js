const Shift = require('../models/Shift');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const { getISTDate, getISTTimeString, formatISTDisplay } = require('../utils/dateTimeUtil');
const { calculateShiftAttendance, resolveEmployeeShift, DEFAULT_FALLBACK_SHIFT } = require('../utils/shiftCalculator');

/**
 * Get all configured shifts with staff assignment counts
 * GET /api/shifts
 */
exports.getShifts = async (req, res) => {
    try {
        const shifts = await Shift.find({}).sort({ isDefault: -1, createdAt: 1 }).populate('applicableStaff', 'name staff_id department designation');

        // Augment each shift with actual number of staff assigned
        const shiftsWithCounts = await Promise.all(shifts.map(async (shift) => {
            const shiftObj = shift.toObject();
            
            // Count staff assigned via assignedShift or department (including drivers)
            const directCount = await User.countDocuments({ 
                assignedShift: shift._id, 
                role: { $in: ['staff', 'driver'] }, 
                staffClassification: { $ne: 'Non-Staff' },
                status: 'active' 
            });
            let deptCount = 0;
            if (shift.applicableDepartments && shift.applicableDepartments.length > 0) {
                deptCount = await User.countDocuments({
                    department: { $in: shift.applicableDepartments },
                    assignedShift: { $exists: false },
                    role: { $in: ['staff', 'driver'] },
                    staffClassification: { $ne: 'Non-Staff' },
                    status: 'active'
                });
            }

            shiftObj.assignedStaffCount = directCount + deptCount;
            return shiftObj;
        }));

        res.json({
            success: true,
            shifts: shiftsWithCounts
        });
    } catch (err) {
        console.error('Error in getShifts:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get single shift by ID
 * GET /api/shifts/:id
 */
exports.getShiftById = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id)
            .populate('applicableStaff', 'name staff_id department email')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift configuration not found' });
        }

        res.json({ success: true, shift });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Create a new shift configuration
 * POST /api/shifts
 */
exports.createShift = async (req, res) => {
    try {
        const {
            name,
            code,
            startTime,
            endTime,
            breakDuration,
            expectedHours,
            gracePeriodMinutes,
            earlyExitAllowanceMinutes,
            shiftType,
            isOvernight,
            overtimeEnabled,
            minOvertimeMinutes,
            overtimeMultiplier,
            applicableDepartments,
            applicableStaff,
            weeklyOffDays,
            isActive,
            isDefault,
            autoShiftClosureEnabled,
            autoShiftClosureMaxHours
        } = req.body;

        if (!name || !code || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Shift Name, Code, Start Time, and End Time are required.' });
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await Shift.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(400).json({ success: false, message: `A shift with code "${normalizedCode}" already exists.` });
        }

        const newShift = new Shift({
            name: name.trim(),
            code: normalizedCode,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            breakDuration: breakDuration !== undefined ? Number(breakDuration) : 60,
            expectedHours: expectedHours !== undefined ? Number(expectedHours) : 7,
            gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : 10,
            earlyExitAllowanceMinutes: earlyExitAllowanceMinutes !== undefined ? Number(earlyExitAllowanceMinutes) : 15,
            shiftType: shiftType || 'Regular',
            isOvernight: !!isOvernight,
            overtimeEnabled: overtimeEnabled !== undefined ? !!overtimeEnabled : true,
            minOvertimeMinutes: minOvertimeMinutes !== undefined ? Number(minOvertimeMinutes) : 30,
            overtimeMultiplier: overtimeMultiplier !== undefined ? Number(overtimeMultiplier) : 1.0,
            applicableDepartments: Array.isArray(applicableDepartments) ? applicableDepartments : [],
            applicableStaff: Array.isArray(applicableStaff) ? applicableStaff : [],
            weeklyOffDays: Array.isArray(weeklyOffDays) && weeklyOffDays.length > 0 ? weeklyOffDays : ['Sunday'],
            isActive: isActive !== undefined ? !!isActive : true,
            isDefault: !!isDefault,
            autoShiftClosureEnabled: !!autoShiftClosureEnabled,
            autoShiftClosureMaxHours: autoShiftClosureMaxHours !== undefined ? Number(autoShiftClosureMaxHours) : 16,
            createdBy: req.user?._id || req.user?.id
        });

        await newShift.save();

        res.status(201).json({
            success: true,
            message: `Shift "${newShift.name}" created successfully.`,
            shift: newShift
        });
    } catch (err) {
        console.error('Error creating shift:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Update shift configuration
 * PUT /api/shifts/:id
 */
exports.updateShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift configuration not found' });
        }

        const {
            name,
            code,
            startTime,
            endTime,
            breakDuration,
            expectedHours,
            gracePeriodMinutes,
            earlyExitAllowanceMinutes,
            shiftType,
            isOvernight,
            overtimeEnabled,
            minOvertimeMinutes,
            overtimeMultiplier,
            applicableDepartments,
            applicableStaff,
            weeklyOffDays,
            isActive,
            isDefault,
            autoShiftClosureEnabled,
            autoShiftClosureMaxHours
        } = req.body;

        if (code && code.trim().toUpperCase() !== shift.code) {
            const codeExists = await Shift.findOne({
                code: code.trim().toUpperCase(),
                _id: { $ne: shift._id }
            });
            if (codeExists) {
                return res.status(400).json({ success: false, message: `Shift code "${code.trim().toUpperCase()}" is already in use.` });
            }
            shift.code = code.trim().toUpperCase();
        }

        if (name) shift.name = name.trim();
        if (startTime) shift.startTime = startTime.trim();
        if (endTime) shift.endTime = endTime.trim();
        if (breakDuration !== undefined) shift.breakDuration = Number(breakDuration);
        if (expectedHours !== undefined) shift.expectedHours = Number(expectedHours);
        if (gracePeriodMinutes !== undefined) shift.gracePeriodMinutes = Number(gracePeriodMinutes);
        if (earlyExitAllowanceMinutes !== undefined) shift.earlyExitAllowanceMinutes = Number(earlyExitAllowanceMinutes);
        if (shiftType) shift.shiftType = shiftType;
        if (isOvernight !== undefined) shift.isOvernight = !!isOvernight;
        if (overtimeEnabled !== undefined) shift.overtimeEnabled = !!overtimeEnabled;
        if (minOvertimeMinutes !== undefined) shift.minOvertimeMinutes = Number(minOvertimeMinutes);
        if (overtimeMultiplier !== undefined) shift.overtimeMultiplier = Number(overtimeMultiplier);
        if (applicableDepartments !== undefined) shift.applicableDepartments = applicableDepartments;
        if (applicableStaff !== undefined) shift.applicableStaff = applicableStaff;
        if (weeklyOffDays !== undefined) shift.weeklyOffDays = weeklyOffDays;
        if (isActive !== undefined) shift.isActive = !!isActive;
        if (isDefault !== undefined) shift.isDefault = !!isDefault;
        if (autoShiftClosureEnabled !== undefined) shift.autoShiftClosureEnabled = !!autoShiftClosureEnabled;
        if (autoShiftClosureMaxHours !== undefined) shift.autoShiftClosureMaxHours = Number(autoShiftClosureMaxHours);

        shift.updatedBy = req.user?._id || req.user?.id;

        await shift.save();

        res.json({
            success: true,
            message: `Shift "${shift.name}" updated successfully. Subsequent attendance records will use this configuration.`,
            shift
        });
    } catch (err) {
        console.error('Error updating shift:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Delete a shift configuration
 * DELETE /api/shifts/:id
 */
exports.deleteShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift configuration not found' });
        }

        if (shift.isDefault) {
            return res.status(400).json({ success: false, message: 'Cannot delete the default organization shift. Designate another shift as default first.' });
        }

        // Unlink from any users assigned
        await User.updateMany({ assignedShift: shift._id }, { $unset: { assignedShift: 1 } });
        await Shift.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: `Shift "${shift.name}" deleted successfully. Assigned staff have reverted to the default shift.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Toggle active status of a shift
 * PATCH /api/shifts/:id/toggle
 */
exports.toggleShiftStatus = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift configuration not found' });
        }

        if (shift.isDefault && shift.isActive) {
            return res.status(400).json({ success: false, message: 'Cannot deactivate the default shift. Make another shift default first.' });
        }

        shift.isActive = !shift.isActive;
        shift.updatedBy = req.user?._id || req.user?.id;
        await shift.save();

        res.json({
            success: true,
            message: `Shift "${shift.name}" is now ${shift.isActive ? 'Active' : 'Inactive'}.`,
            isActive: shift.isActive
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Assign staff members or departments to a shift
 * POST /api/shifts/:id/assign
 */
exports.assignStaffToShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift configuration not found' });
        }

        const { staffIds = [], departments = [] } = req.body;

        if (Array.isArray(staffIds) && staffIds.length > 0) {
            await User.updateMany(
                { _id: { $in: staffIds } },
                { $set: { assignedShift: shift._id } }
            );
        }

        if (Array.isArray(departments)) {
            shift.applicableDepartments = Array.from(new Set([...(shift.applicableDepartments || []), ...departments]));
            await shift.save();
        }

        res.json({
            success: true,
            message: `Shift assigned to ${staffIds.length} staff members and departments.`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Comprehensive Shift Roster & Operational Dashboard (Section 5)
 * GET /api/shifts/roster/today
 */
exports.getTodayShiftRoster = async (req, res) => {
    try {
        const todayDate = req.query.date || getISTDate(new Date());

        // 1. Fetch all active staff and drivers
        const allStaff = await User.find({ 
            role: { $in: ['staff', 'driver'] }, 
            staffClassification: { $ne: 'Non-Staff' }, 
            status: 'active' 
        })
            .select('name staff_id department designation email phone profilePhoto assignedShift')
            .populate('assignedShift');

        // 2. Fetch today's DailyAttendance records and Attendance biometric logs
        const [dailyRecords, bioLogs, shifts] = await Promise.all([
            DailyAttendance.find({ date: todayDate }).populate('staffId', 'name staff_id department designation'),
            Attendance.find({ date: todayDate, status: 'success' }).sort({ login_time: 1 }),
            Shift.find({ isActive: true })
        ]);

        const dailyMap = new Map();
        dailyRecords.forEach(d => {
            if (d.staffId?._id) dailyMap.set(String(d.staffId._id), d);
        });

        const bioMap = new Map();
        bioLogs.forEach(b => {
            const id = String(b.staff_id);
            if (!bioMap.has(id)) {
                bioMap.set(id, []);
            }
            bioMap.get(id).push(b);
        });

        const roster = await Promise.all(allStaff.map(async (staff) => {
            const staffIdStr = String(staff._id);
            const daily = dailyMap.get(staffIdStr);
            const biometrics = bioMap.get(staffIdStr) || [];

            let earliestBioIn = null;
            let latestBioOut = null;
            let bestBio = biometrics[0] || null;

            biometrics.forEach(b => {
                if (!earliestBioIn || new Date(b.login_time) < new Date(earliestBioIn)) {
                    earliestBioIn = b.login_time;
                    bestBio = b;
                }
                if (b.check_out) {
                    if (!latestBioOut || new Date(b.check_out) > new Date(latestBioOut)) {
                        latestBioOut = b.check_out;
                    }
                }
            });

            const shift = await resolveEmployeeShift(staff);
            const effectiveIn = earliestBioIn ? getISTTimeString(earliestBioIn) : (daily?.checkIn || null);
            const effectiveOut = latestBioOut ? getISTTimeString(latestBioOut) : (daily?.checkOut || null);

            const calc = calculateShiftAttendance({
                inTime: effectiveIn,
                outTime: effectiveOut,
                recordDate: todayDate,
                shift,
                breakMinutes: daily?.breakTime || shift.breakDuration || 0
            });

            return {
                staffId: staff._id,
                staff_id: staff.staff_id || 'ID',
                name: staff.name,
                email: staff.email,
                department: staff.department || 'General',
                designation: staff.designation || 'Staff',
                profilePhoto: staff.profilePhoto,
                shift: {
                    id: shift._id,
                    name: shift.name,
                    code: shift.code,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    expectedHours: shift.expectedHours
                },
                date: todayDate,
                checkIn: effectiveIn ? formatISTDisplay(effectiveIn, false) : '--',
                checkOut: effectiveOut ? formatISTDisplay(effectiveOut, false) : '--',
                rawCheckIn: effectiveIn,
                rawCheckOut: effectiveOut,
                status: calc.status,
                completionStatus: calc.completionStatus,
                isCompleted: calc.isCompleted,
                isActiveShift: calc.isActiveShift,
                isMissingOut: calc.isMissingOut,
                isLate: calc.isLate,
                lateMinutes: calc.lateMinutes,
                isEarlyExit: calc.isEarlyExit,
                earlyExitMinutes: calc.earlyExitMinutes,
                workedHours: calc.workedHours,
                durationMinutes: calc.durationMinutes,
                formattedDuration: calc.formattedDuration,
                overtimeHours: calc.overtimeHours,
                location: bestBio?.location || null,
                dailyRecordId: daily?._id || null,
                biometricLogId: bestBio?._id || null,
                manualCorrectionReason: daily?.manualCorrectionReason || null
            };
        }));

        // Summary counts
        const summary = {
            totalStaff: allStaff.length,
            activeShiftsNow: roster.filter(r => r.isActiveShift).length,
            completedShifts: roster.filter(r => r.isCompleted).length,
            missingOut: roster.filter(r => r.isMissingOut).length,
            lateArrivals: roster.filter(r => r.isLate).length,
            earlyDepartures: roster.filter(r => r.isEarlyExit).length,
            totalOvertimeHours: parseFloat(roster.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(2))
        };

        res.json({
            success: true,
            date: todayDate,
            summary,
            roster,
            shifts
        });
    } catch (err) {
        console.error('Error in getTodayShiftRoster:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Manually correct an attendance record with mandatory reason & audit trail (Section 5)
 * POST /api/shifts/attendance/correct
 */
exports.manualAttendanceCorrection = async (req, res) => {
    try {
        const {
            staffId,
            date,
            checkIn,
            checkOut,
            reason,
            breakTime = 0
        } = req.body;

        if (!staffId || !date) {
            return res.status(400).json({ success: false, message: 'Staff ID and Date are required.' });
        }

        if (!reason || String(reason).trim().length < 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'A mandatory audit reason (minimum 5 characters) is required for manual attendance correction.' 
            });
        }

        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        const shift = await resolveEmployeeShift(staff);
        const calc = calculateShiftAttendance({
            inTime: checkIn,
            outTime: checkOut,
            recordDate: date,
            shift,
            breakMinutes: Number(breakTime) || shift.breakDuration || 0
        });

        // 1. Update or create DailyAttendance
        const existingDaily = await DailyAttendance.findOne({ staffId, date });
        const previousDaily = existingDaily ? {
            checkIn: existingDaily.checkIn,
            checkOut: existingDaily.checkOut,
            status: existingDaily.status,
            workedHours: existingDaily.workedHours
        } : null;

        const updatedDaily = await DailyAttendance.findOneAndUpdate(
            { staffId, date },
            {
                $set: {
                    status: calc.status === 'COMPLETED' ? 'Completed' : (checkIn && !checkOut ? (date === getISTDate(new Date()) ? 'In Progress' : 'Missing Out') : 'Absent'),
                    checkIn: checkIn || '',
                    checkOut: checkOut || '',
                    breakTime: Number(breakTime) || shift.breakDuration || 0,
                    workedHours: calc.workedHours,
                    lateMinutes: calc.lateMinutes,
                    earlyExitMinutes: calc.earlyExitMinutes,
                    shiftId: shift._id,
                    shiftName: shift.name,
                    shiftCode: shift.code,
                    overtimeHours: calc.overtimeHours,
                    isApproved: true,
                    manualCorrectionReason: reason.trim(),
                    correctedBy: req.user?._id || req.user?.id,
                    correctedAt: new Date(),
                    originalCheckIn: previousDaily?.checkIn || checkIn,
                    originalCheckOut: previousDaily?.checkOut || checkOut,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        );

        // 2. Add entry to Attendance audit trail
        const existingBio = await Attendance.findOne({ staff_id: staffId, date });
        if (existingBio) {
            existingBio.completion_status = calc.completionStatus;
            existingBio.duration_minutes = calc.durationMinutes;
            existingBio.shift_id = shift._id;
            existingBio.shift_code = shift.code;
            existingBio.audit_trail.push({
                action: 'MANUALLY_EDITED',
                performed_by: req.user?._id || req.user?.id,
                performed_by_name: req.user?.name || 'Administrator',
                timestamp: new Date(),
                details: `Admin corrected timestamps. In: ${checkIn || '--'}, Out: ${checkOut || '--'}. Reason: "${reason.trim()}". Duration: ${calc.formattedDuration}.`,
                ip_address: req.ip || ''
            });
            await existingBio.save();
        }

        // 3. Overtime record update
        if (calc.overtimeHours > 0) {
            await Overtime.findOneAndUpdate(
                { staffId, date },
                {
                    hours: calc.overtimeHours,
                    ratePerHour: staff.overtimeRate || 0,
                    totalAmount: parseFloat((calc.overtimeHours * (staff.overtimeRate || 0)).toFixed(2)),
                    regularHours: shift.expectedHours,
                    checkIn: checkIn || '09:00',
                    checkOut: checkOut || '17:00',
                    status: staff.otApprovalRequired ? 'Pending' : 'Approved',
                    addedBy: req.user?._id || req.user?.id
                },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            message: `Attendance for ${staff.name} on ${date} corrected successfully. Status: ${calc.status}.`,
            record: updatedDaily,
            calculation: calc
        });
    } catch (err) {
        console.error('Error in manualAttendanceCorrection:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get Late Arrival Configuration for Morning Shift
 * GET /api/shifts/settings/late-arrival
 */
exports.getLateArrivalSettings = async (req, res) => {
    try {
        let morningShift = await Shift.findOne({ code: 'MORNING' });
        if (!morningShift) {
            morningShift = await Shift.findOne({ isDefault: true }) || await Shift.findOne({});
        }

        if (!morningShift) {
            return res.json({
                success: true,
                settings: {
                    shiftName: 'Morning Shift',
                    shiftCode: 'MORNING',
                    startTime: '09:00',
                    gracePeriodMinutes: 10,
                    lateDetectionEnabled: true,
                    lateNotificationsEnabled: true,
                    lateNotificationChannels: { inApp: true, email: false, whatsapp: false }
                }
            });
        }

        res.json({
            success: true,
            settings: {
                shiftId: morningShift._id,
                shiftName: morningShift.name,
                shiftCode: morningShift.code,
                startTime: morningShift.startTime || '09:00',
                gracePeriodMinutes: morningShift.gracePeriodMinutes !== undefined ? morningShift.gracePeriodMinutes : 10,
                lateDetectionEnabled: morningShift.lateDetectionEnabled !== false,
                lateNotificationsEnabled: morningShift.lateNotificationsEnabled !== false,
                lateNotificationChannels: morningShift.lateNotificationChannels || { inApp: true, email: false, whatsapp: false }
            }
        });
    } catch (err) {
        console.error('Error fetching late arrival settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Update Late Arrival Configuration for Morning Shift
 * PUT /api/shifts/settings/late-arrival
 */
exports.updateLateArrivalSettings = async (req, res) => {
    try {
        const {
            startTime,
            gracePeriodMinutes,
            lateDetectionEnabled,
            lateNotificationsEnabled,
            lateNotificationChannels
        } = req.body;

        let morningShift = await Shift.findOne({ code: 'MORNING' });
        if (!morningShift) {
            morningShift = await Shift.findOne({ isDefault: true });
        }

        const updateData = {};
        if (startTime) updateData.startTime = startTime.trim();
        if (gracePeriodMinutes !== undefined) updateData.gracePeriodMinutes = Math.max(0, Number(gracePeriodMinutes));
        if (lateDetectionEnabled !== undefined) updateData.lateDetectionEnabled = Boolean(lateDetectionEnabled);
        if (lateNotificationsEnabled !== undefined) updateData.lateNotificationsEnabled = Boolean(lateNotificationsEnabled);
        if (lateNotificationChannels) updateData.lateNotificationChannels = lateNotificationChannels;
        updateData.updatedBy = req.user?._id || req.user?.id;

        if (morningShift) {
            await Shift.updateOne({ _id: morningShift._id }, { $set: updateData });
            morningShift = await Shift.findById(morningShift._id);
        } else {
            morningShift = await Shift.create({
                name: 'Morning Shift',
                code: 'MORNING',
                endTime: '17:00',
                isDefault: true,
                ...updateData
            });
        }

        // Trigger dynamic recalculation of today's attendance records with new grace/start
        try {
            const todayStr = getISTDate(new Date());
            const todayRecords = await DailyAttendance.find({ date: todayStr });
            for (const rec of todayRecords) {
                if (rec.checkIn && rec.checkIn !== '--') {
                    const calc = calculateShiftAttendance({
                        inTime: rec.checkIn,
                        outTime: rec.checkOut,
                        recordDate: todayStr,
                        shift: morningShift
                    });
                    await DailyAttendance.updateOne(
                        { _id: rec._id },
                        { $set: { lateMinutes: calc.lateMinutes, isLate: calc.isLate } }
                    );
                }
            }
        } catch (recalcErr) {
            console.warn('Notice updating today records on settings change:', recalcErr.message);
        }

        res.json({
            success: true,
            message: 'Late arrival settings updated successfully.',
            settings: {
                shiftId: morningShift._id,
                shiftName: morningShift.name,
                shiftCode: morningShift.code,
                startTime: morningShift.startTime,
                gracePeriodMinutes: morningShift.gracePeriodMinutes,
                lateDetectionEnabled: morningShift.lateDetectionEnabled,
                lateNotificationsEnabled: morningShift.lateNotificationsEnabled,
                lateNotificationChannels: morningShift.lateNotificationChannels
            }
        });
    } catch (err) {
        console.error('Error updating late arrival settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get Monthly & Date-wise Late Arrivals Summary & Report
 * GET /api/shifts/reports/late-arrivals
 */
exports.getLateArrivalsReport = async (req, res) => {
    try {
        const { month, date, staffId } = req.query;
        const currentMonth = month || getISTDate(new Date()).substring(0, 7);

        let query = {
            lateMinutes: { $gt: 0 }
        };

        if (date) {
            query.date = date;
        } else if (currentMonth) {
            query.date = { $regex: `^${currentMonth}` };
        }

        if (staffId && staffId !== 'ALL') {
            query.staffId = staffId;
        }

        const lateDailyRecords = await DailyAttendance.find(query)
            .populate('staffId', 'name staff_id department designation')
            .sort({ date: -1 });

        // Retrieve Morning Shift start time
        const morningShift = await Shift.findOne({ code: 'MORNING' }) || await Shift.findOne({ isDefault: true });
        const shiftStartStr = morningShift?.startTime ? formatISTDisplay(morningShift.startTime, false) : '09:00 AM';

        let totalLateMinutes = 0;
        const employeeMap = new Map();

        const records = lateDailyRecords.map(r => {
            const staff = r.staffId || {};
            const staffKey = staff._id ? String(staff._id) : (r.staffId ? String(r.staffId) : 'unknown');
            const staffName = staff.name || 'Unknown Staff';
            const dept = staff.department || 'General';
            const lateMins = r.lateMinutes || 0;

            totalLateMinutes += lateMins;

            if (!employeeMap.has(staffKey)) {
                employeeMap.set(staffKey, {
                    staffId: staffKey,
                    name: staffName,
                    department: dept,
                    lateCount: 0,
                    totalLateMinutes: 0
                });
            }
            const empStat = employeeMap.get(staffKey);
            empStat.lateCount += 1;
            empStat.totalLateMinutes += lateMins;

            const actualInStr = r.checkInDisplay || r.checkIn || '--';

            return {
                id: r._id,
                staffId: staffKey,
                staffName: staffName,
                department: dept,
                date: r.date,
                shiftStart: shiftStartStr,
                actualIn: actualInStr,
                actualOut: r.checkOutDisplay || r.checkOut || '--',
                lateMinutes: lateMins,
                status: `Late (+${lateMins}m)`,
                attendanceStatus: r.status
            };
        });

        // Most frequent late arrivals sorted by count descending, then total minutes
        const mostFrequentLate = Array.from(employeeMap.values()).sort((a, b) => {
            if (b.lateCount !== a.lateCount) {
                return b.lateCount - a.lateCount;
            }
            return b.totalLateMinutes - a.totalLateMinutes;
        });

        res.json({
            success: true,
            month: currentMonth,
            summary: {
                totalLateArrivals: records.length,
                uniqueLateEmployees: employeeMap.size,
                totalLateMinutes,
                averageLateMinutes: records.length > 0 ? Math.round(totalLateMinutes / records.length) : 0,
                mostFrequentLate
            },
            records
        });
    } catch (err) {
        console.error('Error fetching late arrivals report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Retrieve Morning Shift Early Checkout settings
 * GET /api/shifts/settings/early-checkout
 */
exports.getEarlyCheckoutSettings = async (req, res) => {
    try {
        let morningShift = await Shift.findOne({ code: 'MORNING' });
        if (!morningShift) {
            morningShift = await Shift.findOne({ isDefault: true }) || await Shift.findOne({});
        }

        if (!morningShift) {
            return res.json({
                success: true,
                settings: {
                    shiftName: 'Morning Shift',
                    shiftCode: 'MORNING',
                    endTime: '17:00',
                    earlyExitAllowanceMinutes: 10,
                    earlyExitDetectionEnabled: true,
                    earlyExitNotificationsEnabled: true,
                    earlyExitNotificationChannels: { inApp: true, email: false, whatsapp: false }
                }
            });
        }

        res.json({
            success: true,
            settings: {
                shiftId: morningShift._id,
                shiftName: morningShift.name,
                shiftCode: morningShift.code,
                endTime: morningShift.endTime || '17:00',
                earlyExitAllowanceMinutes: morningShift.earlyExitAllowanceMinutes ?? 10,
                earlyExitDetectionEnabled: morningShift.earlyExitDetectionEnabled !== false,
                earlyExitNotificationsEnabled: morningShift.earlyExitNotificationsEnabled !== false,
                earlyExitNotificationChannels: morningShift.earlyExitNotificationChannels || { inApp: true, email: false, whatsapp: false },
                startTime: morningShift.startTime || '09:00',
                breakDuration: morningShift.breakDuration || 60
            }
        });
    } catch (err) {
        console.error('Error fetching early checkout settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Update Morning Shift Early Checkout settings
 * PUT /api/shifts/settings/early-checkout
 */
exports.updateEarlyCheckoutSettings = async (req, res) => {
    try {
        const {
            endTime,
            earlyExitAllowanceMinutes,
            earlyExitDetectionEnabled,
            earlyExitNotificationsEnabled,
            earlyExitNotificationChannels
        } = req.body;

        let morningShift = await Shift.findOne({ code: 'MORNING' });
        if (!morningShift) {
            morningShift = await Shift.findOne({ isDefault: true }) || await Shift.findOne({});
        }

        if (!morningShift) {
            morningShift = new Shift({
                name: 'Morning Shift',
                code: 'MORNING',
                startTime: '09:00',
                endTime: endTime || '17:00',
                breakDuration: 60,
                expectedHours: 7,
                gracePeriodMinutes: 10,
                earlyExitAllowanceMinutes: earlyExitAllowanceMinutes !== undefined ? Number(earlyExitAllowanceMinutes) : 10,
                earlyExitDetectionEnabled: earlyExitDetectionEnabled !== undefined ? !!earlyExitDetectionEnabled : true,
                earlyExitNotificationsEnabled: earlyExitNotificationsEnabled !== undefined ? !!earlyExitNotificationsEnabled : true,
                earlyExitNotificationChannels: earlyExitNotificationChannels || { inApp: true, email: false, whatsapp: false },
                isDefault: true,
                isActive: true
            });
        } else {
            if (endTime) morningShift.endTime = endTime;
            if (earlyExitAllowanceMinutes !== undefined) morningShift.earlyExitAllowanceMinutes = Math.max(0, Number(earlyExitAllowanceMinutes));
            if (earlyExitDetectionEnabled !== undefined) morningShift.earlyExitDetectionEnabled = !!earlyExitDetectionEnabled;
            if (earlyExitNotificationsEnabled !== undefined) morningShift.earlyExitNotificationsEnabled = !!earlyExitNotificationsEnabled;
            if (earlyExitNotificationChannels) morningShift.earlyExitNotificationChannels = earlyExitNotificationChannels;
        }

        await morningShift.save();

        // Dynamically recalculate today's attendance records if checkOut exists
        try {
            const { calculateShiftAttendance } = require('../utils/shiftCalculator');
            const todayStr = getISTDate(new Date());
            const todayRecords = await DailyAttendance.find({ date: todayStr });
            for (const rec of todayRecords) {
                if (rec.checkOut && rec.checkOut !== '--') {
                    const calc = calculateShiftAttendance({
                        inTime: rec.checkIn,
                        outTime: rec.checkOut,
                        recordDate: todayStr,
                        shift: morningShift
                    });
                    await DailyAttendance.updateOne(
                        { _id: rec._id },
                        { $set: { earlyExitMinutes: calc.earlyExitMinutes, isEarlyExit: calc.isEarlyExit } }
                    );
                }
            }
        } catch (recalcErr) {
            console.error('Non-critical error recalculating today early checkout adherence:', recalcErr);
        }

        res.json({
            success: true,
            message: 'Early checkout settings updated successfully.',
            settings: {
                shiftId: morningShift._id,
                shiftName: morningShift.name,
                shiftCode: morningShift.code,
                endTime: morningShift.endTime,
                earlyExitAllowanceMinutes: morningShift.earlyExitAllowanceMinutes,
                earlyExitDetectionEnabled: morningShift.earlyExitDetectionEnabled,
                earlyExitNotificationsEnabled: morningShift.earlyExitNotificationsEnabled,
                earlyExitNotificationChannels: morningShift.earlyExitNotificationChannels
            }
        });
    } catch (err) {
        console.error('Error updating early checkout settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Retrieve Early Checkout Monthly & Date-wise Summary Report
 * GET /api/shifts/reports/early-checkouts?month=YYYY-MM&staffId=...&date=...
 */
exports.getEarlyCheckoutsReport = async (req, res) => {
    try {
        const { month, date, staffId } = req.query;
        const currentMonth = month || getISTDate(new Date()).substring(0, 7);

        let query = {
            earlyExitMinutes: { $gt: 0 }
        };

        if (date) {
            query.date = date;
        } else if (currentMonth) {
            query.date = { $regex: `^${currentMonth}` };
        }

        if (staffId && staffId !== 'ALL') {
            query.staffId = staffId;
        }

        const earlyDailyRecords = await DailyAttendance.find(query)
            .populate('staffId', 'name staff_id department designation')
            .sort({ date: -1 });

        // Retrieve Morning Shift end time
        const morningShift = await Shift.findOne({ code: 'MORNING' }) || await Shift.findOne({ isDefault: true });
        const shiftEndStr = morningShift?.endTime ? formatISTDisplay(morningShift.endTime, false) : '05:00 PM';

        let totalEarlyMinutes = 0;
        const employeeMap = new Map();

        const records = earlyDailyRecords.map(r => {
            const staff = r.staffId || {};
            const staffKey = staff._id ? String(staff._id) : (r.staffId ? String(r.staffId) : 'unknown');
            const staffName = staff.name || 'Unknown Staff';
            const dept = staff.department || 'General';
            const earlyMins = r.earlyExitMinutes || 0;

            totalEarlyMinutes += earlyMins;

            if (!employeeMap.has(staffKey)) {
                employeeMap.set(staffKey, {
                    staffId: staffKey,
                    name: staffName,
                    department: dept,
                    earlyCount: 0,
                    totalEarlyMinutes: 0
                });
            }
            const empStat = employeeMap.get(staffKey);
            empStat.earlyCount += 1;
            empStat.totalEarlyMinutes += earlyMins;

            const actualOutStr = r.checkOutDisplay || r.checkOut || '--';

            return {
                id: r._id,
                staffId: staffKey,
                staffName: staffName,
                department: dept,
                date: r.date,
                shiftEnd: shiftEndStr,
                actualIn: r.checkInDisplay || r.checkIn || '--',
                actualOut: actualOutStr,
                earlyMinutes: earlyMins,
                status: r.hasApprovedEarlyDeparture ? 'Approved Departure' : `Early Checkout (-${earlyMins}m)`,
                attendanceStatus: r.status,
                hasApprovedEarlyDeparture: !!r.hasApprovedEarlyDeparture
            };
        });

        // Most frequent early checkouts sorted by count descending, then total minutes
        const mostFrequentEarly = Array.from(employeeMap.values()).sort((a, b) => {
            if (b.earlyCount !== a.earlyCount) {
                return b.earlyCount - a.earlyCount;
            }
            return b.totalEarlyMinutes - a.totalEarlyMinutes;
        });

        res.json({
            success: true,
            month: currentMonth,
            summary: {
                totalEarlyCheckouts: records.length,
                uniqueEarlyEmployees: employeeMap.size,
                totalEarlyMinutes,
                averageEarlyMinutes: records.length > 0 ? Math.round(totalEarlyMinutes / records.length) : 0,
                mostFrequentEarly
            },
            records
        });
    } catch (err) {
        console.error('Error fetching early checkouts report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
