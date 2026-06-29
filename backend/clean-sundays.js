const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DailyAttendance = require('./models/DailyAttendance');

dotenv.config();

const clean = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp');
        console.log("MongoDB Connected");

        const collections = await mongoose.connection.db.collections();
        for (const col of collections) {
            const count = await col.countDocuments();
            console.log(`Collection: ${col.collectionName} - Count: ${count}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        console.log("DB connection closed.");
    }
};

clean();
