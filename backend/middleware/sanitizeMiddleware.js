const sanitizeInput = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'string') {
            // Remove MongoDB query operators starting with $
            if (obj.startsWith('$')) {
                return obj.replace(/^\$/, '');
            }
        }
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
    }

    const sanitized = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Strip key if it starts with $ or contains dots
            const sanitizedKey = key.replace(/^\$|\./g, '');
            sanitized[sanitizedKey] = sanitizeInput(obj[key]);
        }
    }
    return sanitized;
};

const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }
    if (req.params) {
        req.params = sanitizeInput(req.params);
    }
    next();
};

module.exports = sanitizeMiddleware;
