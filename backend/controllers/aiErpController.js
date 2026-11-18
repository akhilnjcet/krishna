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
const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');

// In-memory query audit log (can also persist to DB)
const aiQueryAuditLogs = [];

/**
 * Live Grounded Data Gatherer for ERP
 */
async function gatherErpSnapshot(userRole) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Projects
    const allProjects = await Project.find().populate('customerId', 'name');
    const activeProjects = allProjects.filter(p => !['completed', 'Completed', 'cancelled', 'Cancelled'].includes(p.status));
    const delayedProjects = activeProjects.filter(p => p.deadline && new Date(p.deadline) < now);

    // 2. Production
    const allPlans = await ProductionPlan.find();
    const activePlans = allPlans.filter(p => ['Scheduled', 'In Production'].includes(p.status));
    const delayedPlans = allPlans.filter(p => {
        const isPastDue = p.plannedCompletionDate && new Date(p.plannedCompletionDate) < now;
        return (isPastDue || p.status === 'Delayed') && !['Completed', 'Cancelled'].includes(p.status);
    });

    // 3. Inventory & Materials
    const lowStockItems = await InventoryItem.find({
        type: 'material',
        $expr: { $lte: ['$quantity', '$minThreshold'] }
    });
    const totalMaterialsCount = await InventoryItem.countDocuments({ type: 'material' });

    // 4. Machinery & Downtime
    const recentMachineLogs = await MachineLog.find({ date: { $gte: thirtyDaysAgo } });
    const downtimeLogs = recentMachineLogs.filter(l => l.logType === 'DOWNTIME');
    const totalDowntimeHours = downtimeLogs.reduce((s, l) => s + (l.durationHours || 0), 0);

    // 5. Vehicles & Fleet
    const vehicles = await Vehicle.find();
    const activeVehicles = vehicles.filter(v => v.status === 'Available' || v.status === 'On Trip');

    // 6. Finances (Restricted to Admin / Owner)
    let financialData = null;
    if (userRole === 'admin') {
        const expenses = await Expense.find({ date: { $gte: thirtyDaysAgo } });
        const totalExpensesMonth = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        
        // Group expenses by category
        const expenseByCategory = {};
        expenses.forEach(e => {
            expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
        });

        const invoices = await Invoice.find();
        const pendingInvoices = invoices.filter(i => ['Unpaid', 'Pending', 'Partially Paid'].includes(i.status));
        const totalOutstandingRevenue = pendingInvoices.reduce((s, i) => s + (i.balance || i.total || 0), 0);

        const payments = await Payment.find({
            status: { $in: ['Completed', 'VERIFIED', 'PAID', 'Paid'] },
            paymentDate: { $gte: thirtyDaysAgo }
        });
        const totalCollectedMonth = payments.reduce((s, p) => s + (p.amount || 0), 0);

        financialData = {
            totalExpensesMonth: Math.round(totalExpensesMonth),
            expenseByCategory,
            totalOutstandingRevenue: Math.round(totalOutstandingRevenue),
            pendingInvoicesCount: pendingInvoices.length,
            totalCollectedMonth: Math.round(totalCollectedMonth),
            netCashFlowMonth: Math.round(totalCollectedMonth - totalExpensesMonth)
        };
    }

    return {
        timestamp: now,
        projects: {
            total: allProjects.length,
            active: activeProjects.length,
            delayed: delayedProjects.length,
            delayedList: delayedProjects.map(p => ({
                id: p._id,
                title: p.title,
                customer: p.customerId?.name || 'Client',
                deadline: p.deadline,
                progress: p.progress
            }))
        },
        production: {
            total: allPlans.length,
            active: activePlans.length,
            delayed: delayedPlans.length,
            delayedList: delayedPlans.map(p => ({
                planNumber: p.planNumber,
                title: p.title,
                project: p.projectTitle,
                plannedEnd: p.plannedCompletionDate,
                completedQty: p.totalCompletedQuantity,
                plannedQty: p.totalPlannedQuantity,
                unit: p.unit
            }))
        },
        inventory: {
            totalMaterialsCount,
            lowStockCount: lowStockItems.length,
            lowStockList: lowStockItems.slice(0, 10).map(m => ({
                name: m.name,
                code: m.code,
                currentQty: m.quantity,
                minThreshold: m.minThreshold,
                unit: m.unit
            }))
        },
        machinery: {
            downtimeIncidentCount: downtimeLogs.length,
            totalDowntimeHours: parseFloat(totalDowntimeHours.toFixed(1)),
            recentBreakdowns: downtimeLogs.slice(0, 5).map(l => ({
                machine: l.machineName,
                reason: l.downtimeReason,
                hours: l.durationHours,
                date: l.date
            }))
        },
        fleet: {
            totalVehicles: vehicles.length,
            activeVehicles: activeVehicles.length
        },
        finances: financialData
    };
}

/**
 * Deterministic Natural Language Engine (100% Grounded in Live DB Metrics)
 */
function synthesizeErpInsight(prompt, snapshot, userRole) {
    const q = prompt.toLowerCase();

    // 1. Projects & Delay Queries
    if (q.includes('delayed project') || q.includes('which project') || (q.includes('project') && (q.includes('delay') || q.includes('late') || q.includes('pending') || q.includes('progress')))) {
        const delayed = snapshot.projects.delayedList;
        if (delayed.length === 0) {
            return `### ✅ Project Progress Overview\n\nAll **${snapshot.projects.active} active projects** are currently on track! No projects have crossed their scheduled deadline.`;
        }
        let report = `### ⚠️ Delayed Projects Report (${delayed.length} Overdue)\n\n`;
        report += `Currently, **${delayed.length} out of ${snapshot.projects.active} active projects** have exceeded their scheduled target completion deadline:\n\n`;
        delayed.forEach((p, idx) => {
            const daysOverdue = Math.ceil((new Date() - new Date(p.deadline)) / (1000 * 60 * 60 * 24));
            report += `${idx + 1}. **${p.title}** (Client: ${p.customer})\n`;
            report += `   - Current Progress: **${p.progress}%**\n`;
            report += `   - Target Deadline: ${new Date(p.deadline).toLocaleDateString()}\n`;
            report += `   - Overdue By: **${daysOverdue} days**\n\n`;
        });
        report += `> 💡 **Recommendation**: Reschedule milestones or reassign welding/assembly staff to clear critical fabrication bottlenecks.`;
        return report;
    }

    // 2. Production Planning Queries
    if (q.includes('production') || q.includes('job order') || q.includes('fabrication job')) {
        const delayed = snapshot.production.delayedList;
        let report = `### 🏭 Production Planning & Work Orders Summary\n\n`;
        report += `- **Total Production Plans**: ${snapshot.production.total}\n`;
        report += `- **Active in Production**: ${snapshot.production.active}\n`;
        report += `- **Delayed Plans**: ${snapshot.production.delayed}\n\n`;

        if (delayed.length > 0) {
            report += `#### Delayed Production Orders:\n`;
            delayed.forEach((d, idx) => {
                report += `${idx + 1}. **${d.planNumber}: ${d.title}** (${d.project})\n`;
                report += `   - Target Finish: ${new Date(d.plannedEnd).toLocaleDateString()}\n`;
                report += `   - Progress: ${d.completedQty} / ${d.plannedQty} ${d.unit}\n\n`;
            });
        } else {
            report += `✅ All scheduled production stages and job work orders are running within their planned timetable.\n`;
        }
        return report;
    }

    // 3. Inventory & Raw Materials Queries
    if (q.includes('material') || q.includes('inventory') || q.includes('running low') || q.includes('stock') || q.includes('shortage')) {
        const low = snapshot.inventory.lowStockList;
        let report = `### 📦 Raw Material & Inventory Health Report\n\n`;
        report += `- **Total Tracked Materials**: ${snapshot.inventory.totalMaterialsCount}\n`;
        report += `- **Items Below Minimum Threshold**: **${snapshot.inventory.lowStockCount} items**\n\n`;

        if (low.length > 0) {
            report += `| Material Name | Code / SKU | Current Stock | Minimum Required | Action |\n`;
            report += `| :--- | :--- | :--- | :--- | :--- |\n`;
            low.forEach(m => {
                report += `| **${m.name}** | ${m.code || 'N/A'} | <span style="color:red;font-weight:bold;">${m.currentQty} ${m.unit}</span> | ${m.minThreshold} ${m.unit} | ⚠️ Purchase Indent Needed |\n`;
            });
            report += `\n> 💡 **Procurement Alert**: Create Purchase Orders for critical steel sections and welding consumables to avoid production downtime.`;
        } else {
            report += `✅ All raw materials (MS pipes, plates, channels, welding rods) are maintained above safety threshold stock levels.`;
        }
        return report;
    }

    // 4. Machinery, Breakdown & Downtime Queries
    if (q.includes('machine') || q.includes('downtime') || q.includes('breakdown') || q.includes('equipment') || q.includes('utilization')) {
        let report = `### ⚙️ Machine Utilization & Downtime Analytics (Past 30 Days)\n\n`;
        report += `- **Total Downtime Recorded**: **${snapshot.machinery.totalDowntimeHours} hours** across ${snapshot.machinery.downtimeIncidentCount} incident(s).\n\n`;

        if (snapshot.machinery.recentBreakdowns.length > 0) {
            report += `#### Major Breakdown Incidents:\n`;
            snapshot.machinery.recentBreakdowns.forEach((b, idx) => {
                report += `${idx + 1}. **${b.machine}**: ${b.hours} hrs lost due to *${b.reason}* on ${new Date(b.date).toLocaleDateString()}\n`;
            });
            report += `\n> 💡 **Maintenance Advisory**: Schedule preventive servicing for high-downtime welding generators and hydraulic press brakes.`;
        } else {
            report += `✅ Workshop machinery operated with zero major breakdown downtime in the last 30 days!`;
        }
        return report;
    }

    // 5. Financial Queries (Strictly Role-Protected)
    if (q.includes('expense') || q.includes('income') || q.includes('payment') || q.includes('outstanding') || q.includes('profit') || q.includes('finance') || q.includes('money') || q.includes('cash flow')) {
        if (userRole !== 'admin') {
            return `🔒 **Access Restricted**: Financial records, company income, expenses, and profitability analytics are strictly restricted to Executive Management & Admin users.`;
        }

        const fin = snapshot.finances;
        let report = `### 💰 Monthly Financial Performance & Cash Position\n\n`;
        report += `- **Total Customer Payments Collected (30 Days)**: **₹${fin.totalCollectedMonth.toLocaleString()}**\n`;
        report += `- **Total Operating Expenses (30 Days)**: **₹${fin.totalExpensesMonth.toLocaleString()}**\n`;
        report += `- **Net Operational Cash Flow**: <strong style="color:${fin.netCashFlowMonth >= 0 ? '#10b981' : '#ef4444'}">₹${fin.netCashFlowMonth.toLocaleString()}</strong>\n`;
        report += `- **Total Outstanding Client Receivables**: **₹${fin.totalOutstandingRevenue.toLocaleString()}** (${fin.pendingInvoicesCount} pending invoices)\n\n`;

        if (fin.expenseByCategory && Object.keys(fin.expenseByCategory).length > 0) {
            report += `#### Expense Breakdown:\n`;
            for (const [cat, amt] of Object.entries(fin.expenseByCategory)) {
                report += `- **${cat.toUpperCase()}**: ₹${amt.toLocaleString()}\n`;
            }
        }
        return report;
    }

    // 6. Comprehensive Business Performance Summary (Default / Executive Briefing)
    let summary = `### 🏢 Krishna Engineering Works – Comprehensive Business Executive Summary\n\n`;
    summary += `*Generated automatically from verified live ERP databases on ${snapshot.timestamp.toLocaleDateString()} at ${snapshot.timestamp.toLocaleTimeString()}*\n\n`;
    summary += `#### 1. Projects & Operations\n`;
    summary += `- Active Projects: **${snapshot.projects.active}** (Total registered: ${snapshot.projects.total})\n`;
    summary += `- Delayed Projects: <strong style="color:${snapshot.projects.delayed > 0 ? '#ef4444' : '#10b981'}">${snapshot.projects.delayed} overdue</strong>\n`;
    summary += `- Active Production Jobs: **${snapshot.production.active}**\n\n`;

    summary += `#### 2. Inventory & Fleet\n`;
    summary += `- Materials Requiring Restock: <strong style="color:${snapshot.inventory.lowStockCount > 0 ? '#ef4444' : '#10b981'}">${snapshot.inventory.lowStockCount} items</strong>\n`;
    summary += `- Fleet Readiness: **${snapshot.fleet.activeVehicles} / ${snapshot.fleet.totalVehicles}** vehicles active in field\n\n`;

    summary += `#### 3. Equipment & Plant Health\n`;
    summary += `- Total Machinery Downtime (30 Days): **${snapshot.machinery.totalDowntimeHours} hours** (${snapshot.machinery.downtimeIncidentCount} breakdown logs)\n\n`;

    if (userRole === 'admin' && snapshot.finances) {
        summary += `#### 4. Financial Health (Executive Only)\n`;
        summary += `- Collections (30 Days): **₹${snapshot.finances.totalCollectedMonth.toLocaleString()}**\n`;
        summary += `- Expenses (30 Days): **₹${snapshot.finances.totalExpensesMonth.toLocaleString()}**\n`;
        summary += `- Net Position: **₹${snapshot.finances.netCashFlowMonth.toLocaleString()}**\n`;
        summary += `- Pending Client Receivables: **₹${snapshot.finances.totalOutstandingRevenue.toLocaleString()}**\n`;
    }

    return summary;
}

// ─── ASK AI ERP ASSISTANT ───────────────────────────────────────────
exports.askAiAssistant = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide a question or query for the ERP assistant.' });
        }

        const userRole = req.user?.role || 'customer';
        if (userRole === 'customer') {
            return res.status(403).json({ success: false, message: 'Access denied: The internal AI ERP Assistant is only accessible to authorized Krishna Engineering staff and management.' });
        }

        // 1. Gather live ERP data
        const snapshot = await gatherErpSnapshot(userRole);

        // 2. Synthesize accurate insight
        let insight = synthesizeErpInsight(query, snapshot, userRole);

        // 3. Optional LLM enhancement if GEMINI_API_KEY is available and configured
        if (process.env.GEMINI_API_KEY && query.length > 25 && !query.toLowerCase().includes('raw')) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

                const contextPrompt = `You are the Senior Industrial ERP AI Assistant for Krishna Engineering Works (Fabrication & Engineering, Thiruvazhiyode, Kerala).
Answer the user's query authoritatively using ONLY the verified ERP ground-truth data provided below.
Do not invent any numbers, dates, or clients. Format with markdown tables and bullet points.

VERIFIED ERP DATA SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}

USER ROLE: ${userRole} (Note: Staff cannot see financial/revenue figures).
USER QUERY: "${query}"`;

                const result = await model.generateContent(contextPrompt);
                const text = result?.response?.text();
                if (text && text.trim().length > 50) {
                    insight = text;
                }
            } catch (llmErr) {
                console.warn('Gemini LLM optional enhancement skipped, falling back to deterministic synthesizer:', llmErr.message);
            }
        }

        // Audit Log
        const auditEntry = {
            id: Date.now().toString(),
            query: query.trim(),
            user: req.user?.name || 'Staff User',
            userRole,
            timestamp: new Date(),
            responseLength: insight.length
        };
        aiQueryAuditLogs.unshift(auditEntry);
        if (aiQueryAuditLogs.length > 100) aiQueryAuditLogs.pop();

        res.json({
            success: true,
            query,
            response: insight,
            generatedAt: new Date(),
            dataSnapshot: {
                activeProjects: snapshot.projects.active,
                delayedProjects: snapshot.projects.delayed,
                lowStockCount: snapshot.inventory.lowStockCount,
                downtimeHours: snapshot.machinery.totalDowntimeHours
            }
        });
    } catch (err) {
        console.error('askAiAssistant error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET AI QUERY AUDIT LOGS ────────────────────────────────────────
exports.getAiAuditLogs = async (req, res) => {
    try {
        res.json({ success: true, count: aiQueryAuditLogs.length, logs: aiQueryAuditLogs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
