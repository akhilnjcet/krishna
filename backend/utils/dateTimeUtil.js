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
    calculateDuration
};
