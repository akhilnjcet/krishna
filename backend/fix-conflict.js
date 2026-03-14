const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixConflict() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Delete the conflicting staff account that stole the admin email as a username
        console.log('Removing conflicting staff account...');
        await User.deleteMany({ username: 'admin@gmail.com', role: 'staff' });

        // 2. Ensure the REAL admin has the correct credentials
        console.log('Updating real admin credentials...');
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            admin.email = 'admin@gmail.com';
            admin.username = 'admin';
            await admin.save();
            console.log('Admin updated: Username is "admin", Email is "admin@gmail.com"');
        }

        mongoose.connection.close();
        console.log('\nConflict resolved! Please try logging in again.');
    } catch (err) {
        console.error(err);
    }
}

fixConflict();
