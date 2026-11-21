const mongoose = require('mongoose');

/**
 * Mask sensitive credentials from MongoDB URI before logging
 */
const sanitizeMongoUri = (uri) => {
    if (!uri) return 'undefined';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
};

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
    const isProduction = process.env.NODE_ENV === 'production';
    const isRemote = uri.startsWith('mongodb+srv://') || (!uri.includes('localhost') && !uri.includes('127.0.0.1'));

    if (process.env.VERCEL === '1' && !process.env.MONGODB_URI) {
        console.warn('⚠️ WARNING: MONGODB_URI environment variable is missing on Vercel. Database requests will fail until MONGODB_URI is set in Vercel settings.');
    }

    const isVercel = process.env.VERCEL === '1';
    const connectionOptions = {
        serverSelectionTimeoutMS: isVercel ? 4000 : 8000,
        autoIndex: !isProduction // Disable heavy automatic index creation at runtime in production
    };

    // Enforce TLS encryption and replica set write concern for remote clusters
    if (isRemote) {
        connectionOptions.tls = true;
        connectionOptions.retryWrites = true;
        connectionOptions.w = 'majority';
    }

    try {
        await mongoose.connect(uri, connectionOptions);
        const host = mongoose.connection.host || 'local';
        console.log(`🛡️ MongoDB Connected securely to host: ${host} (TLS: ${isRemote ? 'Enforced' : 'Dev-Direct'})`);
    } catch (error) {
        const masked = sanitizeMongoUri(uri);
        console.error(`🚨 Critical Database Connection Failure (${masked}): ${error.message}`);
        throw error;
    }
};

connectDB.sanitizeMongoUri = sanitizeMongoUri;
module.exports = connectDB;
