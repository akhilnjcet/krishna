const mongoose = require('mongoose');
const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

async function seedDatabase() {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
        console.log("Database already seeded. Skipping initialization.");
        return;
    }

    console.log("Initializing database with dummy data...");

    // 1. Create Users
    const admin = await User.create({ name: 'System Admin', role: 'admin' });
    const user1 = await User.create({ name: 'Akhil N', role: 'user' });
    const user2 = await User.create({ name: 'Test Student', role: 'user' });

    // 2. Create Rooms
    await Room.create([
        { type: 'Single', price: 500, capacity: 1, status: 'available' },
        { type: 'Double', price: 800, capacity: 2, status: 'available' },
        { type: 'Suite', price: 1500, capacity: 4, status: 'available' },
        { type: 'Dorm', price: 300, capacity: 6, status: 'available' }
    ]);

    console.log("Seed complete! Users array:");
    console.log(`[ADMIN ID]: ${admin._id}`);
    console.log(`[USER ID]: ${user1._id} / ${user2._id}`);
}

module.exports = seedDatabase();
