const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna-erp', {
            serverSelectionTimeoutMS: 5000, // Fail fast if DB down after 5 seconds
            // Re-enabling bufferCommands but with a low selection timeout is generally safer 
            // for handling brief connection drops while preventing long hangs.
            bufferCommands: true, 
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        console.error('Action required: Ensure MongoDB is running and your connection string is correct.');
        throw error; // Throw so server.js can handle the failure to start
    }
};



module.exports = connectDB;
