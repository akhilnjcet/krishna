require('dotenv').config();
const mongoose = require('mongoose');
const SystemSetting = require('./models/SystemSetting');

async function checkDb() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const setting = await SystemSetting.findOne({ key: 'whatsapp_creds' });
        if (setting) {
            console.log('✅ Found WhatsApp session in MongoDB');
            console.log('Updated At:', setting.updatedAt);
            const data = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
            console.log('Connected Phone:', data.me?.id || 'Unknown');
        } else {
            console.log('❌ No WhatsApp session found in MongoDB');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
checkDb();
