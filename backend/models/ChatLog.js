const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visitorIp: { type: String, default: '127.0.0.1' },
    userMessage: { type: String, required: true },
    botReply: { type: String, required: true },
    providerUsed: { type: String, enum: ['gemini', 'groq', 'faq_rule', 'intent_rule', 'fallback'], default: 'gemini' },
    leadCaptured: { type: Boolean, default: false }
}, { timestamps: true });

chatLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatLog', chatLogSchema);
