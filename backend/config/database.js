const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return; // Already connected
    if (mongoose.connection.readyState === 2) {
        // Wait for current connection attempt
        return new Promise((resolve, reject) => {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', reject); 
        });
    }

    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp';
    
    if (process.env.VERCEL === '1' && !process.env.MONGODB_URI) {
        console.warn('⚠️ WARNING: MONGODB_URI environment variable is missing on Vercel. Database requests will fail until MONGODB_URI is set in Vercel settings.');
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
