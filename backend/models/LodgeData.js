const mongoose = require('mongoose');

const lodgeDataSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rooms: { type: Array, default: [] },
    payments: { type: Array, default: [] },
    complaints: { type: Array, default: [] },
    adminPin: { type: String, default: '1234' },
    appSettings: {
        upiId: { type: String, default: 'krishnaengineering@upi' },
        buildingLocation: { type: String, default: '123 Krishna Building, Main Street' },
        mapUrl: { type: String, default: '' }
    },
    lastSynced: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LodgeData', lodgeDataSchema);
