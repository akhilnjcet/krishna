const mongoose = require('mongoose');
const { checkModuleAccess } = require('./erpModuleRegistry');
const resolvers = require('./queryResolvers');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ERP DATA COLLECTOR
 * Fetches authoritative live MongoDB data for any module or entity the user
 * is authorized to access.
 * ─────────────────────────────────────────────────────────────────────────────
 */

async function collectLiveErpData(normalized, user, rawQuery) {
    const qLower = (rawQuery || '').toLowerCase();
    const intent = normalized?.intent || 'UNKNOWN';

    // 1. Verify Role-Based Authorization for the detected intent
    if (intent !== 'UNKNOWN' && intent !== 'GREETING') {
        const access = checkModuleAccess(intent, user);
        if (!access.allowed) {
            return {
                authorized: false,
                reason: access.reason || 'Access denied under ERP security policy.',
                data: null
            };
        }
    }

    // 2. Query specific module data using authoritative resolvers
    let liveData = null;

    try {
        switch (intent) {
            case 'HR_LEAVE':
                liveData = await resolvers.resolveLeave(normalized, user);
                break;

            case 'HR_ATTENDANCE':
                liveData = await resolvers.resolveAttendance(normalized, user);
                break;

            case 'DRIVERS':
                liveData = await resolvers.resolveDrivers(normalized, user);
                break;

            case 'VEHICLES_FLEET':
                liveData = await resolvers.resolveVehicles(normalized, user);
                break;

            case 'FLEET_TRIPS':
            case 'MY_TRIPS':
                liveData = await resolvers.resolveFleetTrips(normalized, user);
                break;

            case 'TRANSPORT_COSTS':
                liveData = await resolvers.resolveTransportCosts(normalized, user);
                break;

            case 'EWAY_BILLS':
                liveData = await resolvers.resolveEWayBills(normalized, user);
                break;

            case 'PROJECTS':
                liveData = await resolvers.resolveProjects(normalized, user);
                break;

            case 'INVENTORY':
                liveData = await resolvers.resolveInventory(normalized, user);
                break;

            case 'FINANCES':
                // Extra server-side check
                if (user.role !== 'admin' && user.role !== 'finance_admin') {
                    return {
                        authorized: false,
                        reason: 'Financial and accounts ledgers are restricted to authorized Admin & Finance roles.',
                        data: null
                    };
                }
                liveData = await resolvers.resolveFinances(normalized, user);
                break;

            case 'PRODUCTION':
                liveData = await resolvers.resolveProduction(normalized, user);
                break;

            case 'MACHINERY':
                liveData = await resolvers.resolveMachinery(normalized, user);
                break;

            case 'MY_VEHICLE':
                liveData = await resolvers.resolveMyVehicle(normalized, user);
                break;

            case 'EXECUTIVE_SUMMARY':
                liveData = await resolvers.resolveExecutiveSummary(normalized, user);
                break;

            default:
                break;
        }

        // 3. If intent was UNKNOWN, attempt entity lookup across database
        if (!liveData) {
            liveData = await lookupEntitiesDirectly(rawQuery, user);
        }

        return {
            authorized: true,
            data: liveData
        };
    } catch (err) {
        console.error('Error collecting live ERP data:', err);
        return {
            authorized: true,
            data: `Live ERP database query encountered an error: ${err.message}`
        };
    }
}

/**
 * Direct Entity Lookup across Mongoose Models
 */
async function lookupEntitiesDirectly(query, user) {
    const qTrim = (query || '').trim();
    if (qTrim.length < 2) return null;

    const regex = new RegExp(qTrim, 'i');
    const results = [];

    try {
        const Driver = mongoose.models['Driver'] || require('../../models/Driver');
        const Vehicle = mongoose.models['Vehicle'] || require('../../models/Vehicle');
        const Project = mongoose.models['Project'] || require('../../models/Project');
        const InventoryItem = mongoose.models['InventoryItem'] || require('../../models/InventoryItem');
        const Warranty = mongoose.models['Warranty'] || require('../../models/Warranty');

        // Look for Driver
        const drivers = await Driver.find({
            $or: [{ name: regex }, { phone: regex }, { licenseNumber: regex }]
        }).limit(3).lean();

        if (drivers.length > 0) {
            results.push({
                entityType: 'Driver',
                records: drivers.map(d => ({
                    name: d.name,
                    phone: d.phone,
                    licenseNumber: d.licenseNumber,
                    status: d.status,
                    assignedVehicle: d.currentAssignedVehicle?.registrationNumber || 'Unassigned'
                }))
            });
        }

        // Look for Vehicle
        const vehicles = await Vehicle.find({
            $or: [{ registrationNumber: regex }, { vehicleName: regex }]
        }).limit(3).lean();

        if (vehicles.length > 0) {
            results.push({
                entityType: 'Vehicle',
                records: vehicles.map(v => ({
                    registrationNumber: v.registrationNumber,
                    model: v.vehicleName,
                    type: v.vehicleType,
                    status: v.status,
                    odometer: v.currentOdometer,
                    assignedDriver: v.assignedDriverName || 'Unassigned'
                }))
            });
        }

        // Look for Project (only if authorized)
        if (user.role !== 'driver') {
            const projects = await Project.find({
                $or: [{ title: regex }, { projectCode: regex }, { clientName: regex }]
            }).limit(3).lean();

            if (projects.length > 0) {
                results.push({
                    entityType: 'Project',
                    records: projects.map(p => ({
                        title: p.title,
                        code: p.projectCode || p._id,
                        client: p.clientName || 'Commercial Client',
                        status: p.status,
                        progress: `${p.progress || 0}%`,
                        deadline: p.deadline
                    }))
                });
            }
        }

        // Look for Inventory
        const items = await InventoryItem.find({
            $or: [{ name: regex }, { sku: regex }]
        }).limit(3).lean();

        if (items.length > 0) {
            results.push({
                entityType: 'InventoryItem',
                records: items.map(it => ({
                    name: it.name,
                    category: it.category,
                    quantity: `${it.quantity} ${it.unit || 'Kg'}`,
                    minThreshold: it.minThreshold,
                    isLowStock: it.quantity <= (it.minThreshold || 0)
                }))
            });
        }

        // Look for Warranty
        const warranties = await Warranty.find({
            $or: [{ warrantyNumber: regex }, { customerName: regex }, { deliveredItem: regex }]
        }).limit(3).lean();

        if (warranties.length > 0) {
            results.push({
                entityType: 'Warranty',
                records: warranties.map(w => ({
                    warrantyNumber: w.warrantyNumber,
                    customer: w.customerName,
                    item: w.deliveredItem,
                    category: w.category,
                    expiryDate: w.expiryDate,
                    status: w.status
                }))
            });
        }

        return results.length > 0 ? results : null;
    } catch (err) {
        console.warn('Entity lookup warning:', err.message);
        return null;
    }
}

module.exports = {
    collectLiveErpData,
    lookupEntitiesDirectly
};
