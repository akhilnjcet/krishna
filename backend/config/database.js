const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;

    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp', {
            serverSelectionTimeoutMS: 5000,
            bufferCommands: false, // Don't buffer if connection fails
        });
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.error(`DB Error: ${error.message}`);
        throw error;
    }
};



module.exports = connectDB;
