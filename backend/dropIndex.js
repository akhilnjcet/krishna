require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            if (collection.collectionName === 'rooms') {
                try {
                    await collection.dropIndex('number_1');
                    console.log('Successfully dropped index number_1 on rooms collection');
                } catch (e) {
                    console.log('Index drop error (might not exist):', e.message);
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

dropIndex();
