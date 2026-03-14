const express = require('express');
const router = express.Router();
const { register, login, verifyFace, getMe, getUsersByRole } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-face', verifyFace);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsersByRole);

module.exports = router;
