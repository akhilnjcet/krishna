const express = require('express');
const router = express.Router();
const aiErpController = require('../controllers/aiErpController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/query', authorize('admin', 'staff'), aiErpController.askAiAssistant);
router.get('/audit-logs', authorize('admin'), aiErpController.getAiAuditLogs);

module.exports = router;
