const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Search by email to ensure this specific account is an admin
        const adminAccount = await User.findOne({ email: 'admin@gmail.com' });
        
        const salt = await bcrypt.genSalt(10);
        const password = 'admin'; 
        const hashedPassword = await bcrypt.hash(password, salt);

        if (adminAccount) {
            console.log('Admin account found. Forcefully updating to "admin" role and resetting password...');
            adminAccount.role = 'admin';
            adminAccount.password = hashedPassword;
            adminAccount.username = 'admin';
            await adminAccount.save();
            console.log(`Success: admin@gmail.com is now an ADMIN.`);
        } else {
            console.log('Creating new admin user...');
            await User.create({
                name: 'Administrator',
                username: 'admin',
                email: 'admin@gmail.com',
                password: hashedPassword,
                role: 'admin',
                phoneNumber: '916282769200'
            });
            console.log('New Admin Created: admin@gmail.com / admin');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

createAdmin();
