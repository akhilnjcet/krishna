const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', faqController.getFAQs); // Public
router.post('/', protect, authorize('admin', 'staff'), faqController.addFAQ);
router.delete('/:id', protect, authorize('admin', 'staff'), faqController.deleteFAQ);

module.exports = router;
