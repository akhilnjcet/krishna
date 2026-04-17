const mongoose = require('mongoose');
const Room = require('./models/Room');
require('dotenv').config();

const rooms = [
    { number: '101', type: 'Double', price: 5000, amenities: ['AC', 'WiFi', 'TV'], status: 'active' },
    { number: '102', type: 'Double', price: 5000, amenities: ['AC', 'WiFi', 'TV'], status: 'active' },
    { number: '103', type: 'Suite', price: 8000, amenities: ['AC', 'WiFi', 'TV', 'Mini Bar'], status: 'active' },
    { number: '104', type: 'Single', price: 3000, amenities: ['Fan', 'WiFi'], status: 'active' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        for (const r of rooms) {
            await Room.findOneAndUpdate({ number: r.number }, r, { upsert: true });
        }
        
        console.log('Rooms seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
