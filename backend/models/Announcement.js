const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    type: { 
        type: String, 
        enum: ['info', 'warning', 'maintenance', 'urgent'], 
        default: 'info' 
    },
    link: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Announcement', announcementSchema);
