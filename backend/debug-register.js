require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const debugRegister = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- REGISTRATION DIAGNOSTIC INITIATED ---');

        const testEmail = 'rohini@gmail.com';
        const testName = 'rohini';

        console.log(`Searching for conflicts for Email: ${testEmail}...`);

        // 1. Check direct email conflict
        const byEmail = await User.findOne({ email: testEmail });
        if (byEmail) {
            console.log(`❌ CONFLICT DETECTED: A user already has this email.`);
            console.log(`Details: ID: ${byEmail._id} | Name: ${byEmail.name} | Role: ${byEmail.role}`);
        } else {
            console.log(`✅ Email is unique.`);
        }

        // 2. Check username conflict (considering our username || email logic)
        const byUsername = await User.findOne({ username: testEmail });
        if (byUsername) {
            console.log(`❌ CONFLICT DETECTED: A user already has this email as their username.`);
            console.log(`Details: ID: ${byUsername._id} | Name: ${byUsername.name} | Email: ${byUsername.email}`);
        }

        // 3. Check for Malformed "Undefined" Users
        // Many unique index errors stem from multiple users having "null" or "undefined" in a unique field
        const undefinedUsernameCount = await User.countDocuments({ username: { $exists: false } });
        const nullUsernameCount = await User.countDocuments({ username: null });
        
        console.log(`Scanning for indexing anomalies...`);
        console.log(`- Users with missing username field: ${undefinedUsernameCount}`);
        console.log(`- Users with null username value: ${nullUsernameCount}`);

        if (undefinedUsernameCount > 1 || nullUsernameCount > 1) {
            console.log(`⚠️  INDEX ANOMALY: Your database has multiple users with missing usernames. This will block new registrations.`);
        }

        // 4. Check for Staff ID conflicts
        const undefinedStaffIdCount = await User.countDocuments({ staff_id: { $exists: false } });
        const nullStaffIdCount = await User.countDocuments({ staff_id: null });
        console.log(`- Users with missing Staff ID: ${undefinedStaffIdCount}`);
        
        if (undefinedStaffIdCount > 1) {
             console.log(`⚠️  INDEX ANOMALY: Multiple users lack a Staff ID. If the 'staff_id' index is not properly 'sparse', this triggers a global block.`);
        }

        mongoose.connection.close();
        console.log('\n--- DIAGNOSTIC COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Diagnostic error:', err);
        process.exit(1);
    }
};

debugRegister();
