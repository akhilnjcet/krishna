const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixRoles() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const allUsers = await User.find({});
        console.log(`Found ${allUsers.length} users. Checking roles...`);

        for (const user of allUsers) {
            let changesMade = false;

            // 1. Force admin@gmail.com and 'admin' username to be ADMIN
            if (user.email === 'admin@gmail.com' || user.username === 'admin') {
                if (user.role !== 'admin') {
                    console.log(`Fixing [${user.email}]: Changing role from ${user.role} to admin`);
                    user.role = 'admin';
                    changesMade = true;
                }
            }

            // 2. Ensure users with staff_id have 'staff' role (unless they are the admin)
            if (user.staff_id && user.role === 'customer' && user.username !== 'admin') {
                console.log(`Fixing [${user.email}]: Changing role from customer to staff`);
                user.role = 'staff';
                changesMade = true;
            }

            // 3. Prevent multiple admins if they aren't authorized (Optional, but let's stick to our primary admin)
            // If you have other specific admins, you can add them here.

            if (changesMade) {
                await user.save();
            }
        }

        console.log('\n--- Final User List ---');
        const finalUsers = await User.find({});
        finalUsers.forEach(u => {
            console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | Username: ${u.username}`);
        });

        mongoose.connection.close();
        console.log('\nRole verification complete!');
    } catch (err) {
        console.error(err);
    }
}

fixRoles();
