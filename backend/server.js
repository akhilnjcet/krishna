require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Institutional Security Headers (Anti-Caching for Sensitive Data)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
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
        const status = await getWhatsAppStatus();

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

// Database connection
const connectDB = require('./config/database');
const { startWhatsAppConnection } = require('./services/whatsappService');

const startServer = async () => {
    try {
        await connectDB();
        
        // Initialize WhatsApp Connection (Non-blocking for faster cold starts)
        startWhatsAppConnection().catch(err => console.error('WhatsApp Init Error:', err.message));

        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
    } catch (error) {
        console.error('CRITICAL: Server failed to start.');
    }
};

// Export for Vercel
startServer();
module.exports = app;
