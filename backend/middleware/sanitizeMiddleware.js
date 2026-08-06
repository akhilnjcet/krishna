const sanitizeValue = (val) => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
        // Strip leading $ operators to prevent NoSQL query operator injection
        if (val.startsWith('$')) {
            return val.replace(/^\$/, '');
        }
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(item => sanitizeValue(item));
    }
    if (typeof val === 'object' && val.constructor === Object) {
        const sanitized = {};
        for (const key of Object.keys(val)) {
            const sanitizedKey = key.replace(/^\$|\./g, '');
            sanitized[sanitizedKey] = sanitizeValue(val[key]);
        }
        return sanitized;
    }
    return val;
};

const sanitizeMiddleware = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object' && req.body.constructor === Object) {
            req.body = sanitizeValue(req.body);
        }
    } catch (e) {
        console.error('Sanitizer warning:', e.message);
    }
    next();
};

module.exports = sanitizeMiddleware;
