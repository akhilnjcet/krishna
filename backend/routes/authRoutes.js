const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    logout, 
    verifyFace, 
    getMe, 
    updateProfile, 
    getUsersByRole, 
    forgotPassword, 
    verifyOTP, 
    resetPassword, 
    adminEditUser, 
    requestLoginOTP, 
    loginWithOTP, 
    requestEmailVerification,
    verifyEmail,
    adminGetAllUsers, 
    adminCreateUser, 
    adminUpdateUser, 
    adminDeleteUser 
} = require('../controllers/authController');
const { protect, admin, authorize, optionalProtect } = require('../middleware/authMiddleware');
const { honeypotProtection } = require('../middleware/abuseProtection');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

router.post('/register', honeypotProtection, register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/verify-face', verifyFace);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, authorize('admin', 'staff'), getUsersByRole);
router.put('/:id/admin-edit', protect, admin, adminEditUser);

// Admin User Management Routes
router.get('/admin/users', protect, admin, adminGetAllUsers);
router.post('/admin/users', protect, admin, adminCreateUser);
router.put('/admin/users/:id', protect, admin, adminUpdateUser);
router.delete('/admin/users/:id', protect, admin, adminDeleteUser);

// Password Reset Flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Passwordless Login Flow
router.post('/login-otp/request', requestLoginOTP);
router.post('/login-otp/verify', loginWithOTP);

// Email Verification Flow
router.post('/email-verification/request', optionalProtect, requestEmailVerification);
router.post('/email-verification/verify', optionalProtect, verifyEmail);

module.exports = router;
