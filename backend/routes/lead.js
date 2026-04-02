const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', chatController.captureLead); // Public endpoint for the chat widget to post a lead
router.get('/', protect, authorize('admin', 'staff'), leadController.getLeads);
router.delete('/:id', protect, authorize('admin'), leadController.deleteLead);

module.exports = router;
