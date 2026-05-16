const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return; // Already connected
    if (mongoose.connection.readyState === 2) {
        // Wait for current connection attempt
        return new Promise((resolve) => {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', resolve); 
        });
    }

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('WARNING: MONGODB_URI is not defined. Falling back to local defaults (this will fail in production).');
        }

        await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/krishna-erp', {
            serverSelectionTimeoutMS: 8000, // Slightly longer for cloud handshakes
            bufferCommands: false,
            connectTimeoutMS: 10000,
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`CRITICAL DB ERROR: ${error.message}`);
        // Log more details if possible
        if (error.name === 'MongooseServerSelectionError') {
            console.error('Check your IP whitelisting on MongoDB Atlas and verify your connection string.');
        }
        throw error;
    }
};



module.exports = connectDB;
