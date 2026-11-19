const mongoose = require('mongoose');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const InventoryItem = require('../models/InventoryItem');
const BillOfMaterials = require('../models/BillOfMaterials');
const ProductionPlan = require('../models/ProductionPlan');
const MachineLog = require('../models/MachineLog');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');

// In-memory query audit log (last 100 queries)
const aiQueryAuditLogs = [];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * USER ASSIGNED VEHICLE RESOLVER
 * Finds the vehicle directly or indirectly assigned to the authenticated user.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function findUserAssignedVehicle(user) {
    if (!user) return null;

    // 1. Direct match on Vehicle.assignedDriverId
    let vehicle = await Vehicle.findOne({ assignedDriverId: user._id });
    if (vehicle) return { vehicle, driver: null };

    // 2. Match through Driver profile
    const userPhone = (user.phone || user.phoneNumber || '').trim();
    const cleanPhone = userPhone.replace(/[^0-9]/g, '');
    const phoneRegex = cleanPhone && cleanPhone.length >= 7 ? new RegExp(cleanPhone.slice(-10)) : null;

    const driverQueries = [];
    if (user._id && mongoose.Types.ObjectId.isValid(user._id)) {
        driverQueries.push({ employeeId: user._id });
    }
    if (user.staff_id) {
        driverQueries.push({ staff_id: user.staff_id });
    }
    if (user.email) {
        driverQueries.push({ email: user.email });
    }
    if (phoneRegex) {
        driverQueries.push({ phone: phoneRegex });
        driverQueries.push({ mobileNumber: phoneRegex });
    }
    if (user.name) {
        driverQueries.push({ fullName: new RegExp(`^${user.name.trim()}$`, 'i') });
    }

    let driver = null;
    if (driverQueries.length > 0) {
        driver = await Driver.findOne({ $or: driverQueries });
    }

    if (driver) {
        // Vehicle linked via Driver's currentAssignedVehicle
        if (driver.currentAssignedVehicle?.vehicleId) {
            vehicle = await Vehicle.findById(driver.currentAssignedVehicle.vehicleId);
            if (vehicle) return { vehicle, driver };
        }
        // Vehicle linked via Vehicle.assignedDriverRef
        vehicle = await Vehicle.findOne({ assignedDriverRef: driver._id });
        if (vehicle) return { vehicle, driver };
    }

    // 3. Fallback match by phone on Vehicle
    if (phoneRegex) {
        vehicle = await Vehicle.findOne({ assignedDriverPhone: phoneRegex });
        if (vehicle) return { vehicle, driver };
    }

    // 4. Fallback match by name on Vehicle
    if (user.name) {
        vehicle = await Vehicle.findOne({ assignedDriverName: new RegExp(`^${user.name.trim()}$`, 'i') });
        if (vehicle) return { vehicle, driver };
    }

    return null;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INTENT CLASSIFIER
 * ─────────────────────────────────────────────────────────────────────────────
 */
function classifyIntent(query) {
    const q = query.toLowerCase().trim();

    // 1. User's specific vehicle
    if (
        q.includes('my vehicle') ||
        q.includes('my car') ||
        q.includes('my truck') ||
        q.includes('my van') ||
        q.includes('assigned to me') ||
        q.includes('assigned vehicle') ||
        q.includes('my assigned') ||
        q.includes('vehicle assigned') ||
        (q.includes('my') && (q.includes('vehicle') || q.includes('truck') || q.includes('car') || q.includes('van') || q.includes('driver')))
    ) {
        return 'MY_VEHICLE';
    }

    // 2. Fleet / All vehicles / Drivers
    if (
        q.includes('fleet') ||
        q.includes('company vehicle') ||
        q.includes('company vehicles') ||
        q.includes('all vehicles') ||
        q.includes('vehicle status') ||
        q.includes('vehicle list') ||
        q.includes('vehicles list') ||
        q.includes('which vehicles') ||
        q.includes('available vehicle') ||
        q.includes('trucks') ||
        q.includes('vans') ||
        q.includes('drivers') ||
        q.includes('driver list')
    ) {
        return 'FLEET_VEHICLES';
    }

    // 3. Delayed / overdue projects
    if (
        q.includes('delayed project') ||
        q.includes('delayed projects') ||
        q.includes('overdue project') ||
        q.includes('overdue projects') ||
        q.includes('late project') ||
        q.includes('late projects') ||
        q.includes('which project is delayed') ||
        q.includes('which projects are delayed') ||
        ((q.includes('project') || q.includes('projects')) && (q.includes('delay') || q.includes('delayed') || q.includes('overdue') || q.includes('late') || q.includes('behind schedule')))
    ) {
        return 'DELAYED_PROJECTS';
    }

    // 4. General projects
    if (
        q.includes('active project') ||
        q.includes('active projects') ||
        q.includes('all projects') ||
        q.includes('project status') ||
        q.includes('project progress') ||
        q.includes('how many projects') ||
        q.includes('project list') ||
        q === 'projects' ||
        q === 'project'
    ) {
        return 'PROJECTS_GENERAL';
    }

    // 5. Inventory & raw materials
    if (
        q.includes('material') ||
        q.includes('materials') ||
        q.includes('inventory') ||
        q.includes('stock') ||
        q.includes('running low') ||
        q.includes('low stock') ||
        q.includes('shortage') ||
        q.includes('restock') ||
        q.includes('consumables') ||
        q.includes('welding rod') ||
        q.includes('steel plate') ||
        q.includes('pipe') ||
        q.includes('pipes')
    ) {
        return 'INVENTORY_MATERIALS';
    }

    // 6. Production & work orders
    if (
        q.includes('production') ||
        q.includes('job order') ||
        q.includes('job orders') ||
        q.includes('work order') ||
        q.includes('work orders') ||
        q.includes('fabrication job') ||
        q.includes('fabrication jobs')
    ) {
        return 'PRODUCTION';
    }

    // 7. Machinery & equipment downtime
    if (
        q.includes('machine') ||
        q.includes('machinery') ||
        q.includes('downtime') ||
        q.includes('breakdown') ||
        q.includes('equipment') ||
        q.includes('utilization') ||
        q.includes('generator') ||
        q.includes('press brake') ||
        q.includes('lathe')
    ) {
        return 'MACHINERY';
    }

    // 8. Finances & revenue (Admin only)
    if (
        q.includes('expense') ||
        q.includes('expenses') ||
        q.includes('income') ||
        q.includes('revenue') ||
        q.includes('profit') ||
        q.includes('payment') ||
        q.includes('payments') ||
        q.includes('outstanding') ||
        q.includes('invoice') ||
        q.includes('invoices') ||
        q.includes('receivable') ||
        q.includes('receivables') ||
        q.includes('cash flow') ||
        q.includes('money') ||
        q.includes('finance') ||
        q.includes('finances') ||
        q.includes('financial')
    ) {
        return 'FINANCES';
    }

    // 9. Staff attendance
    if (
        q.includes('attendance') ||
        q.includes('staff attendance') ||
        q.includes('who is present') ||
        q.includes('absent staff') ||
        q.includes('workers present') ||
        q.includes('present today')
    ) {
        return 'ATTENDANCE';
    }

    // 10. Explicit business summary / executive briefing
    if (
        q.includes('business summary') ||
        q.includes('executive summary') ||
        q.includes('executive briefing') ||
        q.includes('business performance') ||
        q.includes('company performance') ||
        q.includes('overall summary') ||
        q.includes('dashboard summary') ||
        q.includes('summarize business') ||
        q.includes('company overview') ||
        q.includes('erp summary') ||
        q.includes('overall status')
    ) {
        return 'BUSINESS_SUMMARY';
    }

    // 11. Greeting & capabilities
    if (
        q === 'hi' ||
        q === 'hello' ||
        q === 'hey' ||
        q.startsWith('hi ') ||
        q.startsWith('hello ') ||
        q.startsWith('hey ') ||
        q.includes('who are you') ||
        q.includes('what can you do') ||
        q.includes('help') ||
        q.includes('capabilities') ||
        q.includes('how to use')
    ) {
        return 'GREETING';
    }

    return 'UNKNOWN';
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HANDLERS FOR EACH DOMAIN (Fresh Queries directly from DB)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// 1. My Vehicle Query
async function handleMyVehicle(user, userRole) {
    const result = await findUserAssignedVehicle(user);

    // Fleet stats for context
    const totalVehicles = await Vehicle.countDocuments();
    const availableCount = await Vehicle.countDocuments({ status: 'Available' });
    const onTripCount = await Vehicle.countDocuments({ status: 'On Trip' });
    const inMaintenanceCount = await Vehicle.countDocuments({ status: { $in: ['In Maintenance', 'Out of Service'] } });

    if (!result || !result.vehicle) {
        if (userRole === 'admin') {
            return `### 🚗 Vehicle Assignment Status\n\nNo specific company vehicle is currently assigned to your administrator account (**${user?.name || 'Administrator'}**).\n\nAs an administrator, you have full oversight of the company fleet:\n- **Total Fleet Vehicles**: ${totalVehicles} registered\n- **Available for Dispatch**: ${availableCount}\n- **Currently on Field Trips**: ${onTripCount}\n- **In Maintenance / Service**: ${inMaintenanceCount}\n\n> 💡 **Fleet Management**: You can register new vehicles, assign drivers, or track trip odometers in the **Fleet & Vehicle Management** module.`;
        } else {
            return `### 🚗 Vehicle Assignment Status\n\nNo company vehicle is currently assigned to your staff profile (**${user?.name || 'Staff Member'}**).\n\n- If you require a vehicle for site transport, material delivery, or client visits, please contact the **Fleet Administrator** to assign a vehicle to your profile in the Fleet & Vehicle Management module.\n- Current Yard Availability: **${availableCount} of ${totalVehicles} vehicles** are currently available in the central yard.`;
        }
    }

    const { vehicle, driver } = result;
    const now = new Date();

    let report = `### 🚗 Your Assigned Vehicle Details\n\n`;
    report += `- **Vehicle Name**: ${vehicle.vehicleName}\n`;
    report += `- **Registration Number**: **${vehicle.registrationNumber}**\n`;
    report += `- **Vehicle Type**: ${vehicle.vehicleType}\n`;
    report += `- **Fuel Type**: ${vehicle.fuelType}\n`;
    report += `- **Operational Status**: **${vehicle.status}**\n`;
    report += `- **Current Odometer**: **${(vehicle.currentOdometer || 0).toLocaleString()} km**\n`;
    report += `- **Driver Name**: ${vehicle.assignedDriverName || driver?.fullName || user.name}\n`;
    if (vehicle.assignedDriverPhone || driver?.mobileNumber || driver?.phone) {
        report += `- **Driver Contact**: ${vehicle.assignedDriverPhone || driver?.mobileNumber || driver?.phone}\n`;
    }
    if (vehicle.driverLicenseNumber || driver?.licenseNumber) {
        report += `- **Driving Licence**: ${vehicle.driverLicenseNumber || driver?.licenseNumber}\n`;
    }

    // Document compliance check
    if (vehicle.documents && vehicle.documents.length > 0) {
        report += `\n#### 📋 Vehicle Compliance & Documents:\n`;
        vehicle.documents.forEach(doc => {
            const exp = new Date(doc.expiryDate);
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            let status = 'Valid';
            if (daysLeft < 0) status = 'EXPIRED';
            else if (daysLeft <= 30) status = `Expiring soon (${daysLeft} days)`;
            report += `- **${doc.docType}**: ${status} (Expires: ${exp.toLocaleDateString()})\n`;
        });
    }

    // Recent trip
    if (vehicle.trips && vehicle.trips.length > 0) {
        const lastTrip = vehicle.trips[vehicle.trips.length - 1];
        report += `\n#### 🛣️ Latest Trip Log:\n`;
        report += `- Destination: **${lastTrip.destination}**\n`;
        report += `- Date: ${new Date(lastTrip.date).toLocaleDateString()}\n`;
        report += `- Purpose: ${lastTrip.purpose || 'Site Delivery'}\n`;
        report += `- Status: ${lastTrip.status}\n`;
    }

    return report;
}

// 2. Fleet & Vehicles Overview
async function handleFleetVehicles(userRole) {
    const vehicles = await Vehicle.find().sort({ registrationNumber: 1 });

    if (vehicles.length === 0) {
        return `### 🚚 Company Fleet & Transport Overview\n\nThere are currently **no vehicles registered** in the ERP database.\n\n> 💡 Fleet administrators can register vehicles, track trips, and assign drivers in the **Fleet & Vehicle Management** module.`;
    }

    const available = vehicles.filter(v => v.status === 'Available');
    const onTrip = vehicles.filter(v => v.status === 'On Trip');
    const inMaintenance = vehicles.filter(v => ['In Maintenance', 'Out of Service'].includes(v.status));

    let report = `### 🚚 Company Fleet & Transport Overview\n\n`;
    report += `- **Total Registered Vehicles**: **${vehicles.length}**\n`;
    report += `- **Available in Yard**: **${available.length}**\n`;
    report += `- **Currently on Trips**: **${onTrip.length}**\n`;
    report += `- **In Maintenance / Service**: **${inMaintenance.length}**\n\n`;

    report += `| Vehicle Name | Reg. Number | Type | Status | Assigned Driver |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- |\n`;
    vehicles.forEach(v => {
        const driverName = v.assignedDriverName || 'Unassigned';
        report += `| **${v.vehicleName}** | ${v.registrationNumber} | ${v.vehicleType} | ${v.status} | ${driverName} |\n`;
    });

    return report;
}

// 3. Delayed Projects Query
async function handleDelayedProjects() {
    const now = new Date();
    const allProjects = await Project.find().populate('customerId', 'name');
    const activeProjects = allProjects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const delayedProjects = activeProjects.filter(p => {
        const isStatusDelayed = p.status === 'Delayed' || p.status === 'delayed';
        const isPastDeadline = p.deadline && new Date(p.deadline) < now;
        return isStatusDelayed || isPastDeadline;
    });

    if (delayedProjects.length === 0) {
        return `### ✅ Project Progress & Schedule Status\n\nAll **${activeProjects.length} active projects** are currently on track! No projects have crossed their scheduled target deadline.`;
    }

    let report = `### ⚠️ Delayed Projects Report (${delayedProjects.length} Overdue)\n\n`;
    report += `Currently, **${delayedProjects.length} out of ${activeProjects.length} active projects** have exceeded their scheduled target completion deadline:\n\n`;

    delayedProjects.forEach((p, idx) => {
        const clientName = p.customerId?.name || 'Registered Client';
        const deadlineDate = p.deadline ? new Date(p.deadline).toLocaleDateString() : 'Not Set';
        const daysOverdue = p.deadline ? Math.ceil((now - new Date(p.deadline)) / (1000 * 60 * 60 * 24)) : 0;
        report += `${idx + 1}. **${p.title}** (Client: ${clientName})\n`;
        report += `   - Current Progress: **${p.progress || 0}%**\n`;
        report += `   - Target Deadline: ${deadlineDate}\n`;
        if (daysOverdue > 0) {
            report += `   - Overdue By: **${daysOverdue} days**\n`;
        }
        report += `   - Service Type: ${p.serviceType || 'Structural Fabrication'}\n\n`;
    });

    report += `> 💡 **Recommendation**: Review fabrication bottlenecks in Production Planning or reallocate welding resources to expedite delayed milestones.`;
    return report;
}

// 4. Projects General Query
async function handleProjectsGeneral(query) {
    const allProjects = await Project.find().populate('customerId', 'name');

    // Check if user is asking about a specific project by title
    const cleanQuery = query.toLowerCase().replace(/projects|project|details|status|about|show|what is/g, '').trim();
    if (cleanQuery.length >= 3) {
        const matched = allProjects.find(p => p.title.toLowerCase().includes(cleanQuery));
        if (matched) {
            const clientName = matched.customerId?.name || 'Registered Client';
            const deadlineDate = matched.deadline ? new Date(matched.deadline).toLocaleDateString() : 'Not Set';
            let report = `### 🏗️ Project Details: ${matched.title}\n\n`;
            report += `- **Client**: ${clientName}\n`;
            report += `- **Status**: **${matched.status}**\n`;
            report += `- **Progress**: **${matched.progress || 0}%**\n`;
            report += `- **Service Type**: ${matched.serviceType || 'Fabrication'}\n`;
            report += `- **Deadline**: ${deadlineDate}\n`;
            if (matched.budget) {
                report += `- **Budget**: ₹${matched.budget.toLocaleString()}\n`;
            }
            return report;
        }
    }

    const active = allProjects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const completed = allProjects.filter(p => ['completed', 'Completed'].includes(p.status));
    const cancelled = allProjects.filter(p => ['cancelled', 'Cancelled'].includes(p.status));

    let report = `### 🏗️ Projects Status & Pipeline Overview\n\n`;
    report += `- **Total Registered Projects**: **${allProjects.length}**\n`;
    report += `- **Active in Progress**: **${active.length}**\n`;
    report += `- **Successfully Completed**: **${completed.length}**\n`;
    report += `- **Cancelled**: **${cancelled.length}**\n\n`;

    if (active.length > 0) {
        report += `| Project Title | Client | Status | Progress | Target Deadline |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- |\n`;
        active.slice(0, 10).forEach(p => {
            const client = p.customerId?.name || 'Client';
            const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A';
            report += `| **${p.title}** | ${client} | ${p.status} | ${p.progress || 0}% | ${deadline} |\n`;
        });
    }

    return report;
}

// 5. Inventory & Materials Query
async function handleInventoryMaterials(query) {
    const allMaterials = await InventoryItem.find({ type: 'material' });

    // Check if query targets a specific material name
    const cleanQuery = query.toLowerCase().replace(/material|materials|stock|inventory|quantity|level|how much|what is/g, '').trim();
    if (cleanQuery.length >= 3) {
        const matched = allMaterials.find(m => m.name.toLowerCase().includes(cleanQuery) || (m.code && m.code.toLowerCase().includes(cleanQuery)));
        if (matched) {
            const isLow = matched.quantity <= (matched.minThreshold || 0);
            let report = `### 📦 Material Stock Check: ${matched.name}\n\n`;
            report += `- **Current Stock**: **${matched.quantity} ${matched.unit}**\n`;
            report += `- **Minimum Safety Threshold**: ${matched.minThreshold || 0} ${matched.unit}\n`;
            report += `- **Item Code / SKU**: ${matched.code || 'N/A'}\n`;
            report += `- **Status**: **${isLow ? '⚠️ LOW STOCK (Restock Required)' : '✅ Healthy Stock Level'}**\n`;
            if (matched.location) {
                report += `- **Storage Location**: ${matched.location}\n`;
            }
            return report;
        }
    }

    const lowStock = allMaterials.filter(m => m.quantity <= (m.minThreshold || 0));

    let report = `### 📦 Raw Material & Inventory Health Report\n\n`;
    report += `- **Total Tracked Materials**: **${allMaterials.length}**\n`;
    report += `- **Items Below Safety Stock Threshold**: **${lowStock.length} items**\n\n`;

    if (lowStock.length === 0) {
        report += `✅ All raw materials (MS plates, pipes, structural beams, welding consumables) are maintained above safety minimum threshold levels.`;
    } else {
        report += `| Material Name | Item Code | Current Stock | Minimum Required | Action |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- |\n`;
        lowStock.forEach(m => {
            report += `| **${m.name}** | ${m.code || 'N/A'} | ${m.quantity} ${m.unit} | ${m.minThreshold || 0} ${m.unit} | ⚠️ Purchase Required |\n`;
        });
        report += `\n> 💡 **Procurement Alert**: Create Purchase Orders for low-stock steel plates, pipes, or consumables in the Inventory module.`;
    }

    return report;
}

// 6. Production Query
async function handleProduction() {
    const now = new Date();
    const allPlans = await ProductionPlan.find();
    const active = allPlans.filter(p => ['Scheduled', 'In Production'].includes(p.status));
    const delayed = allPlans.filter(p => {
        const isPastDue = p.plannedCompletionDate && new Date(p.plannedCompletionDate) < now;
        return (isPastDue || p.status === 'Delayed') && !['Completed', 'Cancelled'].includes(p.status);
    });

    let report = `### 🏭 Production Planning & Work Orders Summary\n\n`;
    report += `- **Total Production Plans**: **${allPlans.length}**\n`;
    report += `- **Active in Production**: **${active.length}**\n`;
    report += `- **Delayed Job Orders**: **${delayed.length}**\n\n`;

    if (delayed.length > 0) {
        report += `#### Delayed Job Orders:\n`;
        delayed.forEach((d, idx) => {
            report += `${idx + 1}. **${d.planNumber}: ${d.title}** (${d.projectTitle || 'Project'})\n`;
            report += `   - Target Finish: ${d.plannedCompletionDate ? new Date(d.plannedCompletionDate).toLocaleDateString() : 'N/A'}\n`;
            report += `   - Quantity Completed: ${d.totalCompletedQuantity || 0} / ${d.totalPlannedQuantity || 0} ${d.unit || 'units'}\n\n`;
        });
    } else {
        report += `✅ All scheduled fabrication stages and production orders are currently progressing on time.`;
    }

    return report;
}

// 7. Machinery Query
async function handleMachinery() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await MachineLog.find({ date: { $gte: thirtyDaysAgo } });
    const downtimeLogs = logs.filter(l => l.logType === 'DOWNTIME');
    const totalDowntimeHours = downtimeLogs.reduce((s, l) => s + (l.durationHours || 0), 0);

    let report = `### ⚙️ Machine Utilization & Downtime Analytics (Past 30 Days)\n\n`;
    report += `- **Total Downtime Recorded**: **${parseFloat(totalDowntimeHours.toFixed(1))} hours** across ${downtimeLogs.length} incident(s).\n\n`;

    if (downtimeLogs.length > 0) {
        report += `#### Recent Breakdown & Stoppage Incidents:\n`;
        downtimeLogs.slice(0, 5).forEach((b, idx) => {
            report += `${idx + 1}. **${b.machineName}**: ${b.durationHours || 0} hrs lost due to *${b.downtimeReason || 'Maintenance'}* on ${new Date(b.date).toLocaleDateString()}\n`;
        });
        report += `\n> 💡 **Maintenance Advisory**: Schedule routine servicing for high-downtime welding generators and hydraulic press brakes.`;
    } else {
        report += `✅ Workshop machinery operated with zero major breakdown downtime in the past 30 days!`;
    }

    return report;
}

// 8. Finances Query (Strictly Admin Only)
async function handleFinances(userRole) {
    if (userRole !== 'admin') {
        return `🔒 **Access Restricted**\n\nFinancial records, operating expenses, client receivables, and revenue balances are accessible only to Executive Management and Administrators.`;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [expenses, invoices, payments] = await Promise.all([
        Expense.find({ date: { $gte: thirtyDaysAgo } }),
        Invoice.find(),
        Payment.find({
            status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid'] },
            paymentDate: { $gte: thirtyDaysAgo }
        })
    ]);

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const netCashFlow = totalCollected - totalExpenses;

    const pendingInvoices = invoices.filter(i => ['Unpaid', 'Pending', 'Partially Paid'].includes(i.status));
    const totalOutstanding = pendingInvoices.reduce((s, i) => s + (i.balance || i.total || 0), 0);

    const expenseByCategory = {};
    expenses.forEach(e => {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
    });

    let report = `### 💰 Monthly Financial Performance & Cash Position\n\n`;
    report += `- **Total Customer Payments Collected (30 Days)**: **₹${Math.round(totalCollected).toLocaleString()}**\n`;
    report += `- **Total Operating Expenses (30 Days)**: **₹${Math.round(totalExpenses).toLocaleString()}**\n`;
    report += `- **Net Operational Cash Flow**: **₹${Math.round(netCashFlow).toLocaleString()}**\n`;
    report += `- **Total Outstanding Client Receivables**: **₹${Math.round(totalOutstanding).toLocaleString()}** (${pendingInvoices.length} pending invoices)\n\n`;

    if (Object.keys(expenseByCategory).length > 0) {
        report += `#### Major Expense Categories (30 Days):\n`;
        for (const [cat, amt] of Object.entries(expenseByCategory)) {
            report += `- **${cat.toUpperCase()}**: ₹${Math.round(amt).toLocaleString()}\n`;
        }
    }

    return report;
}

// 9. Attendance Query
async function handleAttendance() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await DailyAttendance.find({ date: { $gte: today } });
    const totalStaff = await User.countDocuments({ role: 'staff', status: 'active' });

    const present = records.filter(r => r.status === 'Present');
    const absent = records.filter(r => r.status === 'Absent');
    const onLeave = records.filter(r => r.status === 'On Leave');

    let report = `### 👥 Today's Workforce Attendance Status\n\n`;
    report += `- **Active Registered Staff**: **${totalStaff}**\n`;
    report += `- **Present on Duty**: **${present.length}**\n`;
    report += `- **Absent**: **${absent.length}**\n`;
    report += `- **On Approved Leave**: **${onLeave.length}**\n\n`;

    if (present.length === 0 && totalStaff > 0) {
        report += `> ℹ️ Attendance records for today are currently being processed or scanned.`;
    }

    return report;
}

// 10. Business Summary / Executive Briefing
async function handleBusinessSummary(userRole) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allProjects, lowStockItems, totalMaterials, vehicles, machineLogs] = await Promise.all([
        Project.find(),
        InventoryItem.find({ type: 'material', $expr: { $lte: ['$quantity', '$minThreshold'] } }),
        InventoryItem.countDocuments({ type: 'material' }),
        Vehicle.find(),
        MachineLog.find({ date: { $gte: thirtyDaysAgo }, logType: 'DOWNTIME' })
    ]);

    const activeProjects = allProjects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const delayedProjects = activeProjects.filter(p => p.deadline && new Date(p.deadline) < now);
    const activeVehicles = vehicles.filter(v => ['Available', 'On Trip'].includes(v.status));
    const totalDowntimeHours = machineLogs.reduce((s, l) => s + (l.durationHours || 0), 0);

    let report = `### 🏢 Krishna Engineering Works – Comprehensive Business Executive Summary\n\n`;
    report += `*Generated automatically from live ERP databases on ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}*\n\n`;

    report += `#### 1. Projects & Operations\n`;
    report += `- Active Projects: **${activeProjects.length}** (Total registered: ${allProjects.length})\n`;
    report += `- Delayed Projects: **${delayedProjects.length} overdue**\n\n`;

    report += `#### 2. Inventory & Fleet\n`;
    report += `- Materials Requiring Restock: **${lowStockItems.length} items** (out of ${totalMaterials} tracked)\n`;
    report += `- Fleet Readiness: **${activeVehicles.length} / ${vehicles.length}** vehicles active\n\n`;

    report += `#### 3. Equipment & Plant Health\n`;
    report += `- Machinery Downtime (30 Days): **${parseFloat(totalDowntimeHours.toFixed(1))} hours** across ${machineLogs.length} incident(s)\n\n`;

    if (userRole === 'admin') {
        const [expenses, invoices, payments] = await Promise.all([
            Expense.find({ date: { $gte: thirtyDaysAgo } }),
            Invoice.find(),
            Payment.find({ status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid'] }, paymentDate: { $gte: thirtyDaysAgo } })
        ]);

        const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const pendingInvoices = invoices.filter(i => ['Unpaid', 'Pending', 'Partially Paid'].includes(i.status));
        const totalOutstanding = pendingInvoices.reduce((s, i) => s + (i.balance || i.total || 0), 0);

        report += `#### 4. Financial Health (Executive Only)\n`;
        report += `- Collections (30 Days): **₹${Math.round(totalCollected).toLocaleString()}**\n`;
        report += `- Expenses (30 Days): **₹${Math.round(totalExpenses).toLocaleString()}**\n`;
        report += `- Net Operational Position: **₹${Math.round(totalCollected - totalExpenses).toLocaleString()}**\n`;
        report += `- Outstanding Client Receivables: **₹${Math.round(totalOutstanding).toLocaleString()}** (${pendingInvoices.length} pending invoices)\n`;
    }

    return report;
}

// 11. Greeting & Capabilities
function handleGreeting(user, userRole) {
    const greeting = user?.name ? `Hello, **${user.name}**! 👋` : `Hello! 👋`;
    return `${greeting} Welcome to the **Krishna Engineering Works AI ERP Copilot**.\n\nI am connected directly to our live ERP databases with zero cached data. Here is what you can ask me:\n\n- **Project Status & Delays**: *"Which projects are delayed?"* or *"Show active projects"*\n- **Inventory & Raw Materials**: *"Which raw materials are running low?"* or *"Stock of MS Plate"*\n- **Vehicle & Fleet Management**: *"My vehicle details"* or *"Fleet status"*\n- **Production Orders**: *"Which production jobs are pending?"*\n- **Machinery Health**: *"Highest machine downtime this month"*\n${userRole === 'admin' ? '- **Financial Analytics (Admin)**: *"What were this month\'s total expenses?"* or *"Pending client payments"*\n' : ''}- **Executive Briefing**: *"Summarize business performance"*\n\nHow can I assist you with your operations today?`;
}

// 12. Clarifying Follow-up for Unclear Queries
function handleUnknown(query, userRole) {
    return `### 🤖 AI ERP Copilot\n\nI couldn't identify a specific ERP record or category matching: **"${query}"**\n\nTo ensure you receive accurate live data, please select or ask about one of the following ERP areas:\n\n- **Projects & Milestones**: e.g., *"Which projects are delayed?"* or *"Show project status"*\n- **Inventory & Materials**: e.g., *"Which raw materials are running low?"* or *"Check material stock"*\n- **Vehicle & Fleet**: e.g., *"My vehicle details"* or *"Show company fleet"*\n- **Production Plans**: e.g., *"Active production jobs"*\n- **Machinery & Downtime**: e.g., *"Machine breakdown logs"*\n${userRole === 'admin' ? '- **Financial Overview**: e.g., *"Total pending customer payments"* or *"Monthly expenses"*\n' : ''}- **Executive Summary**: e.g., *"Summarize business performance"*\n\nIf you are searching for a specific project or material by name, please double-check the spelling.`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DISPATCHER: Route Query to Correct Live Data Source
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function processErpQuery(query, user, userRole) {
    const intent = classifyIntent(query);

    switch (intent) {
        case 'MY_VEHICLE':
            return await handleMyVehicle(user, userRole);

        case 'FLEET_VEHICLES':
            return await handleFleetVehicles(userRole);

        case 'DELAYED_PROJECTS':
            return await handleDelayedProjects();

        case 'PROJECTS_GENERAL':
            return await handleProjectsGeneral(query);

        case 'INVENTORY_MATERIALS':
            return await handleInventoryMaterials(query);

        case 'PRODUCTION':
            return await handleProduction();

        case 'MACHINERY':
            return await handleMachinery();

        case 'FINANCES':
            return await handleFinances(userRole);

        case 'ATTENDANCE':
            return await handleAttendance();

        case 'BUSINESS_SUMMARY':
            return await handleBusinessSummary(userRole);

        case 'GREETING':
            return handleGreeting(user, userRole);

        case 'UNKNOWN':
        default:
            return handleUnknown(query, userRole);
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLLER ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

// POST /api/ai-erp/query
exports.askAiAssistant = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a question or query for the ERP assistant.'
            });
        }

        const user = req.user;
        const userRole = user?.role || 'staff';

        if (userRole === 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: The internal AI ERP Copilot is accessible only to authorized Krishna Engineering staff and management.'
            });
        }

        // Fresh live processing
        const responseText = await processErpQuery(query.trim(), user, userRole);

        // Fetch quick live stats for UI pills
        const now = new Date();
        const [activeProjectsCount, delayedProjectsCount, lowStockCount, vehiclesCount] = await Promise.all([
            Project.countDocuments({ status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] } }),
            Project.countDocuments({
                status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] },
                $or: [{ status: { $in: ['Delayed', 'delayed'] } }, { deadline: { $lt: now } }]
            }),
            InventoryItem.countDocuments({ type: 'material', $expr: { $lte: ['$quantity', '$minThreshold'] } }),
            Vehicle.countDocuments()
        ]);

        // Audit Log entry
        const auditEntry = {
            id: Date.now().toString(),
            query: query.trim(),
            user: user?.name || 'Staff User',
            userRole,
            timestamp: new Date(),
            responseLength: responseText.length
        };
        aiQueryAuditLogs.unshift(auditEntry);
        if (aiQueryAuditLogs.length > 100) aiQueryAuditLogs.pop();

        res.json({
            success: true,
            query: query.trim(),
            response: responseText,
            generatedAt: new Date(),
            dataSnapshot: {
                activeProjects: activeProjectsCount,
                delayedProjects: delayedProjectsCount,
                lowStockCount,
                totalVehicles: vehiclesCount
            }
        });
    } catch (err) {
        console.error('askAiAssistant error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal server error while processing query.' });
    }
};

// GET /api/ai-erp/audit-logs
exports.getAiAuditLogs = async (req, res) => {
    try {
        res.json({ success: true, count: aiQueryAuditLogs.length, logs: aiQueryAuditLogs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
