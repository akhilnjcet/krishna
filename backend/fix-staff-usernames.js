const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixStaffUsernames() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Find all staff members
        const staffMembers = await User.find({ role: 'staff' });
        console.log(`Checking ${staffMembers.length} staff members...`);

        for (const staff of staffMembers) {
            let updated = false;
            
            // If username is empty or is a common admin string, set it to email
            if (!staff.username || staff.username === 'admin@gmail.com' || staff.username === 'admin') {
                console.log(`Fixing staff [${staff.name}]: Username was "${staff.username}", setting to "${staff.email}"`);
                staff.username = staff.email;
                updated = true;
            }

            // Ensure username is lowercase
            if (staff.username && staff.username !== staff.username.toLowerCase()) {
                staff.username = staff.username.toLowerCase();
                updated = true;
            }

            if (updated) {
                await staff.save();
            }
        }

        console.log('\n--- Current Staff List ---');
        const finalStaff = await User.find({ role: 'staff' });
        finalStaff.forEach(s => {
            console.log(`- ${s.name} | Username: ${s.username} | Email: ${s.email}`);
        });

        mongoose.connection.close();
        console.log('\nStaff cleanup complete!');
    } catch (err) {
        console.error(err);
    }
}

fixStaffUsernames();
