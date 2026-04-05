const mongoose = require('mongoose');
const SystemSetting = require('./models/SystemSetting');
require('dotenv').config();

async function fixAI() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Force AI to Online Mode
        await SystemSetting.findOneAndUpdate(
            { key: 'aiWorkMode' },
            { value: 'online' },
            { upsert: true }
        );

        await SystemSetting.findOneAndUpdate(
            { key: 'isAiEnabled' },
            { value: 'true' },
            { upsert: true }
        );

        console.log('SUCCESS: AI Work Mode forced to ONLINE.');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

fixAI();
