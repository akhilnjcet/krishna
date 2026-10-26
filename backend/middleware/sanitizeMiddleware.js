// Prohibited object keys to prevent prototype pollution and NoSQL injection
const FORBIDDEN_OBJECT_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '$where',
    '$regex',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$ne',
    '$nin',
    '$or',
    '$and',
    '$not',
    '$nor',
    '$exists',
    '$type',
    '$expr',
    '$jsonSchema',
    '$mod',
    '$text',
    '$all',
    '$elemMatch',
    '$size'
]);

// Regular expressions to sanitize Cross-Site Scripting (XSS) and script injection
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const IFRAME_TAG_REGEX = /<(iframe|object|embed|applet)\b[^<]*(?:(?!<\/(iframe|object|embed|applet)>)<[^<]*)*<\/(iframe|object|embed|applet)>/gi;
const JS_PROTOCOL_REGEX = /javascript\s*:\s*[^\s"']*/gi;
const ON_EVENT_ATTR_REGEX = /\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const NULL_BYTE_REGEX = /\0|%00/g;

/**
 * Sanitize string input:
 * 1. Strips null bytes
 * 2. Neutralizes script tags, iframes, inline event handlers (onload, onerror, onclick)
 * 3. Neutralizes javascript: protocol execution
 * 4. Strips leading NoSQL operator tokens if entered as a literal operator
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // 1. Strip null bytes
    let clean = str.replace(NULL_BYTE_REGEX, '');

    // 2. Neutralize script tags, object/embed/iframe tags
    clean = clean.replace(SCRIPT_TAG_REGEX, '');
    clean = clean.replace(IFRAME_TAG_REGEX, '');

    // 3. Neutralize javascript: URI schemes
    clean = clean.replace(JS_PROTOCOL_REGEX, '');

    // 4. Neutralize inline event handler attributes (e.g. <img src=x onerror=alert(1)>)
    clean = clean.replace(ON_EVENT_ATTR_REGEX, '');

    // 5. Strip leading $ to prevent MongoDB query manipulation
    if (clean.startsWith('$')) {
        clean = clean.replace(/^\$+/, '');
    }

    return clean;
};

/**
 * Deep recursive sanitization of arbitrary JavaScript values (objects, arrays, strings)
 */
const sanitizeValue = (val) => {
    if (val === null || val === undefined) return val;

    if (typeof val === 'string') {
        return sanitizeString(val);
    }

    if (Array.isArray(val)) {
        return val.map(item => sanitizeValue(item));
    }

    if (typeof val === 'object' && val.constructor === Object) {
        const sanitized = {};
        for (const [key, rawValue] of Object.entries(val)) {
            const cleanKey = key.trim().toLowerCase();

            // 1. Block prototype pollution & direct NoSQL operators
            if (FORBIDDEN_OBJECT_KEYS.has(cleanKey)) {
                continue;
            }

            // 2. Strip leading $ and dots from object keys
            const sanitizedKey = key.replace(/^\$+|\./g, '').trim();
            if (!sanitizedKey) continue;

            sanitized[sanitizedKey] = sanitizeValue(rawValue);
        }
        return sanitized;
    }

    return val;
};

/**
 * Express Middleware:
 * Automatically sanitizes req.body, req.query, and req.params on every incoming request
 */
const sanitizeMiddleware = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeValue(req.body);
        }
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query);
        }
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeValue(req.params);
        }
    } catch (e) {
        console.error('[SECURITY_SANITIZER_WARNING]', e.message);
    }
    next();
};

module.exports = sanitizeMiddleware;
module.exports.sanitizeString = sanitizeString;
module.exports.sanitizeValue = sanitizeValue;

