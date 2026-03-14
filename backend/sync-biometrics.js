const mongoose = require('mongoose');
const User = require('./models/User');
const FaceData = require('./models/FaceData');
require('dotenv').config();

async function checkSync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ faceDescriptor: { $exists: true, $ne: [] } });
        const faces = await FaceData.find({});
        
        console.log('--- Biometric Sync Status ---');
        console.log(`Users with old data: ${users.length}`);
        console.log(`New FaceData records: ${faces.length}`);
        
        if (users.length > 0 && faces.length === 0) {
            console.log('\nACTUAL PROBLEM FOUND: Data is in User model but not FaceData model.');
            console.log('Running auto-migration...');
            
            for (const user of users) {
                await FaceData.findOneAndUpdate(
                    { userId: user._id },
                    { faceEmbedding: user.faceDescriptor },
                    { upsert: true }
                );
                console.log(`Migrated face for: ${user.name}`);
            }
            console.log('Migration complete!');
        } else {
            console.log('\nData appears synced or no migration needed.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkSync();
