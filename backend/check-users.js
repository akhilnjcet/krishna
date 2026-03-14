const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Current Database Users ---');
        const users = await User.find({});
        users.forEach(u => {
            console.log(`ID: ${u._id} | Name: ${u.name} | Username: ${u.username} | Email: ${u.email} | Role: ${u.role}`);
        });
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
