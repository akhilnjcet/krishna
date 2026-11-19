const mongoose = require('mongoose');

// Models
const User = require('../../models/User');
const Driver = require('../../models/Driver');
const Vehicle = require('../../models/Vehicle');
const FleetTrip = require('../../models/FleetTrip');
const Project = require('../../models/Project');
const DailyAttendance = require('../../models/DailyAttendance');
const Leave = require('../../models/Leave');
const InventoryItem = require('../../models/InventoryItem');
const MaterialRequest = require('../../models/MaterialRequest');
const ProductionPlan = require('../../models/ProductionPlan');
const MachineLog = require('../../models/MachineLog');
const ToolRepair = require('../../models/ToolRepair');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Expense = require('../../models/Expense');
const Salary = require('../../models/Salary');
const ProjectTransportCost = require('../../models/ProjectTransportCost');
const ProjectLabourCost = require('../../models/ProjectLabourCost');

/**
 * Helper to get local YYYY-MM-DD string
 */
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. HR: LEAVE MANAGEMENT
 * Questions: "How many employees are on leave today?", "Who is on leave?",
 * "Innu ethra per leave aanu?", "Aarkokke innu leave aanu?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveLeave = async (normalized, user) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Leaves spanning today
    const leaves = await Leave.find({
        startDate: { $lte: endOfToday },
        endDate: { $gte: today },
        status: { $in: ['approved', 'pending'] }
    }).populate('staffId', 'name staff_id department designation phone');

    // Also check DailyAttendance marked as 'Leave' today
    const todayStr = getLocalDateString();
    const attendanceLeaves = await DailyAttendance.find({
        date: todayStr,
        status: 'Leave'
    }).populate('staffId', 'name staff_id department designation phone');

    // Combine unique employees on leave
    const leaveMap = new Map();

    leaves.forEach(l => {
        if (l.staffId) {
            leaveMap.set(l.staffId._id.toString(), {
                name: l.staffId.name,
                staff_id: l.staffId.staff_id || 'N/A',
                department: l.staffId.department || 'Operations',
                designation: l.staffId.designation || 'Staff',
                reason: l.reason || 'Approved Leave',
                status: l.status === 'approved' ? 'Approved' : 'Pending Approval'
            });
        }
    });

    attendanceLeaves.forEach(a => {
        if (a.staffId && !leaveMap.has(a.staffId._id.toString())) {
            leaveMap.set(a.staffId._id.toString(), {
                name: a.staffId.name,
                staff_id: a.staffId.staff_id || 'N/A',
                department: a.staffId.department || 'Operations',
                designation: a.staffId.designation || 'Staff',
                reason: 'Marked on Leave in Daily Attendance',
                status: 'Approved'
            });
        }
    });

    const leaveList = Array.from(leaveMap.values());
    const totalOnLeave = leaveList.length;

    let out = `### 🌴 Today's Employee Leave Report\n\n`;
    out += `*Date: ${todayStr} • Krishna Engineering Works HR Desk*\n\n`;
    out += `- **Total Employees on Leave Today**: **${totalOnLeave}**\n\n`;

    if (totalOnLeave === 0) {
        out += `> ✅ **Full Workforce Available**: No employees are recorded on leave today. All active personnel are scheduled on duty.\n`;
        return out;
    }

    out += `| Employee Name | Staff ID | Department | Designation | Leave Reason | Status |\n`;
    out += `|---|---|---|---|---|---|\n`;
    leaveList.forEach(emp => {
        out += `| **${emp.name}** | \`${emp.staff_id}\` | ${emp.department} | ${emp.designation} | ${emp.reason} | **${emp.status}** |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. HR: ATTENDANCE & ABSENCE
 * Questions: "Who is absent today?", "Show today's attendance",
 * "Innu attendance ethra und?", "Only absent employees", "Department wise?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveAttendance = async (normalized, user) => {
    const todayStr = getLocalDateString();

    const [records, staffUsers] = await Promise.all([
        DailyAttendance.find({ date: todayStr }).populate('staffId', 'name staff_id department designation phone'),
        User.find({ role: { $in: ['staff', 'manager'] }, status: 'active' }).select('name staff_id department designation')
    ]);

    const totalActiveStaff = staffUsers.length;
    const presentRecords = records.filter(r => r.status === 'Present' || r.status === 'Completed' || r.status === 'In Progress');
    const absentRecords = records.filter(r => r.status === 'Absent');
    const leaveRecords = records.filter(r => r.status === 'Leave');
    const lateRecords = records.filter(r => r.isLate);

    // If filter is specifically for absent employees
    if (normalized.filters?.status === 'Absent' || normalized.cleanQuery.toLowerCase().includes('absent')) {
        let out = `### ❌ Today's Absent Personnel List (${todayStr})\n\n`;
        out += `- **Total Staff Absent**: **${absentRecords.length}** (out of ${totalActiveStaff} registered workforce)\n\n`;

        if (absentRecords.length === 0) {
            out += `> 🎉 **Zero Unexcused Absences**: No employees are marked absent today!\n`;
            return out;
        }

        out += `| Staff Name | ID | Department | Designation | Phone |\n`;
        out += `|---|---|---|---|---|\n`;
        absentRecords.forEach(r => {
            const s = r.staffId || {};
            out += `| **${s.name || 'Staff Member'}** | \`${s.staff_id || 'N/A'}\` | ${s.department || 'Operations'} | ${s.designation || 'Staff'} | ${s.phone || 'N/A'} |\n`;
        });
        return out;
    }

    // Department-wise breakdown
    if (normalized.filters?.groupBy === 'department' || normalized.cleanQuery.toLowerCase().includes('department')) {
        const deptMap = {};
        records.forEach(r => {
            const dept = r.staffId?.department || 'General Operations';
            if (!deptMap[dept]) deptMap[dept] = { present: 0, absent: 0, leave: 0, late: 0, total: 0 };
            deptMap[dept].total++;
            if (r.status === 'Present' || r.status === 'Completed') deptMap[dept].present++;
            if (r.status === 'Absent') deptMap[dept].absent++;
            if (r.status === 'Leave') deptMap[dept].leave++;
            if (r.isLate) deptMap[dept].late++;
        });

        let out = `### 🏢 Department-Wise Attendance Summary (${todayStr})\n\n`;
        out += `| Department | Logged | Present | Absent | On Leave | Late Arrivals |\n`;
        out += `|---|---|---|---|---|---|\n`;
        Object.entries(deptMap).forEach(([dept, counts]) => {
            out += `| **${dept}** | ${counts.total} | **${counts.present}** | ${counts.absent} | ${counts.leave} | ${counts.late} |\n`;
        });
        return out;
    }

    // Standard Full Attendance Overview
    let out = `### 👥 Today's Workforce Attendance Overview (${todayStr})\n\n`;
    out += `- **Total Registered Active Workforce**: **${totalActiveStaff}**\n`;
    out += `- **Present on Duty**: **${presentRecords.length}**\n`;
    out += `- **Absent**: **${absentRecords.length}**\n`;
    out += `- **Approved Leave**: **${leaveRecords.length}**\n`;
    out += `- **Late Arrivals**: **${lateRecords.length}**\n\n`;

    if (records.length === 0) {
        out += `> ℹ️ *Shift check-ins are currently in progress. Staff attendance scanner is active at workshop gate.*\n`;
    } else {
        out += `#### 📋 Key Attendance Log (Latest Entries)\n\n`;
        out += `| Staff Member | Shift / Code | Status | In Time | Late? |\n`;
        out += `|---|---|---|---|---|\n`;
        records.slice(0, 10).forEach(r => {
            out += `| **${r.staffId?.name || 'Staff'}** | ${r.shiftName || 'Standard'} | **${r.status}** | ${r.checkIn || '—'} | ${r.isLate ? `⚠️ ${r.lateMinutes}m Late` : 'On Time'} |\n`;
        });
        if (records.length > 10) {
            out += `\n*Showing 10 of ${records.length} logged records today.*\n`;
        }
    }

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. DRIVER MANAGEMENT
 * Questions: "driver", "How many drivers are registered?",
 * "Show all active drivers", "Which drivers are currently on trips?",
 * "Driver details kaanikk."
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveDrivers = async (normalized, user) => {
    const [allDrivers, onTripVehicles, activeTrips] = await Promise.all([
        Driver.find().populate('employeeId', 'name phone department').sort({ createdAt: -1 }),
        Vehicle.find({ status: 'On Trip' }).select('registrationNumber assignedDriverRef assignedDriverName'),
        FleetTrip.find({ status: { $in: ['Started', 'Confirmed'] } }).select('driverId driverName vehicleRegistration status destination startLocation')
    ]);

    const totalDrivers = allDrivers.length;
    const activeDrivers = allDrivers.filter(d => d.status === 'Active');
    const inactiveDrivers = allDrivers.filter(d => d.status === 'Inactive');

    // Determine which drivers are on active trips
    const onTripDriverIds = new Set([
        ...onTripVehicles.map(v => v.assignedDriverRef?.toString()).filter(Boolean),
        ...activeTrips.map(t => t.driverId?.toString()).filter(Boolean)
    ]);

    const driversOnTrip = allDrivers.filter(d => onTripDriverIds.has(d._id.toString()));
    const availableDrivers = activeDrivers.filter(d => !onTripDriverIds.has(d._id.toString()) && !d.currentAssignedVehicle?.vehicleId);

    // If query is specifically about drivers currently on trips
    if (normalized.cleanQuery.toLowerCase().includes('on trip') || normalized.cleanQuery.toLowerCase().includes('tripil')) {
        let out = `### 🚛 Drivers Currently on Active Trips\n\n`;
        out += `- **Total Drivers En Route**: **${driversOnTrip.length}**\n\n`;

        if (driversOnTrip.length === 0) {
            out += `> ℹ️ No drivers are currently executing field trips. All active drivers are stationed at the yard or available for assignment.\n`;
            return out;
        }

        out += `| Driver Name | Phone | Vehicle | Trip Route | Status |\n`;
        out += `|---|---|---|---|---|\n`;
        driversOnTrip.forEach(d => {
            const trip = activeTrips.find(t => t.driverId?.toString() === d._id.toString());
            const veh = trip?.vehicleRegistration || d.currentAssignedVehicle?.registrationNumber || 'Assigned Vehicle';
            const route = trip ? `${trip.startLocation || 'Yard'} ➔ ${trip.destination}` : 'Active Dispatch';
            out += `| **${d.name}** | ${d.phone} | \`${veh}\` | ${route} | 🟢 **In Progress** |\n`;
        });
        return out;
    }

    // Standard Driver Roster Overview
    let out = `### 👨‍✈️ Driver Management & Fleet Roster Overview\n\n`;
    out += `- **Total Registered Drivers**: **${totalDrivers}**\n`;
    out += `- **Active Drivers**: **${activeDrivers.length}**\n`;
    out += `- **Currently on Trips**: **${driversOnTrip.length}**\n`;
    out += `- **Inactive / Suspended**: **${inactiveDrivers.length}**\n\n`;

    if (totalDrivers === 0) {
        out += `> ⚠️ No drivers are registered in the ERP. Drivers can be registered in **Fleet & Vehicle Management**.\n`;
        return out;
    }

    out += `| Driver Name | Mobile | Licence No. | Licence Type | Status | Assigned Vehicle | Current State |\n`;
    out += `|---|---|---|---|---|---|---|\n`;

    allDrivers.forEach(d => {
        const isOnTrip = onTripDriverIds.has(d._id.toString());
        const veh = d.currentAssignedVehicle?.registrationNumber || 'Unassigned';
        const stateText = isOnTrip ? '🟢 **On Active Trip**' : (d.status === 'Active' ? '⚪ Available in Yard' : '🔴 Inactive');

        out += `| **${d.name}** | ${d.phone} | \`${d.licenseNumber}\` | ${d.licenseType || 'LMV'} | **${d.status}** | \`${veh}\` | ${stateText} |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. VEHICLES & FLEET
 * Questions: "Which vehicles are available?", "How many vehicles are running?",
 * "Ethra vehicle tripil und?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveVehicles = async (normalized, user) => {
    const [vehicles, activeTrips] = await Promise.all([
        Vehicle.find().sort({ registrationNumber: 1 }),
        FleetTrip.find({ status: { $in: ['Started', 'Confirmed'] } })
    ]);

    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available');
    const onTripVehicles = vehicles.filter(v => v.status === 'On Trip');
    const maintenanceVehicles = vehicles.filter(v => ['In Maintenance', 'Out of Service'].includes(v.status));

    // If query asks which are available
    if (normalized.cleanQuery.toLowerCase().includes('available')) {
        let out = `### 🚙 Available Company Vehicles in Yard\n\n`;
        out += `- **Total Ready for Dispatch**: **${availableVehicles.length}** (out of ${totalVehicles} registered)\n\n`;

        if (availableVehicles.length === 0) {
            out += `> ⚠️ No vehicles are currently idle in the yard. All fleet units are either on field trips or under maintenance.\n`;
            return out;
        }

        out += `| Registration | Model / Name | Vehicle Type | Fuel | Current Odometer | Default Driver |\n`;
        out += `|---|---|---|---|---|---|\n`;
        availableVehicles.forEach(v => {
            out += `| \`${v.registrationNumber}\` | **${v.vehicleName}** | ${v.vehicleType} | ${v.fuelType} | ${v.currentOdometer?.toLocaleString()} km | ${v.assignedDriverName || 'Unassigned'} |\n`;
        });
        return out;
    }

    // If query asks for running / on trips
    if (normalized.cleanQuery.toLowerCase().includes('running') || normalized.cleanQuery.toLowerCase().includes('trip')) {
        let out = `### 🚛 Vehicles Currently Running on Field Trips\n\n`;
        out += `- **Active Vehicles on Road**: **${onTripVehicles.length}**\n\n`;

        if (onTripVehicles.length === 0) {
            out += `> ℹ️ No fleet vehicles are currently out on delivery trips. All fleet units are stationed at the central yard.\n`;
            return out;
        }

        out += `| Vehicle | Type | Driver | Destination | Status |\n`;
        out += `|---|---|---|---|---|\n`;
        onTripVehicles.forEach(v => {
            const trip = activeTrips.find(t => t.vehicleRegistration === v.registrationNumber);
            out += `| \`${v.registrationNumber}\` (${v.vehicleName}) | ${v.vehicleType} | **${v.assignedDriverName || 'Driver'}** | ${trip?.destination || 'Delivery Route'} | 🟢 **On Trip** |\n`;
        });
        return out;
    }

    // Standard fleet summary
    let out = `### 🚚 Company Fleet & Vehicle Status\n\n`;
    out += `- **Total Fleet Strength**: **${totalVehicles}** units\n`;
    out += `- **Available in Central Yard**: **${availableVehicles.length}**\n`;
    out += `- **Currently on Active Trips**: **${onTripVehicles.length}**\n`;
    out += `- **In Maintenance / Service**: **${maintenanceVehicles.length}**\n\n`;

    out += `| Registration | Vehicle | Type | Odometer | Fuel | Driver | Status |\n`;
    out += `|---|---|---|---|---|---|---|\n`;
    vehicles.forEach(v => {
        out += `| \`${v.registrationNumber}\` | **${v.vehicleName}** | ${v.vehicleType} | ${v.currentOdometer?.toLocaleString()} km | ${v.fuelType} | ${v.assignedDriverName || '—'} | **${v.status}** |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. FLEET TRIPS
 * Questions: "Show today's vehicle trips", "Active trips"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveFleetTrips = async (normalized, user) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trips = await FleetTrip.find({
        createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    const allActiveTrips = await FleetTrip.find({
        status: { $in: ['Started', 'Confirmed'] }
    });

    let out = `### 🗺️ Today's Vehicle Trips & Route Dispatches\n\n`;
    out += `- **Trips Created Today**: **${trips.length}**\n`;
    out += `- **Currently In Progress**: **${allActiveTrips.length}**\n\n`;

    const displayList = trips.length > 0 ? trips : allActiveTrips;

    if (displayList.length === 0) {
        out += `> ℹ️ No vehicle trips have been scheduled or run today. New trips can be assigned in **Fleet & Vehicle Management** or the **Driver Portal**.\n`;
        return out;
    }

    out += `| Trip No. | Driver | Vehicle | Origin ➔ Destination | Status | Start Odometer |\n`;
    out += `|---|---|---|---|---|---|\n`;
    displayList.forEach(t => {
        out += `| \`${t.tripNumber}\` | **${t.driverName}** | \`${t.vehicleRegistration}\` | ${t.startLocation || 'Yard'} ➔ ${t.destination} | **${t.status}** | ${t.startReport?.odometerReading ? `${t.startReport.odometerReading} km` : 'Pending'} |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. TRANSPORT EXPENSES & COSTING
 * Questions: "How much was spent on transport this month?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveTransportCosts = async (normalized, user) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [projectTransports, vehicles] = await Promise.all([
        ProjectTransportCost.find({ transportDate: { $gte: startOfMonth } }),
        Vehicle.find()
    ]);

    let totalTransportCost = projectTransports.reduce((acc, t) => acc + (t.totalCost || 0), 0);

    // Sum fuel refill expenses logged in vehicle fuel logs this month
    let totalFuelSpend = 0;
    vehicles.forEach(v => {
        (v.fuelLogs || []).forEach(fl => {
            if (fl.date && new Date(fl.date) >= startOfMonth) {
                totalFuelSpend += (fl.totalCost || 0);
            }
        });
    });

    let out = `### ⛽ Monthly Transport & Logistics Spend\n\n`;
    out += `*Billing Period: ${startOfMonth.toLocaleDateString()} to Present*\n\n`;
    out += `- **Total Dedicated Project Transport Costs**: **₹${Math.round(totalTransportCost).toLocaleString()}** (${projectTransports.length} shipments logged)\n`;
    out += `- **Fleet Fuel Refill Spend**: **₹${Math.round(totalFuelSpend).toLocaleString()}**\n`;
    out += `- **Combined Transport Spend This Month**: **₹${Math.round(totalTransportCost + totalFuelSpend).toLocaleString()}**\n\n`;

    if (projectTransports.length > 0) {
        out += `#### 📋 Recent Transport Cost Entries\n\n`;
        out += `| Date | Project / Job Order | Vehicle Type | Driver | Destination | Amount |\n`;
        out += `|---|---|---|---|---|---|\n`;
        projectTransports.slice(0, 8).forEach(pt => {
            out += `| ${new Date(pt.transportDate).toLocaleDateString()} | ${pt.projectTitle || pt.jobOrderNumber || 'General'} | ${pt.transportType} | ${pt.driverName || '—'} | ${pt.destination} | **₹${Math.round(pt.totalCost).toLocaleString()}** |\n`;
        });
    }

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. E-WAY BILLS & VEHICLE COMPLIANCE EXPIRIES
 * Questions: "Which E-Way Bills are expiring?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveEWayBills = async (normalized, user) => {
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const [trips, vehicles] = await Promise.all([
        FleetTrip.find({ 'documents.0': { $exists: true } }),
        Vehicle.find({ 'documents.0': { $exists: true } })
    ]);

    const expiringList = [];

    // Inspect Trip Transport documents
    trips.forEach(t => {
        (t.documents || []).forEach(doc => {
            if (doc.expiryDate) {
                const exp = new Date(doc.expiryDate);
                if (exp <= thirtyDaysAhead) {
                    expiringList.push({
                        docNumber: doc.documentNumber || 'E-Way Bill',
                        type: doc.docType || 'E-Way Bill',
                        vehicle: t.vehicleRegistration,
                        expiry: exp,
                        daysLeft: Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    });
                }
            }
        });
    });

    // Inspect Vehicle Statutory Compliance documents
    vehicles.forEach(v => {
        (v.documents || []).forEach(doc => {
            if (doc.expiryDate) {
                const exp = new Date(doc.expiryDate);
                if (exp <= thirtyDaysAhead) {
                    expiringList.push({
                        docNumber: doc.documentNumber || doc.docType,
                        type: doc.docType,
                        vehicle: v.registrationNumber,
                        expiry: exp,
                        daysLeft: Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    });
                }
            }
        });
    });

    expiringList.sort((a, b) => a.expiry - b.expiry);

    let out = `### 📄 E-Way Bills & Statutory Compliance Expiries\n\n`;
    out += `- **Expiring Documents within 30 Days**: **${expiringList.length}**\n\n`;

    if (expiringList.length === 0) {
        out += `> ✅ **All Documents Valid**: No E-Way bills or vehicle statutory compliance certificates are expiring within the next 30 days.\n`;
        return out;
    }

    out += `| Document Type | Document No. | Vehicle | Expiry Date | Validity Status |\n`;
    out += `|---|---|---|---|---|\n`;
    expiringList.forEach(item => {
        const statusBadge = item.daysLeft < 0 ? '🔴 **EXPIRED**' : (item.daysLeft <= 7 ? `⚠️ **${item.daysLeft} Days Left (Urgent)**` : `🟡 ${item.daysLeft} Days Left`);
        out += `| **${item.type}** | \`${item.docNumber}\` | \`${item.vehicle}\` | ${item.expiry.toLocaleDateString()} | ${statusBadge} |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 8. PROJECTS & DELAYS
 * Questions: "Which projects are delayed?", "Etha project delay aayath?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveProjects = async (normalized, user) => {
    const now = new Date();
    const projects = await Project.find().sort({ deadline: 1 });

    const activeProjects = projects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const delayedProjects = activeProjects.filter(p => p.deadline && new Date(p.deadline) < now);

    // If query asks specifically for delayed projects
    if (normalized.filters?.delayedOnly || normalized.cleanQuery.toLowerCase().includes('delay') || normalized.cleanQuery.toLowerCase().includes('vaikiya')) {
        let out = `### ⚠️ Overdue & Delayed Projects Report\n\n`;
        out += `- **Total Overdue Projects**: **${delayedProjects.length}** (out of ${activeProjects.length} active site contracts)\n\n`;

        if (delayedProjects.length === 0) {
            out += `> 🎉 **All Projects On Schedule**: None of our current active projects have exceeded their milestone deadlines!\n`;
            return out;
        }

        out += `| Project Title | Client | Deadline | Overdue By | Current Progress | Value |\n`;
        out += `|---|---|---|---|---|---|\n`;
        delayedProjects.forEach(p => {
            const dl = new Date(p.deadline);
            const daysOverdue = Math.ceil((now - dl) / (1000 * 60 * 60 * 24));
            out += `| **${p.title}** | ${p.client?.name || p.clientName || 'Commercial Client'} | ${dl.toLocaleDateString()} | 🔴 **${daysOverdue} Days Late** | ${p.progress || 0}% | ₹${p.budget?.toLocaleString() || '—'} |\n`;
        });
        return out;
    }

    // Standard Project Progress Overview
    let out = `### 🏗️ Krishna Engineering Works – Active Projects Hub\n\n`;
    out += `- **Active Projects in Progress**: **${activeProjects.length}**\n`;
    out += `- **Delayed / Behind Schedule**: **${delayedProjects.length}**\n`;
    out += `- **Total Lifetime Projects**: **${projects.length}**\n\n`;

    out += `| Project Title | Client | Status | Deadline | Progress |\n`;
    out += `|---|---|---|---|---|\n`;
    activeProjects.slice(0, 10).forEach(p => {
        const isLate = p.deadline && new Date(p.deadline) < now;
        out += `| **${p.title}** | ${p.client?.name || p.clientName || 'Client'} | **${p.status}** | ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'} ${isLate ? '⚠️' : ''} | **${p.progress || 0}%** |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 9. INVENTORY & RAW MATERIAL SHORTAGES
 * Questions: "Which materials are running low?", "Any material shortage?",
 * "Stock kuravulla materials ethokkeya?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveInventory = async (normalized, user) => {
    const [lowStockItems, allMaterials, pendingRequests] = await Promise.all([
        InventoryItem.find({
            type: 'material',
            $expr: { $lte: ['$quantity', '$minThreshold'] }
        }),
        InventoryItem.find({ type: 'material' }),
        MaterialRequest.find({ status: { $in: ['Pending', 'pending'] } })
    ]);

    let out = `### 📦 Raw Materials Stock Shortage & Reorder Alerts\n\n`;
    out += `- **Materials Below Safety Threshold**: **${lowStockItems.length} items** (out of ${allMaterials.length} monitored inventory lines)\n`;
    out += `- **Pending Job Site Material Requests**: **${pendingRequests.length} pending approval**\n\n`;

    if (lowStockItems.length === 0) {
        out += `> ✅ **Adequate Inventory Buffer**: All raw materials (steel plates, pipes, roofing sheets, welding consumables) have sufficient safety stock above configured minimum thresholds.\n`;
        return out;
    }

    out += `| Material Name | Category | Current Stock | Safety Threshold | Unit Rate | Urgency |\n`;
    out += `|---|---|---|---|---|---|\n`;
    lowStockItems.forEach(item => {
        const shortage = (item.minThreshold || 0) - (item.quantity || 0);
        const rateText = item.unitRate ? `₹${item.unitRate.toLocaleString()} / ${item.unit || 'Kg'}` : '—';
        out += `| **${item.name}** | ${item.category || 'Raw Materials'} | 🔴 **${item.quantity} ${item.unit || 'Kg'}** | ${item.minThreshold} ${item.unit || 'Kg'} | ${rateText} | Deficit: ${shortage} ${item.unit} |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 10. FINANCES & PENDING CUSTOMER PAYMENTS (ADMIN ONLY)
 * Questions: "Show pending customer payments", "Pending payment ethra und?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveFinances = async (normalized, user) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [invoices, payments, expenses] = await Promise.all([
        Invoice.find().sort({ createdAt: -1 }),
        Payment.find({ paymentDate: { $gte: startOfMonth }, status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid'] } }),
        Expense.find({ date: { $gte: startOfMonth } })
    ]);

    const pendingInvoices = invoices.filter(i => ['Unpaid', 'Pending', 'Partially Paid'].includes(i.status));
    const totalOutstanding = pendingInvoices.reduce((acc, i) => acc + (i.balance || i.total || 0), 0);
    const totalCollectedThisMonth = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalExpensesThisMonth = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    let out = `### 💳 Outstanding Receivables & Financial Position\n\n`;
    out += `*Authorized Administrator View • Fresh Live Ledgers*\n\n`;
    out += `- **Total Pending Customer Receivables**: **₹${Math.round(totalOutstanding).toLocaleString()}** across **${pendingInvoices.length} pending invoices**\n`;
    out += `- **Collections Received (This Month)**: **₹${Math.round(totalCollectedThisMonth).toLocaleString()}**\n`;
    out += `- **Operational Expenses (This Month)**: **₹${Math.round(totalExpensesThisMonth).toLocaleString()}**\n\n`;

    if (pendingInvoices.length === 0) {
        out += `> 🎉 **Zero Outstanding Arrears**: All client invoices are fully settled!\n`;
        return out;
    }

    out += `#### 📋 Outstanding Client Invoices\n\n`;
    out += `| Invoice No. | Customer Name | Total Value | Balance Due | Due Date | Status |\n`;
    out += `|---|---|---|---|---|---|\n`;
    pendingInvoices.slice(0, 8).forEach(inv => {
        const bal = inv.balance || inv.total || 0;
        out += `| \`${inv.invoiceNumber}\` | **${inv.customer?.name || inv.clientName || 'Client'}** | ₹${inv.total?.toLocaleString()} | 🔴 **₹${Math.round(bal).toLocaleString()}** | ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Immediate'} | **${inv.status}** |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 11. PRODUCTION & JOB ORDERS
 * Questions: "What is today's production?", "Innathe production ethra aanu?"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveProduction = async (normalized, user) => {
    const plans = await ProductionPlan.find().sort({ createdAt: -1 });

    const inProgressPlans = plans.filter(p => ['In Progress', 'Scheduled', 'Ready'].includes(p.status));
    const completedPlans = plans.filter(p => p.status === 'Completed');

    let out = `### ⚙️ Production & Fabrication Plan Status\n\n`;
    out += `- **Active Fabrication Jobs in Progress**: **${inProgressPlans.length}**\n`;
    out += `- **Completed Production Orders**: **${completedPlans.length}**\n\n`;

    if (inProgressPlans.length === 0) {
        out += `> ℹ️ No active production jobs are currently scheduled in the shop floor.\n`;
        return out;
    }

    out += `| Job Order / Plan | Linked Project | Target Quantity | Produced | Scheduled Finish | Status |\n`;
    out += `|---|---|---|---|---|---|\n`;
    inProgressPlans.slice(0, 8).forEach(p => {
        out += `| **${p.planNumber || p.jobOrderNumber || 'Job Order'}** | ${p.projectTitle || 'Project Item'} | ${p.plannedQuantity || 1} ${p.unit || 'pcs'} | ${p.completedQuantity || 0} ${p.unit || 'pcs'} | ${p.targetCompletionDate ? new Date(p.targetCompletionDate).toLocaleDateString() : '—'} | **${p.status}** |\n`;
    });

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 12. MACHINERY DOWNTIME & MAINTENANCE
 * Questions: "Which machines are under maintenance?", "Machinery downtime"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveMachinery = async (normalized, user) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [downtimeLogs, activeRepairs] = await Promise.all([
        MachineLog.find({ date: { $gte: thirtyDaysAgo }, logType: 'DOWNTIME' }),
        ToolRepair.find({ status: { $in: ['In Repair', 'Pending'] } })
    ]);

    const totalDowntimeHours = downtimeLogs.reduce((acc, l) => acc + (l.durationHours || 0), 0);

    let out = `### 🛠️ Plant Machinery Downtime & Maintenance Status\n\n`;
    out += `- **Total Machinery Downtime (Last 30 Days)**: **${parseFloat(totalDowntimeHours.toFixed(1))} hours** (${downtimeLogs.length} incident logs)\n`;
    out += `- **Plant Tools Currently in Repair / Workshop**: **${activeRepairs.length} units**\n\n`;

    if (activeRepairs.length > 0) {
        out += `#### 🔧 Equipment Currently Out for Maintenance\n\n`;
        out += `| Tool / Machine | Repair Vendor | Issue Description | Estimated Return | Spend |\n`;
        out += `|---|---|---|---|---|\n`;
        activeRepairs.forEach(r => {
            out += `| **${r.toolName}** | ${r.repairVendor || 'Authorized Service'} | ${r.issueDescription || 'Repair'} | ${r.estimatedReturnDate ? new Date(r.estimatedReturnDate).toLocaleDateString() : 'In Progress'} | ₹${r.cost || 0} |\n`;
        });
    } else {
        out += `> ✅ All primary fabrication machinery (shear press, overhead cranes, MIG welding rigs, lathe) are operational.\n`;
    }

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 13. USER'S SPECIFIC VEHICLE / TRIPS (Driver or Logged In User)
 * Questions: "My vehicle details", "Assigned to me", "My trips"
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveMyVehicle = async (normalized, user) => {
    let vehicle = null;
    let driver = null;

    if (user.driverRef) {
        driver = await Driver.findById(user.driverRef);
    }
    if (!driver && user._id) {
        driver = await Driver.findOne({ userId: user._id });
    }
    if (!driver && user.phone) {
        driver = await Driver.findOne({ phone: user.phone });
    }

    if (driver?.currentAssignedVehicle?.vehicleId) {
        vehicle = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId);
    }

    if (!vehicle && user._id) {
        vehicle = await Vehicle.findOne({ assignedDriverId: user._id });
    }

    if (!vehicle) {
        const availableCount = await Vehicle.countDocuments({ status: 'Available' });
        const totalVehicles = await Vehicle.countDocuments();
        return `### 🚗 Vehicle Assignment Status\n\nNo specific company vehicle is currently assigned to your account (**${user.name}**).\n\n- Current Fleet Yard Status: **${availableCount} of ${totalVehicles} vehicles** are currently available for assignment.\n- Contact the Fleet Administrator or review the **Fleet & Vehicle Management** module to request a vehicle assignment.`;
    }

    let out = `### 🚗 Your Assigned Company Vehicle\n\n`;
    out += `- **Vehicle Registration**: \`${vehicle.registrationNumber}\`\n`;
    out += `- **Make & Model**: **${vehicle.vehicleName}** (${vehicle.vehicleType})\n`;
    out += `- **Odometer Reading**: **${vehicle.currentOdometer?.toLocaleString()} km**\n`;
    out += `- **Fuel Type**: ${vehicle.fuelType} (Tank Capacity: ${vehicle.tankCapacityLiters || 60}L)\n`;
    out += `- **Current Operational State**: **${vehicle.status}**\n\n`;

    if (vehicle.documents && vehicle.documents.length > 0) {
        out += `#### 📋 Vehicle Compliance & Certificates\n\n`;
        out += `| Certificate | Document Number | Expiry Date |\n`;
        out += `|---|---|---|\n`;
        vehicle.documents.forEach(d => {
            out += `| **${d.docType}** | \`${d.documentNumber}\` | ${d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : 'N/A'} |\n`;
        });
    }

    return out;
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 14. EXECUTIVE BUSINESS SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.resolveExecutiveSummary = async (normalized, user) => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allProjects, lowStockItems, totalMaterials, vehicles, machineLogs, activeDrivers] = await Promise.all([
        Project.find(),
        InventoryItem.find({ type: 'material', $expr: { $lte: ['$quantity', '$minThreshold'] } }),
        InventoryItem.countDocuments({ type: 'material' }),
        Vehicle.find(),
        MachineLog.find({ date: { $gte: thirtyDaysAgo }, logType: 'DOWNTIME' }),
        Driver.countDocuments({ status: 'Active' })
    ]);

    const activeProjects = allProjects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const delayedProjects = activeProjects.filter(p => p.deadline && new Date(p.deadline) < now);
    const activeVehicles = vehicles.filter(v => ['Available', 'On Trip'].includes(v.status));

    let out = `### 🏢 Krishna Engineering Works – Comprehensive Business Executive Summary\n\n`;
    out += `*Generated live on ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}*\n\n`;

    out += `#### 1. Projects & Operations\n`;
    out += `- Active Engineering Contracts: **${activeProjects.length}** (Total registered: ${allProjects.length})\n`;
    out += `- Delayed Projects: **${delayedProjects.length} overdue**\n\n`;

    out += `#### 2. Workforce, Fleet & Inventory\n`;
    out += `- Active Registered Drivers: **${activeDrivers}**\n`;
    out += `- Fleet Readiness: **${activeVehicles.length} / ${vehicles.length}** vehicles operational\n`;
    out += `- Inventory Reorder Alerts: **${lowStockItems.length} items** below minimum stock\n\n`;

    if (user.role === 'admin') {
        const [expenses, invoices, payments] = await Promise.all([
            Expense.find({ date: { $gte: thirtyDaysAgo } }),
            Invoice.find(),
            Payment.find({ status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid'] }, paymentDate: { $gte: thirtyDaysAgo } })
        ]);

        const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const pendingInvoices = invoices.filter(i => ['Unpaid', 'Pending', 'Partially Paid'].includes(i.status));
        const totalOutstanding = pendingInvoices.reduce((s, i) => s + (i.balance || i.total || 0), 0);

        out += `#### 3. Executive Financial Health\n`;
        out += `- Collections (30 Days): **₹${Math.round(totalCollected).toLocaleString()}**\n`;
        out += `- Expenses (30 Days): **₹${Math.round(totalExpenses).toLocaleString()}**\n`;
        out += `- Net Cash Position: **₹${Math.round(totalCollected - totalExpenses).toLocaleString()}**\n`;
        out += `- Outstanding Customer Receivables: **₹${Math.round(totalOutstanding).toLocaleString()}** (${pendingInvoices.length} invoices)\n`;
    }

    return out;
};
