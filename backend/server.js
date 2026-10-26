require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Trust Vercel / reverse proxy X-Forwarded-For so rate limiter uses the real client IP
// Without this, ALL users share one Vercel proxy IP and hit rate limits together
app.set('trust proxy', 1);

// Security & Abuse Protection Middleware Imports
const { enforceHttps, detectSuspiciousTraffic } = require('./middleware/securityMiddleware');
const { logApiError } = require('./utils/securityLogger');
const {
    apiLimiter,
    loginLimiter,
    tenantPinLimiter,
    registerLimiter,
    otpLimiter,
    contentScrapingLimiter,
    preventBadBots,
    detectRapidScraping
} = require('./middleware/abuseProtection');

// 1. Enforce HTTPS in production reverse-proxy environments
app.use(enforceHttps);

// 2. Prevent Automated Bad Bots, Vulnerability Scanners & Headless Scrapers
app.use(preventBadBots);


// Initialize Socket.io
const isVercel = process.env.VERCEL === '1';
const socketUtil = require('./utils/socket');
if (!isVercel) {
    socketUtil.init(server);
}

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sanitizeMiddleware = require('./middleware/sanitizeMiddleware');

// Enable Gzip Compression for fast response delivery
app.use(compression());

// Security Headers via Helmet (HSTS, nosniff, secure referrer)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000, // 1 year strict HTTPS enforcement
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true
}));

// Enable CORS first so options preflight and rate limit responses carry CORS headers
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version', 'Authorization']
}));

app.use(express.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(sanitizeMiddleware);

// 2. Proactive Vulnerability Scanner, Path Traversal & Suspicious Traffic Filter
app.use(detectSuspiciousTraffic);

// 4. Rate Limiting — Granular Multi-Tier Abuse Protection
// Global API Limiter (300 requests per 15 min per real IP)
app.use('/api/', apiLimiter);

// Authentication & Brute-Force Rate Limits (10 attempts / 15 min)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/verify-face', loginLimiter);
app.use('/api/auth/login-otp/verify', loginLimiter);

// Account Creation Rate Limits (5 accounts / 1 hr per IP)
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/admin/users', registerLimiter);

// Password Reset & OTP Rate Limits (5 requests / 15 min per IP)
app.use('/api/auth/forgot-password', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);
app.use('/api/auth/login-otp/request', otpLimiter);
app.use('/api/auth/email-verification/request', otpLimiter);
app.use('/api/auth/email-verification/verify', otpLimiter);

// Tenant PIN Authentication Limiter (10 attempts / 15 min per IP)
app.use('/api/bookings/verify-access', tenantPinLimiter);

// Anti-Scraping Protection on Public Content Routes (60 req / 1 min + burst detector)
app.use('/api/portfolio', contentScrapingLimiter, detectRapidScraping);
app.use('/api/blogs', contentScrapingLimiter, detectRapidScraping);
app.use('/api/rooms', contentScrapingLimiter, detectRapidScraping);
app.use('/api/lodge', contentScrapingLimiter, detectRapidScraping);



const path = require('path');
app.use('/uploads', express.static(isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads')));

// Institutional Security Headers (Anti-Caching for Sensitive Data)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});


// Connect to Database
const connectDB = require('./config/database');
connectDB().then(() => {
    console.log('Database synchronization established.');
}).catch(err => {
    console.error('Critical Database Failure:', err.message);
});

// Vercel Database Connection Sync (Ensures DB is ready for every request)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(503).json({ error: 'Database Synchronization Failure', message: err.message });
    }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api', require('./routes/projectStatusRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/quotes', require('./routes/quoteRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/leads', require('./routes/lead'));
app.use('/api/faqs', require('./routes/faq'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/lodge', require('./routes/lodgeRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/drive-link', require('./routes/driveLinkRoutes'));
app.use('/api/availability', require('./routes/availabilityRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/lodge-extras', require('./routes/lodgeExtraRoutes'));
app.use('/api/daily-attendance', require('./routes/dailyAttendanceRoutes'));
app.use('/api/overtime', require('./routes/overtimeRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/document-history', require('./routes/documentHistoryRoutes'));
app.use('/api/lodge-billing', require('./routes/lodgeBillingRoutes'));
app.use('/api/lodge-payments', require('./routes/lodgePaymentRoutes'));
app.use('/api/chatbot-settings', require('./routes/chatbotSettingRoutes'));
app.use('/api/policies', require('./routes/policyRoutes'));
app.use('/api/admin/reset', require('./routes/resetRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Root Error Route
app.get('/api/debug/error', (req, res) => {
    res.json({ status: 'Operational', msg: 'System monitoring active.' });
});

// Admin Route to clean Sunday absent logs
const { protect: serverProtect, admin: serverAdmin } = require('./middleware/authMiddleware');
app.get('/api/debug/cleanup-sundays', serverProtect, serverAdmin, async (req, res) => {
    try {
        const DailyAttendance = require('./models/DailyAttendance');
        const records = await DailyAttendance.find({ status: 'Absent' });
        
        let deletedCount = 0;
        for (const r of records) {
            const dateObj = new Date(r.date);
            if (dateObj.getDay() === 0) { // Sunday
                await DailyAttendance.deleteOne({ _id: r._id });
                deletedCount++;
            }
        }
        res.json({ success: true, checked: records.length, deleted: deletedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// WhatsApp Health Check
app.get('/api/health/whatsapp', async (req, res) => {
    try {
        const { getWhatsAppStatus, ensureWhatsApp } = require('./services/whatsappService');
        const SystemSetting = require('./models/SystemSetting');
        const fs = require('fs');
        const path = require('path');
        
        // Check DB first
        const dbCreds = await SystemSetting.findOne({ key: 'whatsapp_creds' });
        
        await ensureWhatsApp();
        
        // Vercel/Serverless Wait Loop: Stay alive for up to 8 seconds to capture any new QR code
        let attempts = 0;
        let status = await getWhatsAppStatus();
        
        while (!status.connected && !status.qr && attempts < 8) {
            await new Promise(r => setTimeout(r, 1000));
            status = await getWhatsAppStatus();
            attempts++;
        }

        // Check file status AFTER connection attempt
        const credsPath = process.env.VERCEL === '1' 
            ? '/tmp/whatsapp_auth/creds.json' 
            : path.join(__dirname, 'whatsapp_auth_info/creds.json');
        
        const fileExists = fs.existsSync(credsPath);
        
        res.json({ 
            connected: status.connected, 
            isConnecting: status.isConnecting,
            phone: status.phone,
            qr: status.qr,
            provider: status.provider,
            database: {
                hasCreds: !!dbCreds
            },
            fileSystem: {
                exists: fileExists
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

app.post('/api/health/whatsapp/logout', async (req, res) => {
    try {
        const { logoutWhatsApp } = require('./services/whatsappService');
        await logoutWhatsApp();
        res.json({ success: true, message: 'WhatsApp session terminated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health/email', async (req, res) => {
    try {
        const { sendWelcomeEmail } = require('./services/emailService');
        const success = await sendWelcomeEmail(process.env.EMAIL_USER, "System Health Check");
        res.json({ 
            success, 
            user: process.env.EMAIL_USER,
            passSet: !!process.env.EMAIL_PASS,
            timestamp: new Date().toISOString() 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start WhatsApp Relay (Async, isolated) - Only on non-Vercel environments (persistent servers)
if (!isVercel) {
    const { startWhatsAppConnection } = require('./services/whatsappService');
    startWhatsAppConnection().catch(e => console.error('WhatsApp Relay Failure:', e));
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        try {
            const { startBillingScheduler } = require('./services/lodgeBillingEngine');
            startBillingScheduler();
            console.log('Automated Lodge Rent Billing scheduler active.');
        } catch (schedulerErr) {
            console.error('Failed to start Lodge Billing scheduler:', schedulerErr);
        }
    });
}

// Global JSON Error Handler (Logs security incidents and prevents stack trace leakage)
app.use((err, req, res, next) => {
    // Handle Multer upload errors (size limit, disallowed files)
    if (err.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Uploaded file exceeds the maximum allowed size limit of 10MB.'
            : `Upload error: ${err.message}`;
        return res.status(400).json({ error: true, message: msg });
    }

    // Handle strict file upload validation errors
    if (err.message && (err.message.includes('Invalid file') || err.message.includes('Security Violation') || err.message.includes('MIME type'))) {
        return res.status(400).json({ error: true, message: err.message });
    }

    const statusCode = err.status || (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);
    logApiError(req, err, { statusCode });

    res.status(statusCode).json({ 
        error: true,
        message: process.env.NODE_ENV === 'production' 
            ? 'An internal error occurred while processing your request. This event has been securely logged.' 
            : (err.message || 'Internal Signal Breach'),
        details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
});


module.exports = app;
