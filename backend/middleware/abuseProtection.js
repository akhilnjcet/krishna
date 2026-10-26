const rateLimit = require('express-rate-limit');
const { logRateLimit, logBotBlocked, logScrapingDetected, getClientIp } = require('../utils/securityLogger');

// ─── Known Malicious, Automated Tool, and Scraper User-Agent Signatures ───────
const BAD_BOT_USER_AGENTS = [
    // Scrapers & automated HTTP clients
    /scrapy/i,
    /aiohttp/i,
    /python-requests/i,
    /python-urllib/i,
    /httpclient/i,
    /libwww-perl/i,
    /mechanize/i,
    /go-http-client/i,
    /apache-httpclient/i,
    /java\//i,
    // Headless automated browsers used in web scraping & credential stuffing
    /phantomjs/i,
    /headlesschrome/i,
    /selenium/i,
    /puppeteer/i,
    // Vulnerability & security scanners
    /sqlmap/i,
    /nikto/i,
    /wpscan/i,
    /dirbuster/i,
    /gobuster/i,
    /masscan/i,
    /zgrab/i,
    /nmap/i,
    /jorgee/i,
    /webshag/i,
    /havij/i,
    /acunetix/i,
    /nessus/i
];

// Production-only CLI scrapers (allowed in development for developer curl/testing)
const CLI_SCRAPERS_PROD = [
    /^curl\//i,
    /^wget\//i,
    /^powershell\//i
];

// ─── Rapid Scraping Sliding-Window Tracker ───────────────────────────────────
// Map: ip -> Array of request timestamps (ms)
const scrapingHistory = new Map();
const SCRAPING_WINDOW_MS = 30 * 1000; // 30 seconds
const MAX_SCRAPE_REQUESTS_IN_WINDOW = 50; // max 50 requests in 30s to content endpoints

// ─── Rate Limiters ──────────────────────────────────────────────────────────

/**
 * 1. Global API Rate Limiter
 * Applied to all /api/ endpoints to prevent denial-of-service and crawling.
 * Window: 15 minutes, Max: 300 requests per IP (~20 requests / min sustained).
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Global API rate limit reached (300 req / 15 min)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many API requests from this IP address. Please slow down and try again after 15 minutes.'
        });
    }
});

/**
 * 2. Login & Authentication Rate Limiter
 * Applied to /api/auth/login, /api/auth/verify-face, /api/auth/login-otp/verify.
 * Window: 15 minutes, Max: 10 attempts per IP.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Authentication brute-force limit reached (10 attempts / 15 min)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many failed login attempts from this network. Please wait 15 minutes before trying again.'
        });
    }
});

/**
 * 3. Tenant Room PIN Access Limiter
 * Applied to /api/bookings/verify-access.
 * Window: 15 minutes, Max: 10 PIN verification attempts per IP.
 */
const tenantPinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Tenant PIN brute-force limit reached (10 attempts / 15 min)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many invalid PIN attempts. Access locked for 15 minutes.'
        });
    }
});

/**
 * 4. Account Registration & Creation Limiter
 * Applied to /api/auth/register and /api/auth/admin/users.
 * Window: 1 hour, Max: 5 account creations per IP.
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Account creation rate limit reached (5 registrations / 1 hr)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many account creation attempts from this network. Please try again in an hour.'
        });
    }
});

/**
 * 5. Password Reset & OTP Request Limiter
 * Applied to /api/auth/forgot-password, /api/auth/reset-password, OTP routes.
 * Window: 15 minutes, Max: 5 requests per IP.
 */
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'OTP/Reset verification limit reached (5 requests / 15 min)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many OTP requests or reset attempts. Please wait 15 minutes before requesting a new code.'
        });
    }
});

/**
 * 6. AI Generation Request Limiter
 * Applied to /api/chat. Protects costly LLM API quotas (Groq/Gemini).
 * Window: 10 minutes, Max: 15 AI requests per IP.
 */
const aiGenerationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'AI Assistant generation rate limit reached (15 prompts / 10 min)' });
        res.status(429).json({
            error: 'AI Quota Exceeded',
            message: 'You have reached the AI assistant message limit. Please wait a few minutes before sending another prompt.'
        });
    }
});

/**
 * 7. AI Generation Burst Limiter
 * Prevents automated looping scripts from firing rapid concurrent prompts.
 * Window: 15 seconds, Max: 3 prompts per IP.
 */
const aiBurstLimiter = rateLimit({
    windowMs: 15 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'AI generation burst limit reached (3 prompts / 15s)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Please wait a moment before sending another message to the AI assistant.'
        });
    }
});

/**
 * 8. Public Lead & Form Submission Limiter
 * Applied to /api/lead and public contact forms.
 * Window: 15 minutes, Max: 10 submissions per IP.
 */
const publicSubmissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Public contact/lead form submission limit reached (10 submissions / 15 min)' });
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many form submissions received. Please wait 15 minutes before submitting again.'
        });
    }
});

/**
 * 9. Content & Data Scraping Limiter
 * Applied to public read-heavy routes (/api/portfolio, /api/blog, /api/rooms).
 * Window: 1 minute, Max: 60 requests per IP.
 */
const contentScrapingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logRateLimit(req, { message: 'Content scraper limit reached (60 req / 1 min)' });
        res.status(429).json({
            error: 'Scraping Throttled',
            message: 'Automated data harvesting detected. Request throttled.'
        });
    }
});

// ─── Bot & Automated Script Filtering Middleware ────────────────────────────

/**
 * Inspects incoming User-Agent headers to detect and block automated bots,
 * vulnerability scanners, headless scrapers, and scripts without valid browser headers.
 */
const preventBadBots = (req, res, next) => {
    const userAgent = (req.headers && req.headers['user-agent']) || '';
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Browsers and legitimate clients always send a User-Agent.
    // In production, block API requests completely missing a User-Agent.
    if (!userAgent.trim()) {
        if (isProduction && (req.originalUrl || req.url || '').startsWith('/api/')) {
            logBotBlocked(req, {
                pattern: 'EMPTY_USER_AGENT',
                reason: 'API request rejected due to missing User-Agent header (automated script signature)'
            });
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: Legitimate client User-Agent header is required.'
            });
        }
        return next();
    }

    // 2. Check known bad bot / scraper signatures
    for (const regex of BAD_BOT_USER_AGENTS) {
        if (regex.test(userAgent)) {
            logBotBlocked(req, {
                pattern: regex.source,
                reason: `Blocked automated scraper/scanner User-Agent matching: ${regex.source}`
            });
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied: Automated scraping or vulnerability scanning tools are prohibited.'
            });
        }
    }

    // 3. In production, block CLI downloaders on public API data endpoints
    if (isProduction) {
        for (const regex of CLI_SCRAPERS_PROD) {
            if (regex.test(userAgent)) {
                logBotBlocked(req, {
                    pattern: regex.source,
                    reason: `Blocked CLI client (${userAgent}) from public API endpoints in production`
                });
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Automated command-line requests are disallowed on this interface.'
                });
            }
        }
    }

    next();
};

/**
 * Honeypot Trap Middleware
 * Detects automated spambots filling hidden honeypot fields on public submission endpoints.
 */
const honeypotProtection = (req, res, next) => {
    if (req.method === 'POST' && req.body && typeof req.body === 'object') {
        // Honeypot fields that legitimate frontend forms never render or populate
        const honeypotFields = ['_hp_website', 'company_fax_hp', 'honeypot_trap', 'bot_check_token'];
        for (const field of honeypotFields) {
            if (req.body[field] && String(req.body[field]).trim().length > 0) {
                logBotBlocked(req, {
                    pattern: `HONEYPOT_FIELD_${field}`,
                    reason: `Automated spam bot triggered honeypot field "${field}"`
                });
                // Return generic 400 Bad Request to halt bot without leaking implementation details
                return res.status(400).json({
                    error: 'Submission Rejected',
                    message: 'Automated submission detected.'
                });
            }
        }
    }
    next();
};

/**
 * Automated Rapid Content Scraping Detector
 * Monitors sustained rapid read bursts across public data routes.
 */
const detectRapidScraping = (req, res, next) => {
    if (req.method !== 'GET') return next();

    const ip = getClientIp(req);
    const now = Date.now();

    let history = scrapingHistory.get(ip) || [];
    history = history.filter(ts => (now - ts) < SCRAPING_WINDOW_MS);
    history.push(now);
    scrapingHistory.set(ip, history);

    if (history.length > MAX_SCRAPE_REQUESTS_IN_WINDOW) {
        logScrapingDetected(req, {
            endpoint: req.originalUrl || req.url,
            requestCount: history.length,
            timeWindowSec: SCRAPING_WINDOW_MS / 1000
        });

        return res.status(429).json({
            error: 'Scraping Detected',
            message: 'Excessive rapid requests detected. Automated data extraction is prohibited. Please slow down.'
        });
    }

    next();
};

module.exports = {
    // Rate limiters
    apiLimiter,
    loginLimiter,
    tenantPinLimiter,
    registerLimiter,
    otpLimiter,
    aiGenerationLimiter,
    aiBurstLimiter,
    publicSubmissionLimiter,
    contentScrapingLimiter,
    // Bot & scraper detection
    preventBadBots,
    honeypotProtection,
    detectRapidScraping
};
