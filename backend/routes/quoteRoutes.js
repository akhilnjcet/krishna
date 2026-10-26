const express = require('express');
const router = express.Router();
const { submitQuote, getQuotes, updateQuote, deleteQuote, getMyQuotes } = require('../controllers/quoteController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

router.route('/')
    .post(protect, submitQuote)
    .get(protect, authorize('admin', 'staff'), getQuotes);

router.get('/my-quotes', protect, getMyQuotes);

router.route('/:id')
    .put(protect, updateQuote)
    .delete(protect, authorize('admin', 'staff'), deleteQuote);

module.exports = router;
