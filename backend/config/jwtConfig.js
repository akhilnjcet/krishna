const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Ensure a valid, cryptographically secure JWT secret
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret === 'secret123' || jwtSecret === 'secret') {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL SECURITY ERROR: JWT_SECRET must be set to a strong, unique secret in production environment.');
        throw new Error('Insecure JWT_SECRET in production. Server refused to start with default secret.');
    } else {
        console.warn('⚠️ SECURITY WARNING: Using fallback development JWT secret. Set JWT_SECRET in .env for production.');
        jwtSecret = jwtSecret || 'dev_krishna_jwt_secret_secure_key_2026_9447940835';
    }
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
