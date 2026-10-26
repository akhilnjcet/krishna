const { logSuspiciousTraffic, logEvent, getClientIp } = require('../utils/securityLogger');

// Regular expressions for detecting suspicious patterns and probing attempts
const SUSPICIOUS_PATH_PATTERNS = [
    { pattern: 'Path Traversal', regex: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f)/i },
    { pattern: 'Sensitive Environment / Git Probing', regex: /(\/\.env(\.|\/|$)|(\/\.git(\/|$))|(\/\.aws(\/|$))|(\/\.svn(\/|$)))/i },
    { pattern: 'CMS / Admin Scanner Probing', regex: /(\/wp-admin|\/wp-login|\/wp-includes|\/xmlrpc\.php|\/phpmyadmin|\/pma|\/adminer)/i },
    { pattern: 'System File Probing', regex: /(\/etc\/passwd|\/etc\/shadow|\/proc\/self|\/web\.config|\/cgi-bin)/i },
    { pattern: 'Framework Actuator / Debug Probing', regex: /(\/actuator|\/debug\/pprof|\/solr\/|\/swagger-ui\.html)/i }
];

const SUSPICIOUS_QUERY_PATTERNS = [
    { pattern: 'Cross-Site Scripting (XSS) Injection', regex: /(<script|javascript:|onerror\s*=|onload\s*=|eval\(|document\.cookie)/i },
    { pattern: 'NoSQL Operator Injection in Query', regex: /[$](where|regex|gt|gte|lt|lte|ne|nin)\b/i }
];

/**
 * Enforce HTTPS in production environments
 */
const enforceHttps = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        const proto = req.headers['x-forwarded-proto'];
        if (proto && proto.toLowerCase() !== 'https') {
            const host = req.headers.host;
            return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
        }
    }
    next();
};

/**
 * Detect and block suspicious probing, directory traversal, and vulnerability scanner traffic
 */
const detectSuspiciousTraffic = (req, res, next) => {
    const rawUrl = req.originalUrl || req.url || '';
    const decodedUrl = decodeURIComponent(rawUrl).toLowerCase();

    // 1. Check path against known scanner probing signatures
    for (const { pattern, regex } of SUSPICIOUS_PATH_PATTERNS) {
        if (regex.test(decodedUrl)) {
            logSuspiciousTraffic(req, {
                pattern,
                details: `Requested URL matched signature: ${rawUrl}`,
                severity: 'CRITICAL'
            });
            return res.status(403).json({
                error: 'Security Violation',
                message: 'Malformed or unauthorized probe pattern rejected by Krishna Security Engine.'
            });
        }
    }

    // 2. Check query string against injection signatures
    const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
    if (queryString) {
        for (const { pattern, regex } of SUSPICIOUS_QUERY_PATTERNS) {
            if (regex.test(queryString)) {
                logSuspiciousTraffic(req, {
                    pattern,
                    details: `Query string matched injection pattern: ${queryString}`,
                    severity: 'WARN'
                });
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Potentially dangerous characters detected in query parameters.'
                });
            }
        }
    }

    // 3. Monitor response outcome for security-relevant status codes
    const startHrTime = process.hrtime();
    res.on('finish', () => {
        const statusCode = res.statusCode;
        const [seconds, nanoseconds] = process.hrtime(startHrTime);
        const durationMs = Math.round((seconds * 1000) + (nanoseconds / 1000000));

        // Log 401 & 403 authorization failures on API endpoints
        if ((statusCode === 401 || statusCode === 403) && rawUrl.startsWith('/api/') && !rawUrl.startsWith('/api/auth/login')) {
            const ip = getClientIp(req);
            logEvent({
                eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
                severity: statusCode === 403 ? 'WARN' : 'INFO',
                ip,
                userId: req.user?._id || req.user?.id || null,
                role: req.user?.role || 'unauthenticated',
                method: req.method,
                path: rawUrl,
                statusCode,
                userAgent: req.headers['user-agent'],
                reason: statusCode === 403 ? 'Access forbidden (insufficient role privileges)' : 'Missing or invalid authentication token',
                metadata: { durationMs }
            });
        }
    });

    next();
};

module.exports = {
    enforceHttps,
    detectSuspiciousTraffic
};
