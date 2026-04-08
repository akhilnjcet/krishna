require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const forcePasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const salt = await bcrypt.genSalt(10);
        const customerPass = await bcrypt.hash('customer123', salt);
        const adminPass = await bcrypt.hash('admin123', salt);

        // Update Sample Customer
        const customer = await User.findOneAndUpdate(
            { email: 'customer@acme.com' },
            { password: customerPass },
            { new: true }
        );
        if (customer) {
            console.log('✅ Synchronized Customer [customer@acme.com] Passcode to: customer123');
        } else {
            console.warn('⚠️  Customer [customer@acme.com] not found in registry.');
        }

        // Update Admin
        const admin = await User.findOneAndUpdate(
            { email: 'admin@gmail.com' },
            { password: adminPass },
            { new: true }
        );
        if (admin) {
            console.log('✅ Synchronized Admin [admin@gmail.com] Passcode to: admin123');
        } else {
            console.warn('⚠️  Admin [admin@gmail.com] not found in registry.');
        }

        mongoose.connection.close();
        console.log('\n--- SECURITY SYNC COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Error during sync:', err);
        process.exit(1);
    }
};

forcePasswords();
