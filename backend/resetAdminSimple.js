const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123', salt);
        
        // Clean up any existing admins to avoid duplicate keys
        await User.deleteMany({ $or: [{ username: 'admin' }, { email: 'admin@krishna.com' }] });
        
        await User.create({ 
            username: 'admin',
            password: hashedPassword,
            email: 'admin@krishna.com',
            role: 'admin',
            name: 'System Admin'
        });
        
        console.log('Admin account created: admin / 123');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

reset();
