const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./models/User');

const ADMIN_EMAIL = 'admin@gmail.com'; 
const ADMIN_PASS = 'Krishna_8594030186'; 
const ADMIN_USER = 'admin'; 

async function seedAdmin() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database Connected Successfully!");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASS, salt);

        // Check by Username first since it is unique
        let admin = await User.findOne({ 
            $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USER }] 
        });
        
        if (admin) {
            console.log(`Found account: ${admin.username} / ${admin.email}. Resetting...`);
            admin.password = hashedPassword;
            admin.username = ADMIN_USER;
            admin.email = ADMIN_EMAIL;
            admin.role = 'admin';
            await admin.save();
            console.log("Admin Credentials Reset Successfully!");
        } else {
            console.log("Creating NEW Admin account...");
            admin = new User({
                name: "Administrator",
                username: ADMIN_USER,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });
            await admin.save();
            console.log("New Admin Account Created!");
        }

        console.log("------------------------------");
        console.log("LOGIN CREDENTIALS:");
        console.log(`EMAIL: ${ADMIN_EMAIL}`);
        console.log(`PASS : ${ADMIN_PASS}`);
        console.log("------------------------------");
        
    } catch (err) {
        console.error("Critical Error during seeding:", err.message);
    } finally {
        mongoose.disconnect();
    }
}

seedAdmin();
