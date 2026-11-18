/**
 * KRISHNA ERP - UNIFIED DATE & TIME FORMATTING (Asia/Kolkata - IST)
 * Standardizes time presentation across Web, Android APK, and Desktop.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Format a Date object or ISO timestamp string into IST 12-hour format with AM/PM
 * Example: 08:59:54 AM or 08:59 AM
 */
export const formatTimeIST = (timeInput, includeSeconds = true) => {
    if (!timeInput) return '--';

    // If already formatted with AM/PM, return as-is to prevent double timezone conversion
    if (typeof timeInput === 'string' && (timeInput.includes('AM') || timeInput.includes('PM'))) {
        return timeInput.trim();
    }

    // If already in 24-hour string format 'HH:mm' or 'HH:mm:ss'
    if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeInput.trim())) {
        const parts = timeInput.trim().split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const s = parts[2] ? parseInt(parts[2], 10) : 0;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        if (includeSeconds && parts.length > 2) {
            return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
        }
        return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    try {
        const d = timeInput instanceof Date ? timeInput : new Date(timeInput);
        if (isNaN(d.getTime())) return '--';

        const options = {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        if (includeSeconds) {
            options.second = '2-digit';
        }
        return new Intl.DateTimeFormat('en-US', options).format(d);
    } catch (e) {
        return '--';
    }
};

/**
 * Format Date to standard human-readable date & time in Asia/Kolkata
 * Example: 17 Nov 2026, 08:59 AM
 */
export const formatDateTimeIST = (dateInput = new Date(), includeSeconds = false) => {
    if (!dateInput) return '--';
    try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return '--';

        const options = {
            timeZone: TIMEZONE,
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        if (includeSeconds) {
            options.second = '2-digit';
        }
        return new Intl.DateTimeFormat('en-IN', options).format(d);
    } catch (e) {
        return '--';
    }
};

/**
 * Format Date to standard YYYY-MM-DD in Asia/Kolkata
 */
export const formatDateIST = (dateInput = new Date()) => {
    try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
    } catch (e) {
        return '';
    }
};

/**
 * Parse any time representation (Date, ISO string, HH:mm, or 12-hour AM/PM string) into total minutes from 00:00
 */
export const parseTimeToMinutes = (timeVal) => {
    if (!timeVal) return null;

    if (timeVal instanceof Date) {
        const istStr = getISTTimeString(timeVal);
        const [h, m] = istStr.split(':').map(Number);
        return h * 60 + m;
    }

    if (typeof timeVal === 'string') {
        const trimmed = timeVal.trim();
        if (trimmed === '--' || trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;

        if (trimmed.includes('T') || trimmed.includes('Z')) {
            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                const istStr = getISTTimeString(d);
                const [h, m] = istStr.split(':').map(Number);
                return h * 60 + m;
            }
        }

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

        if (/^\d{1,2}:\d{2}/.test(trimmed)) {
            const [h, m] = trimmed.split(':').map(Number);
            return h * 60 + m;
        }
    }

    return null;
};

/**
 * Accurately calculate duration in minutes between IN and OUT timestamps, supporting overnight shifts crossing midnight
 */
export const calculateOvernightDuration = (inTime, outTime, breakMins = 0) => {
    const inMins = parseTimeToMinutes(inTime);
    const outMins = parseTimeToMinutes(outTime);

    if (inMins === null || outMins === null) return 0;

    let actualOutMins = outMins;
    if (actualOutMins <= inMins) {
        actualOutMins += 24 * 60; // Overnight shift crossing midnight
    }

    const rawDiff = actualOutMins - inMins;
    const netMins = Math.max(1, rawDiff - Number(breakMins || 0));
    return netMins;
};

/**
 * Format Duration in minutes into human-readable hours and minutes (e.g. 8h 30m).
 * If minutes is 0 but valid inTime and outTime exist, dynamically computes overnight duration so it never shows '--'!
 */
export const formatDurationMinutes = (minutes, inTime = null, outTime = null, breakMins = 0) => {
    let m = Number(minutes);
    if ((!m || isNaN(m) || m <= 0) && inTime && outTime && outTime !== '--' && inTime !== '--') {
        m = calculateOvernightDuration(inTime, outTime, breakMins);
    }

    if (!m || isNaN(m) || m <= 0) return '--';
    const rounded = Math.round(m);
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return `${hours}h ${mins}m`;
};

/**
 * Unified Attendance Status resolver:
 * 1. If both IN and OUT timestamps exist: ALWAYS marks COMPLETED (never IN PROGRESS).
 * 2. If only IN exists and date is today (or active): IN PROGRESS.
 * 3. If only IN exists and date is in the past: MISSING OUT.
 * 4. If neither timestamp exists: Absent / Weekly Off / Leave / Holiday.
 */
export const getUnifiedAttendanceStatus = (status, checkOut, durationMinutes = 0, isActiveShift = false, checkIn = null, recordDate = null) => {
    const rawStatus = (status || '').trim();

    const hasValidOut = !!(checkOut && checkOut !== '--' && String(checkOut).trim() !== '' && String(checkOut).trim() !== 'null' && String(checkOut).trim() !== 'undefined');
    const hasValidIn = !!(checkIn && checkIn !== '--' && String(checkIn).trim() !== '' && String(checkIn).trim() !== 'null' && String(checkIn).trim() !== 'undefined');

    // Categorical statuses that don't depend on timestamps
    if (rawStatus === 'Leave') {
        return { label: 'Leave', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50' };
    }
    if (rawStatus === 'Holiday') {
        return { label: 'Holiday', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50' };
    }
    if (rawStatus === 'Weekly Off' || rawStatus === 'WEEKLY_OFF') {
        return { label: 'Weekly Off', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    }

    // MANDATORY RULE 1: If an attendance record contains both IN and OUT timestamps, mark it as COMPLETED!
    // NEVER display IN PROGRESS when a valid OUT timestamp exists!
    if (hasValidOut || rawStatus === 'Completed' || rawStatus === 'COMPLETED') {
        if (rawStatus === 'Half Day') {
            return { label: 'Half Day', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' };
        }
        return { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50' };
    }

    // MANDATORY RULE 2: If only IN exists and OUT is missing:
    // If active shift or today's date -> IN PROGRESS
    if (isActiveShift || rawStatus === 'In Progress' || rawStatus === 'IN PROGRESS') {
        return { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50' };
    }

    // If past date with missing OUT -> MISSING OUT
    if (rawStatus === 'Missing Out' || rawStatus === 'MISSING_OUT' || (hasValidIn && !hasValidOut)) {
        return { label: 'Missing Out', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' };
    }

    // MANDATORY RULE 3: If neither exists, do not mark employee present
    if (rawStatus === 'Absent' || rawStatus === 'ABSENT' || (!hasValidIn && !hasValidOut)) {
        return { label: 'Absent', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50' };
    }

    if (rawStatus === 'Half Day') {
        return { label: 'Half Day', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' };
    }

    return { label: rawStatus || 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50' };
};
