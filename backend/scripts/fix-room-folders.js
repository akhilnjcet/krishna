const mongoose = require('mongoose');
const Room = require('../models/Room');
const Lodge = require('../models/Lodge');
const { listarArquivosDaPasta, extrairFolderId } = require('../utils/driveHelper');
require('dotenv').config({ path: './.env' }); // load dotenv from backend directory

async function migrate() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp';
        console.log('Connecting to database:', uri);
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // 1. Process Rooms
        const rooms = await Room.find({});
        console.log(`Found ${rooms.length} rooms to scan.`);

        for (const room of rooms) {
            let updated = false;

            // Process interiorPhotos
            const newInterior = [];
            for (const img of room.interiorPhotos || []) {
                const folderId = extrairFolderId(img.url);
                if (folderId && img.url.includes('/folders/')) {
                    console.log(`Expanding room ${room._id} interior folder:`, folderId);
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => newInterior.push({ url: f, publicId: 'drive_link' }));
                        updated = true;
                    } catch (err) {
                        console.error(`Failed to expand interior folder ${folderId}:`, err.message);
                        newInterior.push(img);
                    }
                } else {
                    newInterior.push(img);
                }
            }

            // Process exteriorPhotos
            const newExterior = [];
            for (const img of room.exteriorPhotos || []) {
                const folderId = extrairFolderId(img.url);
                if (folderId && img.url.includes('/folders/')) {
                    console.log(`Expanding room ${room._id} exterior folder:`, folderId);
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => newExterior.push({ url: f, publicId: 'drive_link' }));
                        updated = true;
                    } catch (err) {
                        console.error(`Failed to expand exterior folder ${folderId}:`, err.message);
                        newExterior.push(img);
                    }
                } else {
                    newExterior.push(img);
                }
            }

            if (updated) {
                room.interiorPhotos = newInterior;
                room.exteriorPhotos = newExterior;
                await room.save();
                console.log(`✅ Updated room ${room._id} photos.`);
            }
        }

        // 2. Process Lodges
        const lodges = await Lodge.find({});
        console.log(`Found ${lodges.length} lodges to scan.`);

        for (const lodge of lodges) {
            let updated = false;
            const newImages = [];

            for (const img of lodge.images || []) {
                const folderId = extrairFolderId(img.url);
                if (folderId && img.url.includes('/folders/')) {
                    console.log(`Expanding lodge ${lodge._id} folder:`, folderId);
                    try {
                        const files = await listarArquivosDaPasta(folderId);
                        files.forEach(f => newImages.push({ url: f, publicId: 'drive_link' }));
                        updated = true;
                    } catch (err) {
                        console.error(`Failed to expand lodge folder ${folderId}:`, err.message);
                        newImages.push(img);
                    }
                } else {
                    newImages.push(img);
                }
            }

            if (updated) {
                lodge.images = newImages;
                await lodge.save();
                console.log(`✅ Updated lodge ${lodge._id} photos.`);
            }
        }

        console.log('🎉 Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
