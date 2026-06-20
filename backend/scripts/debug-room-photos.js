const mongoose = require('mongoose');
const Room = require('../models/Room');
const Lodge = require('../models/Lodge');
require('dotenv').config({ path: './.env' });

async function debug() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const rooms = await Room.find({});
        for (const room of rooms) {
            console.log(`Room ID: ${room._id}, Type: ${room.type}`);
            console.log('Interior Photos:', JSON.stringify(room.interiorPhotos, null, 2));
            console.log('Exterior Photos:', JSON.stringify(room.exteriorPhotos, null, 2));
        }

        const lodges = await Lodge.find({});
        for (const lodge of lodges) {
            console.log(`Lodge ID: ${lodge._id}, Name: ${lodge.name}`);
            console.log('Images:', JSON.stringify(lodge.images, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
