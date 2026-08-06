require('dotenv').config();
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

// Security Headers via Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS first so options preflight and rate limit responses carry CORS headers
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(sanitizeMiddleware);

// Rate Limiter — uses real client IP via X-Forwarded-For (trust proxy must be set above)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,       // 15 minutes
    max: 1000,                        // 1000 requests per real IP per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    // Always return JSON — never HTML — so frontend can parse the error
    handler: (req, res) => {
        res.status(429).json({ message: 'Too many requests from this IP, please try again after 15 minutes.' });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,                         // 100 auth attempts per real IP per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    // Always return JSON so the login page shows a readable error
    handler: (req, res) => {
        res.status(429).json({ message: 'Too many authentication attempts. Please wait 15 minutes and try again.' });
    }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);


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
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Root Error Route
app.get('/api/debug/error', (req, res) => {
    res.json({ status: 'Operational', msg: 'System monitoring active.' });
});

// Temporary Route to clean Sunday absent logs
app.get('/api/debug/cleanup-sundays', async (req, res) => {
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

// Public WhatsApp Health Check
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
        const fileSize = fileExists ? fs.statSync(credsPath).size : 0;
        
        res.json({ 
            connected: status.connected, 
            isConnecting: status.isConnecting,
            phone: status.phone,
            qr: status.qr,
            provider: status.provider,
            database: {
                hasCreds: !!dbCreds,
                credsLength: dbCreds ? dbCreds.value.length : 0
            },
            fileSystem: {
                exists: fileExists,
                size: fileSize,
                path: credsPath
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

// Global JSON Error Handler (Prevents generic 500 HTML crashes)
app.use((err, req, res, next) => {
    console.error('SERVER CRASH:', err);
    res.status(500).json({ 
        error: true,
        message: err.message || 'Internal Signal Breach',
        details: process.env.NODE_ENV !== 'production' ? err.stack : 'Telemetry active'
    });
});

module.exports = app;
