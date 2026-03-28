const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getWhatsAppStatus, getPublicSettings } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/public', getPublicSettings);
router.get('/', protect, admin, getSettings);
router.get('/whatsapp-status', protect, admin, getWhatsAppStatus);
router.put('/', protect, admin, updateSettings);

module.exports = router;
