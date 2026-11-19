const mongoose = require('mongoose');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ERP MODULE & SCHEMA REGISTRY
 * Maps every functional ERP area, access policies, and Mongoose collections.
 * Supports dynamic discovery of newly added Mongoose models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MODULE_REGISTRY = {
    // ─── 1. HR & WORKFORCE ───
    HR_LEAVE: {
        id: 'HR_LEAVE',
        name: 'Leave Management',
        models: ['Leave', 'User'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },
    HR_ATTENDANCE: {
        id: 'HR_ATTENDANCE',
        name: 'Staff Attendance Hub',
        models: ['DailyAttendance', 'Attendance', 'Shift', 'User'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },
    SALARY: {
        id: 'SALARY',
        name: 'Payroll & Salary Management',
        models: ['Salary', 'User'],
        roles: ['admin'], // Strictly Admin only!
        adminOnly: true,
        driverSelfScope: false
    },

    // ─── 2. DRIVERS & FLEET ───
    DRIVERS: {
        id: 'DRIVERS',
        name: 'Driver Management',
        models: ['Driver', 'User', 'Vehicle', 'FleetTrip'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true // Driver sees self
    },
    VEHICLES_FLEET: {
        id: 'VEHICLES_FLEET',
        name: 'Fleet & Vehicle Management',
        models: ['Vehicle', 'Driver', 'FleetTrip'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true
    },
    FLEET_TRIPS: {
        id: 'FLEET_TRIPS',
        name: 'Fleet Trips & Route Dispatch',
        models: ['FleetTrip', 'Vehicle', 'Driver'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true
    },
    EWAY_BILLS: {
        id: 'EWAY_BILLS',
        name: 'Transport Documents & E-Way Bills',
        models: ['FleetTrip', 'Vehicle', 'Driver'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true
    },
    TRANSPORT_COSTS: {
        id: 'TRANSPORT_COSTS',
        name: 'Transport & Freight Costing',
        models: ['ProjectTransportCost', 'Vehicle', 'Expense'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },
    LABOUR_COSTS: {
        id: 'LABOUR_COSTS',
        name: 'Project Labour Costing',
        models: ['ProjectLabourCost', 'Project'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },

    // ─── 3. PROJECTS & ENGINEERING ───
    PROJECTS: {
        id: 'PROJECTS',
        name: 'Project Management & Delays',
        models: ['Project', 'ProjectStatusHistory', 'BillOfMaterials'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },

    // ─── 4. INVENTORY & PROCUREMENT ───
    INVENTORY: {
        id: 'INVENTORY',
        name: 'Materials & Products Inventory',
        models: ['InventoryItem', 'MaterialRequest', 'StockTransfer', 'Warehouse'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },

    // ─── 5. PRODUCTION ───
    PRODUCTION: {
        id: 'PRODUCTION',
        name: 'Production Planning & Fabrication',
        models: ['ProductionPlan', 'DefectRework', 'ScrapRecord', 'FabricationDrawing'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },

    // ─── 6. MACHINERY & PLANT ───
    MACHINERY: {
        id: 'MACHINERY',
        name: 'Plant Machinery & Tool Repairs',
        models: ['MachineLog', 'ToolRepair', 'InventoryItem'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    },

    // ─── 7. FINANCE & ACCOUNTS ───
    FINANCES: {
        id: 'FINANCES',
        name: 'Finance, Invoices & Receivables',
        models: ['Invoice', 'Payment', 'Expense', 'CashFlowAdjustment'],
        roles: ['admin'], // Strictly Admin only!
        adminOnly: true,
        driverSelfScope: false
    },

    // ─── 8. SELF-SERVICE ACCESS ───
    MY_VEHICLE: {
        id: 'MY_VEHICLE',
        name: 'User Assigned Vehicle',
        models: ['Vehicle', 'Driver'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true
    },
    MY_TRIPS: {
        id: 'MY_TRIPS',
        name: 'Driver Assigned Trips',
        models: ['FleetTrip', 'Vehicle', 'Driver'],
        roles: ['admin', 'manager', 'staff', 'driver'],
        adminOnly: false,
        driverSelfScope: true
    },

    // ─── 9. EXECUTIVE SUMMARY ───
    EXECUTIVE_SUMMARY: {
        id: 'EXECUTIVE_SUMMARY',
        name: 'Executive Business Overview',
        models: ['Project', 'InventoryItem', 'Vehicle', 'MachineLog', 'DailyAttendance', 'Expense', 'Invoice'],
        roles: ['admin', 'manager', 'staff'],
        adminOnly: false,
        driverSelfScope: false
    }
};

/**
 * Access verification
 */
exports.checkModuleAccess = (intentId, user) => {
    const role = (user?.role || '').toLowerCase();
    const config = MODULE_REGISTRY[intentId];

    if (!config) {
        return { allowed: true }; // General fallback
    }

    // Admin has access to everything
    if (role === 'admin') {
        return { allowed: true };
    }

    // Check admin-only restriction
    if (config.adminOnly) {
        return {
            allowed: false,
            reason: `🔒 **Clearance Required**: Financial accounting, executive cash flow, and employee payroll records are restricted to Administrator accounts.`
        };
    }

    // Driver role restrictions: Drivers can only view self records
    if (role === 'driver') {
        if (!config.driverSelfScope) {
            return {
                allowed: false,
                reason: `🔒 **Clearance Restricted**: Driver accounts are authorized to access personal vehicle assignments, assigned trips, compliance documents, and personal reports only.`
            };
        }
    }

    // Staff role restrictions: Staff cannot access Admin-only modules
    if (!config.roles.includes(role)) {
        return {
            allowed: false,
            reason: `🔒 **Clearance Restricted**: Your account role (${role}) is not authorized to access this module's records.`
        };
    }

    return { allowed: true };
};

/**
 * Dynamic module & model discovery:
 * Returns all active models registered in Mongoose with their schema fields.
 */
exports.getDiscoveredSchemas = () => {
    const modelNames = mongoose.modelNames();
    const schemaMap = {};

    modelNames.forEach(name => {
        try {
            const model = mongoose.model(name);
            const paths = Object.keys(model.schema.paths).filter(p => !p.startsWith('__'));
            schemaMap[name] = {
                collection: model.collection.name,
                fields: paths
            };
        } catch (e) {
            // Ignore non-model errors
        }
    });

    return schemaMap;
};

exports.MODULE_REGISTRY = MODULE_REGISTRY;
