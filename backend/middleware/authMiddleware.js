const { verifyToken } = require('../config/jwtConfig');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyToken(token);

            if (!decoded || !decoded.id) {
                return res.status(401).json({ message: 'Not authorized: token payload is malformed.' });
            }

            // Secure session validation: verify the user actually exists and is active
            const user = await User.findById(decoded.id).select('-password -faceDescriptor');
            if (!user) {
                return res.status(401).json({ message: 'Not authorized: user account does not exist or was deleted.' });
            }

            if (user.status === 'inactive' || user.deletionStatus === 'deleted') {
                return res.status(403).json({ message: 'Access denied: your account is inactive or disabled. Contact administrator.' });
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error('Auth token verification error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Session expired. Please log in again.', expired: true });
            }
            return res.status(401).json({ message: 'Not authorized, token invalid' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, token missing' });
    }
};

const optionalProtect = async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = verifyToken(token);
            if (decoded && decoded.id) {
                const user = await User.findById(decoded.id).select('-password -faceDescriptor');
                if (user && user.status !== 'inactive' && user.deletionStatus !== 'deleted') {
                    req.user = user;
                }
            }
        } catch (error) {
            // ignore expired/invalid token in optionalProtect
        }
    }
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access forbidden for user role ${req.user ? req.user.role : 'none'}` });
        }
        next();
    };
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized: Admin privileges required' });
    }
};

module.exports = { protect, optionalProtect, authorize, admin };
