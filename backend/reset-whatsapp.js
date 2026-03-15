require('dotenv').config();
const mongoose = require('mongoose');
const SystemSetting = require('./models/SystemSetting');
const fs = require('fs');
const path = require('path');

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
        
        await SystemSetting.deleteMany({ key: { $in: ['whatsapp_creds', 'whatsapp_qr'] } });
        console.log('✅ Deleted WhatsApp sessions from MongoDB.');

        const localAuthPath = path.join(__dirname, 'whatsapp_auth_info');
        if (fs.existsSync(localAuthPath)) {
            fs.rmSync(localAuthPath, { recursive: true, force: true });
            console.log('✅ Deleted local whatsapp_auth_info folder.');
        }

        console.log('\n=================================================');
        console.log('🎉 RESET COMPLETE!');
        console.log('1. Run the app locally (npm run dev)');
        console.log('2. Scan the NEW QR code with your phone.');
        console.log('3. Run "node push-whatsapp-session.js"');
        console.log('=================================================');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
reset();
