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

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp', {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.error(`DB Error: ${error.message}`);
        throw error;
    }
};




module.exports = connectDB;
