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
 * Format Duration in minutes into human-readable hours and minutes (e.g. 8h 30m)
 */
export const formatDurationMinutes = (minutes) => {
    if (!minutes || isNaN(minutes) || Number(minutes) <= 0) return '--';
    const m = Math.round(Number(minutes));
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    return `${hours}h ${mins}m`;
};

/**
 * Format Attendance status badge styling and label
 */
export const getUnifiedAttendanceStatus = (status, checkOut, durationMinutes = 0, isActiveShift = false) => {
    const rawStatus = (status || '').trim();

    if (rawStatus === 'Absent') {
        return { label: 'Absent', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50' };
    }
    if (rawStatus === 'Leave') {
        return { label: 'Leave', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50' };
    }
    if (rawStatus === 'Holiday') {
        return { label: 'Holiday', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50' };
    }

    if (isActiveShift || (!checkOut && rawStatus === 'Present')) {
        return { label: 'Present (In Progress)', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50' };
    }

    if (rawStatus === 'Half Day' || (durationMinutes > 0 && durationMinutes < 450 && durationMinutes >= 240)) {
        return { label: 'Half Day', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' };
    }

    if (rawStatus === 'Present' || durationMinutes >= 450) {
        return { label: 'Full Day', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50' };
    }

    return { label: rawStatus || 'Present', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
};
