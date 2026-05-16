const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function resetWhatsApp() {
    try {
        console.log('🔄 Initializing Hard Reset...');
        const connectDB = require('./config/database');
        await connectDB();
        
        const SystemSetting = require('./models/SystemSetting');
        
        console.log('🗑️ Purging MongoDB session keys...');
        await SystemSetting.deleteMany({ key: { $in: ['whatsapp_creds', 'whatsapp_qr'] } });
        console.log('✅ MongoDB keys cleared.');

        const authPath = path.join(__dirname, 'whatsapp_auth_info');
        if (fs.existsSync(authPath)) {
            console.log('🗑️ Purging local auth directory...');
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('✅ Local directory deleted.');
        }

        console.log('🏁 Hard Reset Complete. The next connection attempt will generate a fresh QR code.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset Failed:', err.message);
        process.exit(1);
    }
}

resetWhatsApp();
