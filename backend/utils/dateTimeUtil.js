/**
 * INDUSTRIAL DATE & TIME UTILITY (Asia/Kolkata - IST)
 * Guarantees standard timezone calculations across Web, Android APK, and Cloud servers.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current date or specified date formatted as YYYY-MM-DD in Asia/Kolkata
 */
const getISTDate = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(d);
};

/**
 * Returns current time or specified time formatted as 24-hour HH:mm in Asia/Kolkata
 */
const getISTTimeString = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '09:00';
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(d);
};

/**
 * Returns current time or specified time formatted as 24-hour HH:mm:ss in Asia/Kolkata
 */
const getISTFullTimeString = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '09:00:00';
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(d);
};

/**
 * Returns human-readable 12-hour formatted time with AM/PM (e.g. 09:00 AM) in Asia/Kolkata
 */
const formatISTDisplay = (date = new Date(), includeSeconds = false) => {
    if (!date) return '--';

    // If already formatted with AM/PM, return as-is to prevent double formatting
    if (typeof date === 'string' && (date.includes('AM') || date.includes('PM'))) {
        return date.trim();
    }

    // If in 24-hour HH:mm string format without date part
    if (typeof date === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(date.trim())) {
        const parts = date.trim().split(':');
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

    const d = date instanceof Date ? date : new Date(date);
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
};

/**
 * Reconciles stored attendance time strings with authoritative biometric UTC timestamps
 * Guarantees IST output without altering the database.
 */
const normalizeAttendanceTime = (timeVal, biometricDate = null) => {
    if (biometricDate) {
        const d = biometricDate instanceof Date ? biometricDate : new Date(biometricDate);
        if (!isNaN(d.getTime())) {
            return getISTTimeString(d);
        }
    }

    if (!timeVal) return '';

    // If ISO timestamp string or Date object
    if (timeVal instanceof Date || (typeof timeVal === 'string' && (timeVal.includes('T') || timeVal.includes('Z')))) {
        const d = timeVal instanceof Date ? timeVal : new Date(timeVal);
        if (!isNaN(d.getTime())) {
            return getISTTimeString(d);
        }
    }

    // If HH:mm or HH:mm:ss format
    if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}/.test(timeVal.trim())) {
        const [h, m] = timeVal.trim().split(':');
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return String(timeVal).trim();
};

/**
 * Calculate worked hours and minutes difference between two Date objects or time strings
 */
const calculateDuration = (startTime, endTime, breakMinutes = 0) => {
    if (!startTime) return { minutes: 0, hours: 0, formatted: '--' };

    let startMs = 0;
    let endMs = 0;

    if (startTime instanceof Date || (typeof startTime === 'string' && startTime.includes('T'))) {
        startMs = new Date(startTime).getTime();
        endMs = endTime ? new Date(endTime).getTime() : Date.now();
    } else if (typeof startTime === 'string' && startTime.includes(':')) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime ? endTime.split(':').map(Number) : [sh + 8, sm];
        startMs = (sh * 60 + sm) * 60000;
        endMs = (eh * 60 + em) * 60000;
    }

    if (endMs < startMs) {
        // Handles overnight shift crossing midnight
        endMs += 24 * 60 * 60000;
    }

    const totalMinutes = Math.max(0, Math.round((endMs - startMs) / 60000) - Number(breakMinutes || 0));
    const hours = parseFloat((totalMinutes / 60).toFixed(2));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const formatted = `${h}h ${m}m`;

    return { minutes: totalMinutes, hours, formatted };
};

module.exports = {
    TIMEZONE,
    getISTDate,
    getISTTimeString,
    getISTFullTimeString,
    formatISTDisplay,
    formatTimeIST: formatISTDisplay,
    formatDateIST: getISTDate,
    calculateDuration,
    normalizeAttendanceTime
};
