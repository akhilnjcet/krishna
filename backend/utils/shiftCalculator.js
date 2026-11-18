const Shift = require('../models/Shift');
const User = require('../models/User');
const { getISTDate, getISTTimeString, formatISTDisplay } = require('./dateTimeUtil');

/**
 * Default fallback shift configuration if database has no active shifts
 */
const DEFAULT_FALLBACK_SHIFT = {
    name: 'Morning Shift (Default)',
    code: 'MORNING',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    expectedHours: 7,
    gracePeriodMinutes: 10,
    earlyExitAllowanceMinutes: 15,
    lateDetectionEnabled: true,
    lateNotificationsEnabled: true,
    shiftType: 'Regular',
    isOvernight: false,
    overtimeEnabled: true,
    minOvertimeMinutes: 30,
    overtimeMultiplier: 1.0,
    weeklyOffDays: ['Sunday'],
    isActive: true,
    isDefault: true
};

/**
 * Resolves the applicable active shift for a given staff user
 */
const resolveEmployeeShift = async (staffIdOrUser) => {
    try {
        let staff = staffIdOrUser;
        if (!staff || typeof staff === 'string' || staff instanceof String) {
            staff = await User.findById(staffIdOrUser).populate('assignedShift');
        } else if (staff._id && !staff.assignedShift && !staff.department) {
            staff = await User.findById(staff._id).populate('assignedShift');
        }

        // 1. Direct assigned shift on user
        if (staff?.assignedShift && staff.assignedShift.isActive) {
            return staff.assignedShift;
        }

        // 2. Department matching shift
        if (staff?.department) {
            const deptShift = await Shift.findOne({
                isActive: true,
                applicableDepartments: { $in: [staff.department] }
            });
            if (deptShift) return deptShift;
        }

        // 3. User in applicableStaff array
        if (staff?._id) {
            const staffSpecificShift = await Shift.findOne({
                isActive: true,
                applicableStaff: staff._id
            });
            if (staffSpecificShift) return staffSpecificShift;
        }

        // 4. Default active shift
        const defaultShift = await Shift.findOne({ isActive: true, isDefault: true });
        if (defaultShift) return defaultShift;

        // 5. Any active shift
        const anyActive = await Shift.findOne({ isActive: true });
        if (anyActive) return anyActive;

        return DEFAULT_FALLBACK_SHIFT;
    } catch (err) {
        console.warn('Error resolving employee shift, using default:', err.message);
        return DEFAULT_FALLBACK_SHIFT;
    }
};

/**
 * Converts any time input (Date, ISO string, HH:mm, HH:mm:ss, or 12-hr string) into total minutes from 00:00
 */
const parseTimeToMinutes = (timeVal) => {
    if (!timeVal) return null;

    if (timeVal instanceof Date) {
        const istStr = getISTTimeString(timeVal); // "HH:mm"
        const [h, m] = istStr.split(':').map(Number);
        return h * 60 + m;
    }

    if (typeof timeVal === 'string') {
        const trimmed = timeVal.trim();
        // ISO string containing 'T' or 'Z'
        if (trimmed.includes('T') || trimmed.includes('Z')) {
            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                const istStr = getISTTimeString(d);
                const [h, m] = istStr.split(':').map(Number);
                return h * 60 + m;
            }
        }

        // 12-hour AM/PM string like "08:59 AM" or "04:54 PM"
        if (/AM|PM/i.test(trimmed)) {
            const match = trimmed.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
            if (match) {
                let h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                const ampm = match[3].toUpperCase();
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                return h * 60 + m;
            }
        }

        // 24-hour "HH:mm" or "HH:mm:ss"
        if (/^\d{1,2}:\d{2}/.test(trimmed)) {
            const [h, m] = trimmed.split(':').map(Number);
            return h * 60 + m;
        }
    }

    return null;
};

/**
 * Core Shift Attendance Calculator
 * Calculates worked hours, duration, late arrival, early exit, overtime, and canonical status.
 * Never drops or invalidates overnight shifts crossing midnight!
 */
const calculateShiftAttendance = ({
    inTime,
    outTime,
    recordDate,
    shift = DEFAULT_FALLBACK_SHIFT,
    breakMinutes = null
}) => {
    const todayIST = getISTDate(new Date());
    const isToday = recordDate === todayIST;

    const inMins = parseTimeToMinutes(inTime);
    const outMins = parseTimeToMinutes(outTime);

    const hasIn = inMins !== null;
    const hasOut = outMins !== null && outTime !== '--' && outTime !== '';

    const breakDuration = breakMinutes !== null && breakMinutes !== undefined 
        ? Number(breakMinutes) 
        : Number(shift.breakDuration || 0);

    const expectedHours = Number(shift.expectedHours || 7);
    const gracePeriod = Number(shift.gracePeriodMinutes || 10);
    const earlyAllowance = Number(shift.earlyExitAllowanceMinutes || 15);

    // Scheduled Shift times
    const [startH, startM] = (shift.startTime || '09:00').split(':').map(Number);
    const [endH, endM] = (shift.endTime || '17:00').split(':').map(Number);
    const scheduledStartMins = startH * 60 + startM;
    let scheduledEndMins = endH * 60 + endM;

    const isOvernightConfigured = shift.isOvernight || scheduledEndMins < scheduledStartMins;
    if (isOvernightConfigured && scheduledEndMins <= scheduledStartMins) {
        scheduledEndMins += 24 * 60; // Crosses midnight
    }

    let status = 'Absent';
    let completionStatus = 'NONE';
    let durationMinutes = 0;
    let workedHours = 0;
    let lateMinutes = 0;
    let earlyExitMinutes = 0;
    let isLate = false;
    let isEarlyExit = false;
    let overtimeHours = 0;
    let overtimeMinutes = 0;

    // CASE 1: Both IN and OUT timestamps exist -> COMPLETED
    if (hasIn && hasOut) {
        let actualOutMins = outMins;

        // Check if out time crossed midnight (either configured as overnight shift or out time is earlier than in time)
        if (actualOutMins < inMins || isOvernightConfigured) {
            if (actualOutMins <= inMins) {
                actualOutMins += 24 * 60; // Overnight shift crossing midnight
            }
        }

        const rawElapsedMins = Math.max(1, actualOutMins - inMins);
        durationMinutes = Math.max(1, rawElapsedMins - breakDuration);
        workedHours = parseFloat((durationMinutes / 60).toFixed(2));

        status = 'COMPLETED';
        completionStatus = 'COMPLETED';

        // Check Late Arrival (excluding grace period per specification)
        const lateDetectionActive = shift.lateDetectionEnabled !== false;
        if (lateDetectionActive && inMins > (scheduledStartMins + gracePeriod)) {
            isLate = true;
            lateMinutes = Math.max(1, inMins - (scheduledStartMins + gracePeriod));
        }

        // Check Early Exit
        if (actualOutMins < (scheduledEndMins - earlyAllowance)) {
            isEarlyExit = true;
            earlyExitMinutes = Math.max(0, scheduledEndMins - actualOutMins);
        }

        // Overtime Calculation
        if (shift.overtimeEnabled && workedHours > expectedHours) {
            const rawOtHours = parseFloat((workedHours - expectedHours).toFixed(2));
            const rawOtMins = Math.round(rawOtHours * 60);
            if (rawOtMins >= (shift.minOvertimeMinutes || 30)) {
                overtimeHours = parseFloat((rawOtHours * (shift.overtimeMultiplier || 1.0)).toFixed(2));
                overtimeMinutes = Math.round(overtimeHours * 60);
            }
        }
    } 
    // CASE 2: Only IN exists, OUT is missing
    else if (hasIn && !hasOut) {
        // Late arrival evaluation on clock-in (excluding grace period)
        const lateDetectionActive = shift.lateDetectionEnabled !== false;
        if (lateDetectionActive && inMins > (scheduledStartMins + gracePeriod)) {
            isLate = true;
            lateMinutes = Math.max(1, inMins - (scheduledStartMins + gracePeriod));
        }

        if (isToday) {
            status = 'IN PROGRESS';
            completionStatus = 'IN_PROGRESS';
        } else {
            // Shift occurred in the past and employee forgot to scan OUT
            status = 'MISSING OUT';
            completionStatus = 'MISSING_OUT';
        }
    } 
    // CASE 3: Neither IN nor OUT exists
    else {
        // Check if record date is a weekly off day
        if (recordDate) {
            const d = new Date(recordDate);
            if (!isNaN(d.getTime())) {
                const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(d);
                if (Array.isArray(shift.weeklyOffDays) && shift.weeklyOffDays.includes(dayName)) {
                    status = 'Weekly Off';
                    completionStatus = 'WEEKLY_OFF';
                } else {
                    status = 'Absent';
                    completionStatus = 'ABSENT';
                }
            } else {
                status = 'Absent';
                completionStatus = 'ABSENT';
            }
        } else {
            status = 'Absent';
            completionStatus = 'ABSENT';
        }
    }

    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    const formattedDuration = durationMinutes > 0 ? `${h}h ${m}m` : (status === 'IN PROGRESS' ? 'In Progress' : '--');

    return {
        status,
        completionStatus,
        isCompleted: completionStatus === 'COMPLETED',
        isActiveShift: completionStatus === 'IN_PROGRESS',
        isMissingOut: completionStatus === 'MISSING_OUT',
        durationMinutes,
        workedHours,
        formattedDuration,
        isLate,
        lateMinutes,
        isEarlyExit,
        earlyExitMinutes,
        overtimeHours,
        overtimeMinutes,
        breakDuration,
        expectedHours,
        shiftName: shift.name,
        shiftCode: shift.code
    };
};

/**
 * Unified status badge styling for UI components
 */
const getUnifiedShiftStatusMeta = (status, hasOut = false, isActive = false) => {
    const raw = (status || '').trim().toUpperCase();

    if (raw === 'COMPLETED' || hasOut) {
        return {
            label: 'COMPLETED',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
            badgeBg: 'bg-emerald-600 text-white'
        };
    }
    if (raw === 'IN PROGRESS' || isActive) {
        return {
            label: 'IN PROGRESS',
            color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
            badgeBg: 'bg-blue-600 text-white'
        };
    }
    if (raw === 'MISSING OUT' || raw === 'MISSING_OUT') {
        return {
            label: 'MISSING OUT',
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
            badgeBg: 'bg-amber-600 text-white'
        };
    }
    if (raw === 'HALF DAY') {
        return {
            label: 'HALF DAY',
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
            badgeBg: 'bg-amber-500 text-white'
        };
    }
    if (raw === 'WEEKLY OFF') {
        return {
            label: 'WEEKLY OFF',
            color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
            badgeBg: 'bg-slate-600 text-white'
        };
    }
    if (raw === 'LEAVE') {
        return {
            label: 'LEAVE',
            color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
            badgeBg: 'bg-purple-600 text-white'
        };
    }
    if (raw === 'HOLIDAY') {
        return {
            label: 'HOLIDAY',
            color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50',
            badgeBg: 'bg-sky-600 text-white'
        };
    }
    return {
        label: 'ABSENT',
        color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
        badgeBg: 'bg-rose-600 text-white'
    };
};

module.exports = {
    DEFAULT_FALLBACK_SHIFT,
    resolveEmployeeShift,
    parseTimeToMinutes,
    calculateShiftAttendance,
    getUnifiedShiftStatusMeta
};
