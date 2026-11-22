const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, admin, optionalProtect } = require('../middleware/authMiddleware');

// Route to submit feedback (supports both authenticated customers and public guests)
router.post('/', optionalProtect, feedbackController.submitFeedback);

// Customer-only route to inspect their own submitted feedback
router.get('/my-feedback', protect, feedbackController.getMyFeedback);

// Admin-only route to inspect all internal feedback
router.get('/', protect, admin, feedbackController.getFeedbacks);

module.exports = router;
