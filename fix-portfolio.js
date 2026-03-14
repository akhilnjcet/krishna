const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Portfolio = require('./backend/models/Portfolio');
require('dotenv').config({ path: './backend/.env' });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/krishna');
        console.log('✅ Connected to DB');

        // 1. Ensure admin role is correct
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            console.log(`Found admin: ${admin.email}`);
        } else {
            console.log('⚠️ No admin found. You must login as admin.');
        }

        // 2. Clear empty portfolios if any invalid ones exist
        const invalid = await Portfolio.deleteMany({ title: { $exists: false } });
        console.log(`Removed ${invalid.deletedCount} invalid portfolio entries.`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err);
        process.exit(1);
    }
}

fix();
