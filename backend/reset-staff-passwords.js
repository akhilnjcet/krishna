const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetStaffPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const salt = await bcrypt.genSalt(10);
        const newPassword = 'admin'; // Keeping it simple as requested
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const staffMembers = await User.find({ role: 'staff' });
        console.log(`Resetting passwords for ${staffMembers.length} staff members...`);

        for (const staff of staffMembers) {
            staff.password = hashedPassword;
            await staff.save();
            console.log(`- Reset password for: ${staff.name} (Login ID: ${staff.username})`);
        }

        mongoose.connection.close();
        console.log('\nStaff password reset to "admin" complete!');
    } catch (err) {
        console.error(err);
    }
}

resetStaffPasswords();
