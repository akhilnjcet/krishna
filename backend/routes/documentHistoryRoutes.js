const express = require('express');
const router = express.Router();
const documentHistoryController = require('../controllers/documentHistoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/save', protect, documentHistoryController.saveDocument);
router.get('/', protect, documentHistoryController.getDocuments);
router.post('/:id/archive', protect, documentHistoryController.toggleArchiveDocument);
router.delete('/:id', protect, admin, documentHistoryController.deleteDocument);
router.get('/:id', protect, documentHistoryController.getDocumentById);

module.exports = router;
