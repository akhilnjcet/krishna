const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    category: { type: String, default: 'general' },
    description: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
