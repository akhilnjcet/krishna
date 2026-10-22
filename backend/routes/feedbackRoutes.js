const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public route to submit internal feedback
router.post('/', feedbackController.submitFeedback);

// Admin-only route to inspect internal feedback
router.get('/', protect, admin, feedbackController.getFeedbacks);

module.exports = router;
