const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Ensure a valid, cryptographically secure JWT secret
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret === 'secret123' || jwtSecret === 'secret') {
    console.warn('⚠️ SECURITY WARNING: Using fallback JWT secret. Ensure JWT_SECRET is set in deployment environment variables.');
    jwtSecret = jwtSecret || process.env.SESSION_SECRET || 'krishna_erp_secure_jwt_auth_key_v1_9447940835';
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a signed JWT token with standardized expiration
 * @param {string} id - User ObjectId
 * @param {string} role - User role
 * @param {string} [expiresIn] - Optional custom expiration
 */
const generateToken = (id, role, expiresIn = JWT_EXPIRES_IN) => {
    return jwt.sign({ id, role }, jwtSecret, { expiresIn });
};

/**
 * Verify a JWT token
 * @param {string} token
 */
const verifyToken = (token) => {
    return jwt.verify(token, jwtSecret);
};

/**
 * Hash a sensitive one-time token or OTP (HMAC-SHA256) before storing in DB
 * @param {string} value - OTP or reset token
 */
const hashToken = (value) => {
    return crypto.createHmac('sha256', jwtSecret).update(String(value).trim()).digest('hex');
};

module.exports = {
    generateToken,
    verifyToken,
    hashToken,
    JWT_EXPIRES_IN,
    jwtSecret
};
