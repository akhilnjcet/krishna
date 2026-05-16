const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const users = await User.find({ 
            $or: [
                { username: /akhil/i }, 
                { email: /akhil/i },
                { phone: /8594/i }
            ] 
        });
        console.log('Users found:', users.length);
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash('123', salt);

        for (const u of users) {
            console.log(`- ID: '${u._id}', Username: '${u.username}', Phone: '${u.phone}', PhoneNum: '${u.phoneNumber}', Role: '${u.role}'`);
            u.password = newHashedPassword;
            await u.save();
            console.log(`  -> Password reset to '123'`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
