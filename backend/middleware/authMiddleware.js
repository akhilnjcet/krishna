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

// Route to ERP Access Area mapping for granular backend authorization
const ROUTE_AREA_MAP = {
    // Finance & Billing
    'finance': ['finance'],
    'invoices': ['invoices-studio', 'finance'],
    'quotes': ['quotes', 'quotations-studio', 'finance'],
    'bom': ['bom-costing', 'finance'],
    'labour-bills': ['labour-bills', 'finance'],
    'rental-bills': ['rental-bills', 'finance'],
    'payroll': ['finance', 'payroll'],
    'payments': ['finance'],
    'lodge-billing': ['lodge-manager', 'finance'],
    'lodge-payments': ['lodge-manager', 'finance'],

    // Operations & Production
    'projects': ['projects'],
    'project-status': ['projects', 'progress'],
    'production-plans': ['production-planning'],
    'progress': ['progress'],
    'tasks': ['tasks'],
    'drawings': ['drawings'],
    'scrap': ['scrap-waste'],
    'defects': ['defects'],
    'warranty-service': ['warranty-service'],
    'machines': ['production-planning', 'projects'],

    // Inventory, Fleet & Logistics
    'inventory': ['inventory'],
    'warehouses': ['inventory'],
    'vehicles': ['fleet'],
    'drivers': ['fleet', 'staff'],
    'fleet-trips': ['fleet'],
    'location': ['live-tracking'],

    // Human Resources & Workforce
    'staff': ['staff'],
    'attendance': ['logs', 'attendance'],
    'daily-attendance': ['logs', 'attendance'],
    'shifts': ['shifts'],
    'leave': ['leave'],
    'overtime': ['shifts', 'logs', 'attendance'],
    'vacancies': ['careers'],
    'applications': ['applications', 'careers'],

    // CRM, Hospitality & Communications
    'crm': ['crm'],
    'leads': ['crm'],
    'lodge': ['lodge-manager'],
    'rooms': ['lodge-manager'],
    'bookings': ['lodge-manager'],
    'lodge-extras': ['lodge-manager'],
    'complaints': ['lodge-manager'],
    'chat': ['live-chat'],
    'support': ['live-chat'],
    'whatsapp': ['whatsapp'],
    'notifications': ['notifications'],
    'ai-erp': ['ai-assistant'],
    'ai-chat': ['ai-chat'],

    // Documentation & Administration
    'document-history': ['document-history'],
    'blogs': ['blog'],
    'portfolio': ['portfolio'],
    'analytics': ['analytics'],
    'settings': ['settings'],
    'chatbot-settings': ['settings'],
    'policies': ['legal-policies'],
    'users': ['users'],
    'auth': ['users']
};

/**
 * Validates whether a user account has access to the requested ERP operational area
 */
const checkUserAreaAccess = (user, req, targetAreasOrRoles = []) => {
    if (!user) return false;
    const userRole = (user.role || '').toLowerCase();
    if (userRole === 'admin') return true;

    // Direct role check
    const normalizedTargets = targetAreasOrRoles.map(t => String(t).toLowerCase().trim());
    if (normalizedTargets.includes(userRole)) return true;

    // Only manager and finance_admin hold granular modular access areas
    if (userRole !== 'manager' && userRole !== 'finance_admin') {
        return false;
    }

    const userAreas = [
        ...(Array.isArray(user.accessAreas) ? user.accessAreas : []),
        ...(Array.isArray(user.permissions) ? user.permissions : [])
    ].map(a => String(a).toLowerCase().trim().replace(/^\/admin\//, '').replace(/^\//, ''));

    // Check if any explicitly specified target matches user's granted areas
    for (const target of normalizedTargets) {
        const cleanTarget = target.replace(/^\/admin\//, '').replace(/^\//, '');
        if (userAreas.includes(cleanTarget)) {
            return true;
        }
    }

    // Inspect request route base or path against known ERP modules
    const base = (req.baseUrl || '').replace(/^\/api\//, '').toLowerCase().trim();
    const pathPart = (req.path || '').replace(/^\//, '').split('/')[0].toLowerCase().trim();

    const candidates = [base, pathPart].filter(Boolean);
    for (const cand of candidates) {
        if (userAreas.includes(cand)) {
            return true;
        }
        const mappedAreas = ROUTE_AREA_MAP[cand] || [];
        for (const mapped of mappedAreas) {
            if (userAreas.includes(mapped)) {
                return true;
            }
        }
    }

    return false;
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userRole = (req.user.role || '').toLowerCase();
        if (userRole === 'admin') {
            return next();
        }

        const normalizedRoles = roles.map(r => String(r).toLowerCase().trim());
        if (normalizedRoles.includes(userRole)) {
            return next();
        }

        if (userRole === 'manager' || userRole === 'finance_admin') {
            if (checkUserAreaAccess(req.user, req, roles)) {
                return next();
            }
        }

        return res.status(403).json({ message: `Access forbidden for user role ${req.user.role || 'none'}` });
    };
};

const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin') {
        return next();
    }
    if (role === 'manager' || role === 'finance_admin') {
        if (checkUserAreaAccess(req.user, req)) {
            return next();
        }
        return res.status(403).json({
            message: `Not authorized: ${role === 'finance_admin' ? 'Finance Admin' : 'Manager'} account does not have access to this ERP module.`
        });
    }
    res.status(403).json({ message: 'Not authorized: Admin privileges required' });
};

const requireAccessArea = (...requiredAreas) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (checkUserAreaAccess(req.user, req, requiredAreas)) {
            return next();
        }
        const userRole = (req.user.role || '').toLowerCase();
        return res.status(403).json({
            message: `Access denied: Account (${userRole}) is not permitted to access [${requiredAreas.join(', ')}].`
        });
    };
};

module.exports = { protect, optionalProtect, authorize, admin, requireAccessArea, checkUserAreaAccess };
