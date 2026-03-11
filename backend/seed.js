require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/krishna-erp');
        console.log('Connected to MongoDB');

        // Clear existing users for clean seed
        await User.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            name: 'Super Admin',
            email: 'admin@krishnaengg.com',
            password: hashedPassword,
            role: 'admin'
        });

        console.log('Admin user seeded successfully!');
        console.log('Email: admin@krishnaengg.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
