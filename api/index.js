const path = require('path');

// Ensure environment variables are loaded regardless of process.cwd in serverless runtimes
try {
    require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    require('dotenv').config();
} catch (_) {}

module.exports = require('../backend/server.js');
