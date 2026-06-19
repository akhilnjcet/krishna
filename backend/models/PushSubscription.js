const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subscription: {
        endpoint: { type: String, required: true },
        expirationTime: { type: Number },
        keys: {
            auth: { type: String, required: true },
            p256dh: { type: String, required: true }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
