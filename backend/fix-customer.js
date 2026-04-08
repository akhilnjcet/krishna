const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixCustomer() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'customer@acme.com';
        const username = 'customer';
        const password = 'customer123';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let customer = await User.findOne({ $or: [{ email }, { username }] });

        if (!customer) {
            console.log('No customer found. Creating new customer account...');
            customer = await User.create({
                name: 'ACME Corp Client',
                email: email,
                username: username,
                password: hashedPassword,
                role: 'customer'
            });
            console.log('Customer created successfully.');
        } else {
            console.log(`Updating existing customer [${customer.username}]...`);
            customer.role = 'customer';
            customer.password = hashedPassword;
            customer.username = username;
            customer.email = email;
            await customer.save();
            console.log('Customer updated successfully.');
        }

        console.log('\n--- CUSTOMER ACCOUNT READY ---');
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixCustomer();
