const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect, admin } = require('../middleware/authMiddleware');
const { aiBurstLimiter, aiGenerationLimiter, honeypotProtection } = require('../middleware/abuseProtection');

// Public AI chat endpoint protected by burst and quota rate limiting plus bot honeypot detection
router.post('/', aiBurstLimiter, aiGenerationLimiter, honeypotProtection, chatController.handleChat);
router.get('/history', protect, admin, chatController.getChatHistory);

module.exports = router;

