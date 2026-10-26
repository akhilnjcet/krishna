const mongoose = require('mongoose');

// In-memory sliding window maps for detecting rapid suspicious patterns per IP
// Map: ip -> Array of timestamps (ms)
const ipFailureHistory = new Map();
const ipProbeHistory = new Map();

// Configuration
const FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILURES_BEFORE_ALERT = 5;
const PROBE_WINDOW_MS = 5 * 60 * 1000;    // 5 minutes
const MAX_PROBES_BEFORE_ALERT = 3;

/**
 * Safely extract the real client IP address from request headers or socket
 */
const getClientIp = (req) => {
    if (!req) return '0.0.0.0';
    const xForwardedFor = req.headers && req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0';
};

/**
 * Mask sensitive strings (emails, usernames) for privacy in logs
 */
const maskIdentifier = (str) => {
    if (!str || typeof str !== 'string') return 'anonymous';
    const trimmed = str.trim();
    if (trimmed.includes('@')) {
        const [local, domain] = trimmed.split('@');
        if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
        return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
    }
    if (trimmed.length <= 4) return '***';
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
};

/**
 * Clean sliding window timestamps
 */
const cleanSlidingWindow = (timestamps, windowMs) => {
    const now = Date.now();
    return timestamps.filter(ts => (now - ts) < windowMs);
};

/**
 * Write security log to MongoDB asynchronously (non-blocking)
 */
const persistSecurityLog = async (logData) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const SecurityAuditLog = require('../models/SecurityAuditLog');
            await SecurityAuditLog.create(logData);
        }
    } catch (err) {
        // Fallback to console if DB write fails to guarantee log preservation
        console.error('[SECURITY_LOGGER_INTERNAL_ERROR] Failed to save audit record to MongoDB:', err.message);
    }
};

/**
 * Main logging function
 */
const logEvent = (eventData) => {
    const timestamp = new Date().toISOString();
    const severity = eventData.severity || 'INFO';
    const prefix = severity === 'CRITICAL' ? '🚨 [SECURITY_ALERT]' : severity === 'WARN' ? '⚠️ [SECURITY_WARN]' : '🛡️ [SECURITY_AUDIT]';

    console.log(
        `${prefix} [${timestamp}] [${eventData.eventType}] IP=${eventData.ip} ID=${eventData.identifier || 'none'} ` +
        `METHOD=${eventData.method || '-'} PATH=${eventData.path || '-'} STATUS=${eventData.statusCode || '-'} ` +
        `REASON="${eventData.reason || 'OK'}"`
    );

    // Save asynchronously to database
    persistSecurityLog({
        ...eventData,
        timestamp: new Date()
    });
};

/**
 * Track authentication failure and trigger brute-force alert if threshold exceeded
 */
const trackAuthFailure = (ip, identifier) => {
    const now = Date.now();
    let history = ipFailureHistory.get(ip) || [];
    history = cleanSlidingWindow(history, FAILURE_WINDOW_MS);
    history.push(now);
    ipFailureHistory.set(ip, history);

    if (history.length === MAX_FAILURES_BEFORE_ALERT) {
        logEvent({
            eventType: 'BRUTE_FORCE_TRIGGERED',
            severity: 'CRITICAL',
            ip,
            identifier,
            reason: `IP reached ${MAX_FAILURES_BEFORE_ALERT} consecutive failed authentication attempts in ${FAILURE_WINDOW_MS / 60000} minutes`,
            metadata: { totalFailuresInWindow: history.length }
        });
    }
};

/**
 * Track suspicious scanning/probing and trigger scanner alert if threshold exceeded
 */
const trackProbeAttempt = (ip, path, pattern) => {
    const now = Date.now();
    let history = ipProbeHistory.get(ip) || [];
    history = cleanSlidingWindow(history, PROBE_WINDOW_MS);
    history.push(now);
    ipProbeHistory.set(ip, history);

    if (history.length >= MAX_PROBES_BEFORE_ALERT) {
        logEvent({
            eventType: 'SUSPICIOUS_PROBE',
            severity: 'CRITICAL',
            ip,
            path,
            reason: `Repeated scanner probes detected: ${history.length} malformed/vulnerability scanner attempts in ${PROBE_WINDOW_MS / 60000} minutes`,
            metadata: { lastPatternMatched: pattern, totalProbesInWindow: history.length }
        });
    }
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Log successful authentication (login, OTP verify, face verify)
 */
const logAuthSuccess = (req, { identifier, userId, role }) => {
    const ip = getClientIp(req);
    // Reset failure counter on successful authentication
    ipFailureHistory.delete(ip);

    logEvent({
        eventType: 'AUTH_LOGIN_SUCCESS',
        severity: 'INFO',
        ip,
        identifier: maskIdentifier(identifier),
        userId: userId || null,
        role: role || 'user',
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode: 200,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: 'Valid credentials provided'
    });
};

/**
 * Log failed authentication attempt
 */
const logAuthFailure = (req, { identifier, reason = 'Invalid credentials', statusCode = 401 }) => {
    const ip = getClientIp(req);
    trackAuthFailure(ip, maskIdentifier(identifier));

    logEvent({
        eventType: statusCode === 423 ? 'AUTH_LOCKOUT' : 'AUTH_LOGIN_FAILED',
        severity: statusCode === 423 ? 'CRITICAL' : 'WARN',
        ip,
        identifier: maskIdentifier(identifier),
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason
    });
};

/**
 * Log tenant room access (success or failure)
 */
const logTenantAccess = (req, { roomNumber, success, reason }) => {
    const ip = getClientIp(req);
    if (!success) {
        trackAuthFailure(ip, `Room ${roomNumber}`);
    }

    logEvent({
        eventType: success ? 'TENANT_ACCESS_SUCCESS' : 'TENANT_ACCESS_FAILED',
        severity: success ? 'INFO' : 'WARN',
        ip,
        identifier: `Room-${roomNumber}`,
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode: success ? 200 : 401,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: reason || (success ? 'PIN matched active tenant booking' : 'Invalid PIN')
    });
};

/**
 * Log suspicious scanning / probing traffic pattern
 */
const logSuspiciousTraffic = (req, { pattern, details, severity = 'WARN' }) => {
    const ip = getClientIp(req);
    const path = req?.originalUrl || req?.url || 'unknown';
    trackProbeAttempt(ip, path, pattern);

    logEvent({
        eventType: 'SUSPICIOUS_PROBE',
        severity,
        ip,
        method: req?.method,
        path,
        statusCode: 400,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: `Matched suspicious pattern: ${pattern}`,
        metadata: { details }
    });
};

/**
 * Log API errors (500, unhandled exceptions)
 */
const logApiError = (req, error, { statusCode = 500 } = {}) => {
    const ip = getClientIp(req);
    const user = req?.user;

    logEvent({
        eventType: 'API_SERVER_ERROR',
        severity: 'CRITICAL',
        ip,
        userId: user?._id || user?.id || null,
        role: user?.role || null,
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: error?.message || 'Internal Server Error',
        metadata: {
            name: error?.name,
            stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
        }
    });
};

/**
 * Log rate limit violations
 */
const logRateLimit = (req, { message = 'Rate limit exceeded' }) => {
    const ip = getClientIp(req);
    logEvent({
        eventType: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARN',
        ip,
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode: 429,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: message
    });
};

/**
 * Log automated bot / scraper blocked
 */
const logBotBlocked = (req, { pattern, reason = 'Automated bot / scraper client detected and blocked' }) => {
    const ip = getClientIp(req);
    logEvent({
        eventType: 'BOT_BLOCKED',
        severity: 'WARN',
        ip,
        method: req?.method,
        path: req?.originalUrl || req?.url,
        statusCode: 403,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason,
        metadata: { matchedPattern: pattern }
    });
};

/**
 * Log automated rapid data scraping pattern
 */
const logScrapingDetected = (req, { endpoint, requestCount, timeWindowSec }) => {
    const ip = getClientIp(req);
    logEvent({
        eventType: 'SCRAPING_DETECTED',
        severity: 'CRITICAL',
        ip,
        method: req?.method,
        path: endpoint || req?.originalUrl || req?.url,
        statusCode: 429,
        userAgent: req?.headers ? req.headers['user-agent'] : null,
        reason: `Aggressive scraping detected: ${requestCount} requests within ${timeWindowSec}s window`,
        metadata: { requestCount, timeWindowSec }
    });
};

module.exports = {
    getClientIp,
    maskIdentifier,
    logAuthSuccess,
    logAuthFailure,
    logTenantAccess,
    logSuspiciousTraffic,
    logApiError,
    logRateLimit,
    logBotBlocked,
    logScrapingDetected,
    logEvent
};

