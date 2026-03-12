require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Staff = require('./models/Staff');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishna-erp');
        console.log('Connected to MongoDB');

        // Clear existing staff for clean seed
        await Staff.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);
        const staffPassword = await bcrypt.hash('staff123', salt);

        // Seed Admin
        await Staff.create({
            staff_id: 'ADM-001',
            full_name: 'System Administrator',
            phone_number: '+91 00000 00000',
            email: 'admin@krishnaengg.com',
            department: 'IT',
            designation: 'Super Admin',
            username: 'admin',
            password: adminPassword,
            role: 'admin',
            status: 'active'
        });

        // Seed Sample Staff
        await Staff.create({
            staff_id: 'STF-001',
            full_name: 'John Staff',
            phone_number: '+91 11111 11111',
            email: 'staff@krishnaengg.com',
            department: 'Engineering',
            designation: 'Field Engineer',
            username: 'staff',
            password: staffPassword,
            role: 'staff',
            status: 'active'
        });

        console.log('--- DATABASE SEEDED ---');
        console.log('Admin -> User: admin | Pass: admin123');
        console.log('Staff -> User: staff | Pass: staff123');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();

