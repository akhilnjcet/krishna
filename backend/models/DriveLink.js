const mongoose = require('mongoose');

const driveLinkSchema = new mongoose.Schema({
    link: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('DriveLink', driveLinkSchema);
