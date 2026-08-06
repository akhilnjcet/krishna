const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET || 'secret123';
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            if (req.user && req.user.id) {
                req.user._id = req.user.id;
            }
            return next();
        } catch (error) {
            console.error('Auth token verification error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, token missing' });
    }
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

module.exports = { protect, authorize, admin };


