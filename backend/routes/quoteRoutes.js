const express = require('express');
const router = express.Router();
const { submitQuote, getQuotes, updateQuote, deleteQuote, getMyQuotes } = require('../controllers/quoteController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(submitQuote)
    .get(protect, authorize('admin', 'staff'), getQuotes);

router.get('/my-quotes', protect, getMyQuotes);

router.route('/:id')
    .put(protect, authorize('admin', 'staff'), updateQuote)
    .delete(protect, authorize('admin', 'staff'), deleteQuote);

module.exports = router;
