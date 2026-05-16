require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 1. Environment Validation
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`CRITICAL FAILURE: Missing required environment variables: ${missingEnv.join(', ')}`);
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
        // We only exit if we're truly in a cloud environment
    }
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'https://krishna-akhilnjcets-projects.vercel.app',
    'https://krishna-git-main-akhilnjcets-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:5000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Instant Preflight Handler (Bypasses DB connection for speed)
app.options('*', cors());

app.use(express.json());
const path = require('path');
const isVercel = process.env.VERCEL === '1';
app.use('/uploads', express.static(isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads')));

// Traffic Logger (Diagnostic)
app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}\n`;
    try {
        fs.appendFileSync(path.join(__dirname, 'traffic.log'), log);
    } catch (e) {
        // Silent fail for logging in read-only environments like Vercel
    }
    next();
});

// Institutional Security Headers (Anti-Caching for Sensitive Data)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Connect to Database
const connectDB = require('./config/database');
// Avoid top-level await to prevent Vercel function timeout during cold starts
// Instead, the connection is managed by the middleware below
connectDB().catch(err => {
    console.error('Initial Database Connection Failed:', err.message);
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
app.use('/api/availability', require('./routes/availabilityRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/lodge-extras', require('./routes/lodgeExtraRoutes'));
app.get('/api/health', async (req, res) => {
    try {
        await connectDB();
        res.json({ 
            status: 'ok', 
            message: 'API is running',
            db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({ status: 'error', message: 'Database Unavailable', detail: err.message });
    }
});

// Root Error Route
app.get('/api/debug/error', (req, res) => {
    res.json({ status: 'Operational', msg: 'System monitoring active.' });
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

// Start WhatsApp Relay (Async, isolated)
const { startWhatsAppConnection } = require('./services/whatsappService');
startWhatsAppConnection().catch(e => console.error('WhatsApp Relay Failure:', e));

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Global JSON Error Handler (Prevents generic 500 HTML crashes)
app.use((err, req, res, next) => {
    console.error('SERVER CRASH:', err);
    
    // Safety: Ensure CORS headers exist even on crash
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(500).json({ 
        error: true,
        success: false, // Unified format
        message: err.message || 'Internal Signal Breach',
        details: process.env.NODE_ENV !== 'production' ? err.stack : 'Telemetry active'
    });
});

module.exports = app;
