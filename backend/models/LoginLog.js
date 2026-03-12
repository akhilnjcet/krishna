const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
    log_id: { type: String, required: true, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    login_time: { type: Date, default: Date.now },
    logout_time: { type: Date },
    IP_address: { type: String },
    login_status: { type: String, enum: ['success', 'failed'], required: true }
});

module.exports = mongoose.model('LoginLog', loginLogSchema);
