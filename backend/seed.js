require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishna-erp');
        console.log('Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);
        const staffPassword = await bcrypt.hash('staff123', salt);
        const customerPassword = await bcrypt.hash('customer123', salt);

        // Seed Admin
        await User.create({
            staff_id: 'ADM-001',
            name: 'System Administrator',
            phone: '+91 00000 00000',
            email: 'admin@krishnaengg.com',
            department: 'IT',
            designation: 'Super Admin',
            username: 'admin',
            password: adminPassword,
            role: 'admin',
            status: 'active'
        });

        // Seed Sample Staff
        await User.create({
            staff_id: 'STF-001',
            name: 'John Staff',
            phone: '+91 11111 11111',
            email: 'staff@krishnaengg.com',
            department: 'Engineering',
            designation: 'Field Engineer',
            username: 'staff',
            password: staffPassword,
            role: 'staff',
            status: 'active'
        });

        // Seed Sample Customer
        await User.create({
            name: 'Acme Corp Client',
            phone: '+91 22222 22222',
            email: 'customer@acme.com',
            username: 'customer',
            password: customerPassword,
            role: 'customer'
        });

        console.log('--- DATABASE SEEDED ---');
        console.log('Admin -> User: admin | Pass: admin123');
        console.log('Staff -> User: staff | Pass: staff123');
        console.log('Customer -> User: customer | Pass: customer123');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
