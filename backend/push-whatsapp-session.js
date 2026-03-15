require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const SystemSetting = require('./models/SystemSetting');

const MONGODB_URI = process.env.MONGODB_URI;

async function pushSession() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const credsPath = path.join(__dirname, 'whatsapp_auth_info', 'creds.json');
        
        if (!fs.existsSync(credsPath)) {
            console.error('❌ Local session not found at backend/whatsapp_auth_info/creds.json');
            console.log('Please run the app locally and scan the QR code first.');
            process.exit(1);
        }

        const credsData = fs.readFileSync(credsPath, 'utf-8');
        
        console.log('⬆️ Uploading session to MongoDB...');
        await SystemSetting.findOneAndUpdate(
            { key: 'whatsapp_creds' },
            { 
                value: credsData, 
                category: 'whatsapp',
                description: 'WhatsApp Baileys Session Credentials',
                updatedAt: Date.now() 
            },
            { upsert: true }
        );

        console.log('✅ SUCCESS! WhatsApp session pushed to database.');
        console.log('Now your Vercel deployment can use this session.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error pushing session:', error.message);
        process.exit(1);
    }
}

pushSession();
