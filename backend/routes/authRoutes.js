const express = require('express');
const router = express.Router();
const { register, login, logout, verifyFace, getMe, updateProfile, getUsersByRole, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/verify-face', verifyFace);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getUsersByRole);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
