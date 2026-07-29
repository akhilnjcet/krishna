const express = require('express');
const router = express.Router();
const chatbotSettingController = require('../controllers/chatbotSettingController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public route for fetching contact settings
router.get('/contact', chatbotSettingController.getContactSettings);

// Admin route for updating contact settings
router.post('/contact', protect, admin, chatbotSettingController.saveContactSettings);

module.exports = router;
