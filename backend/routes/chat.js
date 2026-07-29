const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', chatController.handleChat);
router.get('/history', protect, admin, chatController.getChatHistory);

module.exports = router;
