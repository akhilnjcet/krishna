const express = require('express');
const router = express.Router();
const { register, login, logout, verifyFace, getMe, updateProfile, getUsersByRole, forgotPassword, verifyOTP, resetPassword, adminEditUser, requestLoginOTP, loginWithOTP, adminGetAllUsers, adminCreateUser, adminUpdateUser, adminDeleteUser } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/verify-face', verifyFace);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getUsersByRole);
router.put('/:id/admin-edit', protect, admin, adminEditUser);

// Admin User Management Routes
router.get('/admin/users', protect, admin, adminGetAllUsers);
router.post('/admin/users', protect, admin, adminCreateUser);
router.put('/admin/users/:id', protect, admin, adminUpdateUser);
router.delete('/admin/users/:id', protect, admin, adminDeleteUser);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

router.post('/login-otp/request', requestLoginOTP);
router.post('/login-otp/verify', loginWithOTP);

module.exports = router;
