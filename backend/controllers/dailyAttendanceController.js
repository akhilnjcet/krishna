const DailyAttendance = require('../models/DailyAttendance');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { autoGenerateAbsentLogs } = require('../utils/attendanceHelper');
const { getISTDate, getISTTimeString, formatISTDisplay, calculateDuration, normalizeAttendanceTime } = require('../utils/dateTimeUtil');

// Mark/Update Daily Attendance status
exports.markDailyAttendance = async (req, res) => {
    try {
        const { staffId, date, status, checkIn, checkOut, breakTime } = req.body;

        if (!staffId || !date || !status) {
            return res.status(400).json({ message: "Staff ID, date, and status are required." });
        }

        // Verify staff user exists
        const staff = await User.findOne({ _id: staffId, role: 'staff' });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found." });
        }

        // Calculate hours and dynamic shift adherence
        let workedHours = 0;
        let lateMinutes = 0;
        let earlyExitMinutes = 0;
        let overtimeHours = 0;
        let canonicalStatus = status;

        const { resolveEmployeeShift, calculateShiftAttendance } = require('../utils/shiftCalculator');
        const shift = await resolveEmployeeShift(staff);

        const hasCheckIn = !!(checkIn && checkIn.trim() !== '' && checkIn !== '--');
        const hasCheckOut = !!(checkOut && checkOut.trim() !== '' && checkOut !== '--');

        if (status === 'Present' || status === 'Completed' || status === 'Half Day' || (hasCheckIn && hasCheckOut)) {
            const actualCheckIn = checkIn || shift.startTime || "09:00";
            const actualCheckOut = checkOut || shift.endTime || "17:00";
            const actualBreakTime = breakTime !== undefined ? Number(breakTime) : (shift.breakDuration || 0);

            const calc = calculateShiftAttendance({
                inTime: actualCheckIn,
                outTime: actualCheckOut,
                recordDate: date,
                shift,
                breakMinutes: actualBreakTime
            });

            workedHours = calc.workedHours;
            lateMinutes = calc.lateMinutes;
            earlyExitMinutes = calc.earlyExitMinutes;
            overtimeHours = calc.overtimeHours;
            canonicalStatus = (hasCheckIn && hasCheckOut) ? 'Completed' : calc.status;
        }

        const attendance = await DailyAttendance.findOneAndUpdate(
            { staffId, date },
            { 
                status: canonicalStatus, 
                checkIn: (status === 'Present' || status === 'Completed' || status === 'Half Day') ? checkIn || shift.startTime || "09:00" : "",
                checkOut: (status === 'Present' || status === 'Completed' || status === 'Half Day') ? checkOut || (status === 'Completed' || status === 'Present' ? shift.endTime || "17:00" : "13:00") : "",
                breakTime: (status === 'Present' || status === 'Completed' || status === 'Half Day') ? breakTime || shift.breakDuration || 0 : 0,
                workedHours,
                lateMinutes,
                earlyExitMinutes,
                overtimeHours,
                shiftId: shift._id,
                shiftCode: shift.code,
                shiftName: shift.name,
                isOvernight: shift.isOvernight,
                isApproved: true,
                markedBy: req.user.id, 
                updatedAt: Date.now() 
            },
            { upsert: true, new: true }
        );

        // Keep Attendance biometric audit log in sync
        try {
            const biometricLog = await Attendance.findOne({ staff_id: staffId, date });
            if (biometricLog) {
                if (workedHours > 0) {
                    biometricLog.duration_minutes = Math.round(workedHours * 60);
                }
                await biometricLog.save();
            }
        } catch (syncErr) {
            console.warn('Biometric log sync notice:', syncErr.message);
        }

        // Generate / Update Overtime record if workedHours > standard working hours per day
        const stdHours = staff.standardWorkingHoursPerDay || 8;
        const Overtime = require('../models/Overtime');

        if (workedHours > stdHours) {
            const otHours = parseFloat((workedHours - stdHours).toFixed(2));
            const otRate = staff.overtimeRate || 0;
            const otAmount = parseFloat((otHours * otRate).toFixed(2));
            const otStatus = staff.otApprovalRequired ? 'Pending' : 'Approved';

            await Overtime.findOneAndUpdate(
                { staffId, date },
                {
                    hours: otHours,
                    ratePerHour: otRate,
                    totalAmount: otAmount,
                    regularHours: stdHours,
                    checkIn: checkIn || "09:00",
                    checkOut: checkOut || "17:00",
                    status: otStatus,
                    addedBy: req.user.id,
                    createdAt: Date.now()
                },
                { upsert: true }
            );
        } else {
            // Delete overtime record if worked hours are not exceeding standard hours
            await Overtime.findOneAndDelete({ staffId, date });
        }

        // Recalculate salary for this month in real time
        const { recalculateSalary } = require('../utils/salaryCalculator');
        const monthStr = date.substring(0, 7);
        await recalculateSalary(staffId, monthStr);

        // Emit real-time Socket.IO notifications
        try {
            const socketUtil = require('../utils/socket');
            const io = socketUtil.getIO();
            if (io) {
                io.emit('attendance_updated', { staffId: String(staffId), date, status });
                io.emit('attendance_recorded', { staffId: String(staffId), date, status });
                io.emit('daily_attendance_changed', { staffId: String(staffId), date, status });
                io.emit('payroll_updated', { staffId: String(staffId), month: monthStr });
                io.emit('salary_updated', { staffId: String(staffId), month: monthStr });
            }

            const { dispatchNotification } = require('../services/notificationDispatcher');
            dispatchNotification({
                title: `Staff Attendance: ${staff.name}`,
                message: `${staff.name} marked ${status} on ${date}.`,
                category: 'attendance',
                priority: 'low',
                recipientRole: 'admin',
                link: '/admin/attendance',
                metadata: { staffId: String(staffId), date, status }
            }).catch(() => {});
        } catch (sErr) {
            console.warn("Socket notification warning:", sErr.message);
        }

        // Dispatch Attendance Notifications (WhatsApp + Email) with serverless-safe timeout
        try {
            const { sendStaffAttendanceNotification } = require('../services/whatsappService');
            const { sendStaffAttendanceEmail } = require('../services/emailService');

            const attendanceType = status === 'Present' ? (checkOut ? 'Check-out' : 'Check-in') : (status === 'Half Day' ? 'Half-Day' : status);
            const formattedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            const dateTimeStr = `${date} at ${formattedTime}`;

            const notificationPayload = {
                type: attendanceType,
                dateTimeStr
            };

            const dispatchTasks = [];
            if (staff.phoneNumber || staff.phone) {
                dispatchTasks.push(
                    sendStaffAttendanceNotification(staff, notificationPayload).catch(err => {
                        console.warn('WhatsApp daily attendance alert notice:', err.message);
                    })
                );
            }

            const targetEmail = (staff.email || '').trim().toLowerCase();
            if (targetEmail && targetEmail.includes('@')) {
                dispatchTasks.push(
                    sendStaffAttendanceEmail(targetEmail, staff.name, {
                        ...notificationPayload,
                        method: 'Admin Registry Update'
                    }).catch(err => {
                        console.warn('Email daily attendance alert notice:', err.message);
                    })
                );
            }

            if (dispatchTasks.length > 0) {
                await Promise.race([
                    Promise.allSettled(dispatchTasks),
                    new Promise(resolve => setTimeout(resolve, 3500))
                ]);
            }
        } catch (notifyErr) {
            console.warn('Daily attendance notification dispatch notice:', notifyErr.message);
        }

        console.log(`✅ Daily Attendance & Salary updated for ${staff.name} on ${date}: ${status}`);
        res.json({ message: "Attendance and salary updated successfully.", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper: Reconcile Daily Attendance records dynamically with authoritative biometric logs
const reconcileRecordsWithBiometrics = async (records) => {
    if (!records || records.length === 0) return [];

    const staffIds = records.map(r => r.staffId?._id || r.staffId).filter(Boolean);
    const dates = records.map(r => r.date).filter(Boolean);

    let biometricLogs = [];
    if (staffIds.length > 0 && dates.length > 0) {
        biometricLogs = await Attendance.find({
            staff_id: { $in: staffIds },
            date: { $in: dates },
            status: 'success'
        }).sort({ login_time: 1 });
    }

    const bioMap = new Map();
    biometricLogs.forEach(b => {
        const key = `${b.staff_id}_${b.date}`;
        if (!bioMap.has(key)) {
            bioMap.set(key, b);
        }
    });

    return records.map(r => {
        const obj = r.toObject ? r.toObject() : { ...r };
        const staffKey = `${r.staffId?._id || r.staffId}_${r.date}`;
        const bio = bioMap.get(staffKey);

        let finalCheckIn = obj.checkIn;
        let finalCheckOut = obj.checkOut;

        if (bio && bio.login_time) {
            // Authoritative biometric scan in IST
            finalCheckIn = getISTTimeString(bio.login_time);
            if (bio.check_out) {
                finalCheckOut = getISTTimeString(bio.check_out);
            }
        } else if (finalCheckIn) {
            finalCheckIn = normalizeAttendanceTime(finalCheckIn);
        }

        if (finalCheckOut) {
            finalCheckOut = normalizeAttendanceTime(finalCheckOut);
        }

        obj.checkIn = finalCheckIn;
        obj.checkOut = finalCheckOut;
        obj.checkInDisplay = finalCheckIn ? formatISTDisplay(finalCheckIn, false) : '--';
        obj.checkInFullDisplay = bio && bio.login_time 
            ? formatISTDisplay(bio.login_time, true) 
            : (finalCheckIn ? formatISTDisplay(finalCheckIn, true) : '--');
        obj.checkOutDisplay = finalCheckOut ? formatISTDisplay(finalCheckOut, false) : '--';
        obj.checkOutFullDisplay = bio && bio.check_out 
            ? formatISTDisplay(bio.check_out, true) 
            : (finalCheckOut ? formatISTDisplay(finalCheckOut, true) : '--');

        if (bio && bio.login_time) {
            obj.login_time = bio.login_time;
        }
        if (bio && bio.check_out) {
            obj.biometric_check_out = bio.check_out;
        }

        const todayStr = getISTDate(new Date());
        const hasValidIn = !!(finalCheckIn && finalCheckIn !== '--');
        const hasValidOut = !!(finalCheckOut && finalCheckOut !== '--');

        if (hasValidIn && hasValidOut) {
            obj.status = 'Completed';
            obj.completion_status = 'COMPLETED';
            obj.is_active_shift = false;

            // Recalculate duration & hours if missing or zero
            if (!obj.workedHours || obj.workedHours === 0) {
                const { calculateShiftAttendance } = require('../utils/shiftCalculator');
                const calc = calculateShiftAttendance({
                    inTime: finalCheckIn,
                    outTime: finalCheckOut,
                    recordDate: obj.date,
                    breakMinutes: obj.breakTime || 0
                });
                obj.workedHours = calc.workedHours;
                obj.duration_minutes = calc.durationMinutes;
            }
        } else if (hasValidIn && !hasValidOut) {
            if (obj.date === todayStr) {
                obj.status = 'In Progress';
                obj.completion_status = 'IN_PROGRESS';
                obj.is_active_shift = true;
            } else {
                obj.status = 'Missing Out';
                obj.completion_status = 'MISSING_OUT';
                obj.is_active_shift = false;
            }
        }

        return obj;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Get Daily Attendance for a month (Format: YYYY-MM) or single date (Format: YYYY-MM-DD)
exports.getDailyAttendance = async (req, res) => {
    try {
        const { date, month, staffId } = req.query;
        let query = {};

        if (month) {
            await autoGenerateAbsentLogs(month);
        }

        // Enforce role isolation: staff can ONLY query their own attendance
        if (req.user.role === 'staff') {
            query.staffId = req.user.id;
        } else if (staffId) {
            query.staffId = staffId;
        }

        if (date) {
            query.date = date;
        } else if (month) {
            // Match date starting with YYYY-MM
            query.date = { $regex: `^${month}` };
        }

        const attendanceRecords = await DailyAttendance.find(query)
            .populate('staffId', 'name email staff_id department designation')
            .sort({ date: -1 });

        const reconciledRecords = await reconcileRecordsWithBiometrics(attendanceRecords);

        res.json(reconciledRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get monthly attendance summary for a staff member
exports.getStaffDailyAttendanceSummary = async (req, res) => {
    try {
        const { staffId, month } = req.query; // month Format: YYYY-MM
        // Enforce role isolation: staff cannot query another staff member's summary
        const targetStaffId = req.user.role === 'staff' ? req.user.id : (staffId || req.user.id);

        if (!month) {
            return res.status(400).json({ message: "Month (Format: YYYY-MM) is required." });
        }

        await autoGenerateAbsentLogs(month);

        const records = await DailyAttendance.find({
            staffId: targetStaffId,
            date: { $regex: `^${month}` }
        }).sort({ date: -1 });

        const reconciledRecords = await reconcileRecordsWithBiometrics(records);

        const summary = {
            present: 0,
            absent: 0,
            halfDay: 0,
            leave: 0,
            holiday: 0,
            totalDays: reconciledRecords.length,
            percentage: 0
        };

        reconciledRecords.forEach(r => {
            if (r.status === 'Present') summary.present++;
            else if (r.status === 'Absent') summary.absent++;
            else if (r.status === 'Half Day') summary.halfDay++;
            else if (r.status === 'Leave') summary.leave++;
            else if (r.status === 'Holiday') summary.holiday++;
        });

        // Attendance Percentage Calculation: (Present + 0.5 * HalfDay) / (Total Days - Holidays) * 100
        const activeDaysCount = summary.present + (summary.halfDay * 0.5);
        const countableDays = summary.totalDays - summary.holiday;
        if (countableDays > 0) {
            summary.percentage = Math.round((activeDaysCount / countableDays) * 100);
        } else if (summary.totalDays > 0) {
            summary.percentage = 100; // All holidays
        }

        res.json({ staffId: targetStaffId, month, summary, records: reconciledRecords });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
