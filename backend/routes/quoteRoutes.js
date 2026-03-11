const express = require('express');
const router = express.Router();
const { submitQuote, getQuotes, updateQuote } = require('../controllers/quoteController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(submitQuote)
    .get(protect, authorize('admin', 'staff'), getQuotes);

router.route('/:id')
    .put(protect, authorize('admin', 'staff'), updateQuote);

module.exports = router;
