const express = require('express');
const router = express.Router();
const { 
    getResetPreview, 
    requestResetOTP, 
    verifyResetCredentials, 
    executeMasterReset, 
    getResetHistory, 
    cancelResetSession 
} = require('../controllers/resetController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are strictly restricted to authenticated administrators
router.use(protect, admin);

router.get('/preview', getResetPreview);
router.post('/request-otp', requestResetOTP);
router.post('/verify-credentials', verifyResetCredentials);
router.post('/execute', executeMasterReset);
router.get('/history', getResetHistory);
router.post('/cancel', cancelResetSession);

module.exports = router;
