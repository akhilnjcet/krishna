require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Public WhatsApp Health Check
app.get('/api/health/whatsapp', async (req, res) => {
    try {
        const { getWhatsAppStatus } = require('./services/whatsappService');
        const status = await getWhatsAppStatus();
        res.json({ 
            connected: status.connected, 
            phone: status.phone,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        console.error('Error Details:', error.message);
        if (process.env.NODE_ENV !== 'production') {
            console.error('Stack Trace:', error.stack);
            process.exit(1);
        }
    }
};

// Export for Vercel
startServer();
module.exports = app;
