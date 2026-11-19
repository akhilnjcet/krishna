/**
 * Driver Role & Permissions Middleware
 * Enforces role-based and granular permission checks for Driver Management and Portal
 */

// List of all recognized driver permissions
const ALL_DRIVER_PERMISSIONS = [
    'driver.view',
    'driver.create',
    'driver.edit',
    'driver.delete',
    'driver.activate',
    'driver.deactivate',
    'driver.password_reset',
    'driver.assign_vehicle',
    'driver.assign_trip',
    'driver.view_reports',
    'driver.manage_issues',
    'driver.view_location',
    'driver.manage_documents'
];

// Permissions that Staff is STRICTLY FORBIDDEN from ever possessing or executing
const STAFF_PROHIBITED_PERMISSIONS = [
    'driver.create',
    'driver.delete',
    'driver.activate',
    'driver.deactivate',
    'driver.password_reset'
];

/**
 * Middleware factory requiring a specific driver permission
 * @param {string} requiredPermission 
 */
const requireDriverPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userRole = (req.user.role || '').toLowerCase();

        // 1. ADMIN: Complete, unrestricted authority
        if (userRole === 'admin') {
            return next();
        }

        // 2. STAFF: Strictly prohibited from account creation, credential modification, deactivation, or deletion
        if (userRole === 'staff') {
            if (STAFF_PROHIBITED_PERMISSIONS.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied: Staff members are strictly prohibited from performing '${requiredPermission}'. Only Administrator (or explicitly authorized Manager) may perform this action.`
                });
            }

            const staffPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            // Operational permissions allowed for staff if granted or standard
            const defaultStaffOperational = [
                'driver.view',
                'driver.assign_trip',
                'driver.view_reports',
                'driver.manage_issues',
                'driver.view_location',
                'driver.manage_documents'
            ];

            // If user has specific permission OR no granular restrictions exist and it is in standard operational set
            if (staffPerms.includes(requiredPermission) || (staffPerms.length === 0 && defaultStaffOperational.includes(requiredPermission))) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `Access denied: Staff member does not have permission '${requiredPermission}'.`
            });
        }

        // 3. MANAGER: Must have explicit permission granted by Admin
        if (userRole === 'manager') {
            const managerPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (managerPerms.includes(requiredPermission) || managerPerms.includes('driver.*')) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `Access denied: Manager does not have explicit permission '${requiredPermission}' granted by Administrator.`
            });
        }

        // 4. DRIVER: Allowed on driver portal self-service endpoints
        if (userRole === 'driver') {
            const driverSelfPermissions = [
                'driver.portal',
                'driver.my_trips',
                'driver.my_vehicle',
                'driver.report_issue',
                'driver.emergency',
                'driver.update_trip'
            ];

            if (driverSelfPermissions.includes(requiredPermission)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied: Drivers can only access their assigned portal features.'
            });
        }

        return res.status(403).json({
            success: false,
            message: `Access forbidden for user role: ${userRole}`
        });
    };
};

module.exports = {
    requireDriverPermission,
    ALL_DRIVER_PERMISSIONS,
    STAFF_PROHIBITED_PERMISSIONS
};
