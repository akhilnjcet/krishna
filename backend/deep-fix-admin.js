const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function deepFixAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@gmail.com';
        const username = 'admin';

        // 1. Find all users that might match
        const matchingUsers = await User.find({
            $or: [
                { email: email },
                { username: username }
            ]
        });

        console.log(`Found ${matchingUsers.length} potential admin records.`);

        if (matchingUsers.length > 1) {
            console.log('WARNING: Multiple records found for admin email/username. Cleaning up duplicates...');
            // Keep the first one, delete others
            const mainAdmin = matchingUsers[0];
            for (let i = 1; i < matchingUsers.length; i++) {
                console.log(`Deleting duplicate record: ${matchingUsers[i]._id}`);
                await User.findByIdAndDelete(matchingUsers[i]._id);
            }
        }

        // 2. Force the admin record to be correct
        let admin = await User.findOne({ $or: [{ email: email }, { username: username }] });
        
        if (!admin) {
            console.log('No admin found. Creating from scratch...');
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin', 10);
            admin = await User.create({
                name: 'System Administrator',
                email: email,
                username: username,
                password: hashedPassword,
                role: 'admin'
            });
        } else {
            console.log(`Updating existing record [${admin._id}] to be ADMIN.`);
            admin.role = 'admin';
            admin.email = email;
            admin.username = username;
            // Also reset password to be sure
            const bcrypt = require('bcrypt');
            admin.password = await bcrypt.hash('admin', 10);
            await admin.save();
        }

        console.log('\n--- VERIFICATION ---');
        const finalCheck = await User.findOne({ email: email });
        console.log(`Final ID: ${finalCheck._id}`);
        console.log(`Final Email: ${finalCheck.email}`);
        console.log(`Final Role: ${finalCheck.role}`);
        console.log(`Final Username: ${finalCheck.username}`);

        mongoose.connection.close();
        console.log('\nDeep fix complete. Please try logging in with admin@gmail.com / admin');
    } catch (err) {
        console.error(err);
    }
}

deepFixAdmin();
