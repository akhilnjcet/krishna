const Invoice = require('../models/Invoice');
const Salary = require('../models/Salary');
const Expense = require('../models/Expense');

// @desc    Get complete administrative financial overview
// @route   GET /api/finance/admin-overview
exports.getAdminOverview = async (req, res) => {
    try {
        const [invoices, salaries, expenses] = await Promise.all([
            Invoice.find(),
            Salary.find({ paymentStatus: 'paid' }),
            Expense.find()
        ]);

        const Payment = require('../models/Payment');
        const completedPayments = await Payment.find({ status: { $in: ['verified', 'Completed'] } });
        const totalVerifiedPayments = completedPayments.reduce((sum, p) => sum + p.amount, 0);

        const incomeEntries = expenses.filter(e => e.type === 'income');
        const expenseEntries = expenses.filter(e => e.type !== 'income');

        const totalLoggedIncome = incomeEntries.reduce((sum, exp) => sum + exp.amount, 0);
        const totalIncome = totalVerifiedPayments + totalLoggedIncome;

        const totalStaffExpense = salaries.reduce((sum, sal) => sum + (sal.netSalary || sal.salaryAmount || 0), 0);
        const totalOtherExpense = expenseEntries.reduce((sum, exp) => sum + exp.amount, 0);
        const totalExpense = totalStaffExpense + totalOtherExpense;

        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const pendingDues = Math.max(0, totalInvoiced - totalIncome);

        res.json({
            totalIncome,
            totalExpense,
            netProfit: totalIncome - totalExpense,
            pendingDues,
            expenseBreakdown: {
                staff: totalStaffExpense,
                others: totalOtherExpense,
                loggedIncome: totalLoggedIncome,
                verifiedPayments: totalVerifiedPayments
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get staff salary history (always recalculates current month for freshness)
// @route   GET /api/finance/staff-salary
exports.getStaffSalary = async (req, res) => {
    try {
        const staffId = req.user.id;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Always recalculate the current month so the payout hub reflects the latest attendance
        try {
            const { recalculateSalary } = require('../utils/salaryCalculator');
            await recalculateSalary(staffId, currentMonth);
        } catch (calcErr) {
            // Non-fatal — still return whatever is stored
            console.warn(`Salary recalculation skipped for staff ${staffId}:`, calcErr.message);
        }

        const history = await Salary.find({ staffId })
            .populate('staffId', 'name email staff_id department designation upi_id bank_name account_number ifsc_code joiningDate phone')
            .sort({ month: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get customer financial status
// @route   GET /api/finance/customer-dues
exports.getCustomerDues = async (req, res) => {
    try {
        const invoices = await Invoice.find({ customerId: req.user.id });
        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);

        const Payment = require('../models/Payment');
        const completedPayments = await Payment.find({ customerId: req.user.id, status: { $in: ['verified', 'Completed'] } });
        const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            totalInvoiced,
            totalPaid,
            remainingDues: Math.max(0, totalInvoiced - totalPaid),
            invoiceCount: invoices.length,
            pendingCount: invoices.filter(inv => inv.paymentStatus === 'unpaid').length
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    CRUD Operations for general expenses (Admin)
exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addExpense = async (req, res) => {
    try {
        const expense = await Expense.create({ ...req.body, recordedBy: req.user.id });
        res.status(201).json(expense);
    } catch (err) {
        console.error("Expense creation failed:", err.message);
        res.status(500).json({ message: err.message });
    }
};

exports.addSalary = async (req, res) => {
    try {
        const { staffId, month, salaryAmount, paymentStatus } = req.body;
        const salary = await Salary.findOneAndUpdate(
            { staffId, month },
            { 
                baseSalary: salaryAmount, 
                netSalary: salaryAmount, 
                paymentStatus 
            },
            { upsert: true, new: true }
        );
        res.status(201).json(salary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── CASH FLOW FORECASTING ENGINE ───

const CashFlowAdjustment = require('../models/CashFlowAdjustment');
const User = require('../models/User');

// @desc Get 7, 30, 60, 90 Day Cash Flow Forecast
// @route GET /api/finance/cash-flow-forecast
exports.getCashFlowForecast = async (req, res) => {
    try {
        const { horizon = '30' } = req.query; // 7, 30, 60, 90
        const days = parseInt(horizon, 10) || 30;

        const now = new Date();
        const horizonDate = new Date();
        horizonDate.setDate(now.getDate() + days);

        // 1. Calculate Actual Current Opening Balance (Cash + Bank Available)
        const [payments, incomeExpenses, paidExpenses, paidSalaries, unpaidInvoices, activeStaff, adjustments] = await Promise.all([
            require('../models/Payment').find({ status: { $in: ['verified', 'Completed'] } }),
            Expense.find({ type: 'income' }),
            Expense.find({ type: { $ne: 'income' } }),
            Salary.find({ paymentStatus: 'paid' }),
            Invoice.find({ status: { $in: ['unpaid', 'Unpaid', 'Pending'] } }),
            User.find({ role: 'staff', isActive: { $ne: false } }),
            CashFlowAdjustment.find({ isRealized: false })
        ]);

        const totalVerifiedReceipts = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalLoggedIncome = incomeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalOpeningInflow = totalVerifiedReceipts + totalLoggedIncome;

        const totalPaidExpenses = paidExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalPaidSalaries = paidSalaries.reduce((sum, s) => sum + (Number(s.netSalary || s.salaryAmount) || 0), 0);
        const totalOpeningOutflow = totalPaidExpenses + totalPaidSalaries;

        const currentAvailableBalance = parseFloat((totalOpeningInflow - totalOpeningOutflow).toFixed(2));

        // 2. Classify Inflows
        let confirmedInflows = 0;
        let scheduledInflows = 0;
        let estimatedInflows = 0;
        let overdueInflows = 0;
        const upcomingInflowItems = [];

        // Unpaid Invoices
        unpaidInvoices.forEach(inv => {
            const amt = Number(inv.amount) || 0;
            const due = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.createdAt).setDate(new Date(inv.createdAt).getDate() + 15));

            if (due < now) {
                overdueInflows += amt;
            } else if (due <= horizonDate) {
                confirmedInflows += amt;
                upcomingInflowItems.push({
                    type: 'Customer Invoice',
                    reference: inv.invoiceNumber || 'INV',
                    description: inv.description || 'Customer Invoice Receivable',
                    amount: amt,
                    dueDate: due,
                    status: 'Confirmed'
                });
            }
        });

        // User-Defined Inflow Adjustments
        adjustments.filter(a => a.flowType === 'INFLOW').forEach(adj => {
            const expDate = new Date(adj.expectedDate);
            if (expDate <= horizonDate) {
                const amt = Number(adj.amount) || 0;
                if (adj.isConfirmed) {
                    confirmedInflows += amt;
                } else if (adj.confidenceLevel === 'High') {
                    scheduledInflows += amt;
                } else {
                    estimatedInflows += amt;
                }
                upcomingInflowItems.push({
                    type: adj.category,
                    reference: adj.sourceReference || 'ADJ-IN',
                    description: adj.title,
                    amount: amt,
                    dueDate: expDate,
                    status: adj.isConfirmed ? 'Confirmed' : adj.confidenceLevel
                });
            }
        });

        const totalExpectedInflow = parseFloat((confirmedInflows + scheduledInflows + estimatedInflows).toFixed(2));

        // 3. Classify Outflows
        let confirmedOutflows = 0;
        let scheduledOutflows = 0;
        let estimatedOutflows = 0;
        const upcomingOutflowItems = [];

        // Monthly Salary Obligations for Active Staff
        const avgSalaryPerStaff = 18000; // Average baseline monthly wage
        const monthsInHorizon = Math.max(1, Math.ceil(days / 30));
        const estimatedMonthlyPayroll = activeStaff.length * avgSalaryPerStaff;
        const payrollObligation = estimatedMonthlyPayroll * (days / 30);

        scheduledOutflows += payrollObligation;
        upcomingOutflowItems.push({
            type: 'Staff Salary Obligation',
            reference: 'PAYROLL-CYCLE',
            description: `Estimated payroll obligations for ${activeStaff.length} active staff over ${days} days`,
            amount: parseFloat(payrollObligation.toFixed(2)),
            dueDate: new Date(new Date().setDate(now.getDate() + Math.min(days, 25))),
            status: 'Scheduled'
        });

        // Historical Average Operating Burn Rate (Last 60 days expenses)
        const past60Days = new Date();
        past60Days.setDate(past60Days.getDate() - 60);
        const recentExpenses = paidExpenses.filter(e => new Date(e.date || e.createdAt) >= past60Days);
        const recentExpenseSum = recentExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const dailyOperatingBurn = recentExpenseSum > 0 ? (recentExpenseSum / 60) : 500;
        const projectedOperatingExpenses = dailyOperatingBurn * days;

        estimatedOutflows += projectedOperatingExpenses;
        upcomingOutflowItems.push({
            type: 'Operating Expenses',
            reference: 'RUN-BURN',
            description: `Projected overheads, fuel, utilities & site costs (${days} days @ ₹${Math.round(dailyOperatingBurn)}/day)`,
            amount: parseFloat(projectedOperatingExpenses.toFixed(2)),
            dueDate: horizonDate,
            status: 'Estimated'
        });

        // User-Defined Outflow Adjustments
        adjustments.filter(a => a.flowType === 'OUTFLOW').forEach(adj => {
            const expDate = new Date(adj.expectedDate);
            if (expDate <= horizonDate) {
                const amt = Number(adj.amount) || 0;
                if (adj.isConfirmed) {
                    confirmedOutflows += amt;
                } else if (adj.confidenceLevel === 'High') {
                    scheduledOutflows += amt;
                } else {
                    estimatedOutflows += amt;
                }
                upcomingOutflowItems.push({
                    type: adj.category,
                    reference: adj.sourceReference || 'ADJ-OUT',
                    description: adj.title,
                    amount: amt,
                    dueDate: expDate,
                    status: adj.isConfirmed ? 'Confirmed' : adj.confidenceLevel
                });
            }
        });

        const totalExpectedOutflow = parseFloat((confirmedOutflows + scheduledOutflows + estimatedOutflows).toFixed(2));

        // 4. Projected Closing Balance & Runway
        const projectedClosingBalance = parseFloat((currentAvailableBalance + totalExpectedInflow - totalExpectedOutflow).toFixed(2));
        const dailyNetBurn = totalExpectedOutflow / days;
        const runwayDays = dailyNetBurn > 0 ? Math.max(0, Math.round(currentAvailableBalance / dailyNetBurn)) : 999;

        // 5. Intelligent Cash Flow Alerts
        const alerts = [];
        if (projectedClosingBalance < 0) {
            alerts.push({
                severity: 'CRITICAL',
                title: 'Projected Cash Shortage Alert',
                message: `Projected cash deficit of ₹${Math.abs(projectedClosingBalance).toLocaleString('en-IN')} by end of ${days} days horizon.`
            });
        }
        if (overdueInflows > 0) {
            alerts.push({
                severity: 'WARNING',
                title: 'Overdue Customer Receivables',
                message: `₹${overdueInflows.toLocaleString('en-IN')} in unpaid customer invoices is past due date.`
            });
        }
        if (runwayDays < 15) {
            alerts.push({
                severity: 'WARNING',
                title: 'Limited Cash Runway',
                message: `Available cash reserves provide approximately ${runwayDays} days of operations.`
            });
        }

        // Multi-Horizon Projections for Quick Matrix (7, 30, 60, 90)
        const horizons = [7, 30, 60, 90].map(hDays => {
            const inf = (totalExpectedInflow / days) * hDays;
            const outf = (totalExpectedOutflow / days) * hDays;
            const close = currentAvailableBalance + inf - outf;
            return {
                days: hDays,
                expectedInflow: Math.round(inf),
                expectedOutflow: Math.round(outf),
                projectedClosingBalance: Math.round(close),
                hasShortage: close < 0
            };
        });

        res.json({
            success: true,
            horizon: days,
            openingBalance: currentAvailableBalance,
            inflows: {
                confirmed: confirmedInflows,
                scheduled: scheduledInflows,
                estimated: estimatedInflows,
                overdue: overdueInflows,
                total: totalExpectedInflow,
                items: upcomingInflowItems
            },
            outflows: {
                confirmed: confirmedOutflows,
                scheduled: scheduledOutflows,
                estimated: estimatedOutflows,
                total: totalExpectedOutflow,
                items: upcomingOutflowItems
            },
            projectedClosingBalance,
            runwayDays,
            alerts,
            horizons
        });

    } catch (err) {
        console.error("Cash Flow Forecast failed:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Add a Manual Cash Flow Expected Adjustment
// @route POST /api/finance/adjustments
exports.addCashFlowAdjustment = async (req, res) => {
    try {
        const { title, flowType, category, amount, expectedDate, confidenceLevel, isConfirmed, sourceReference, notes } = req.body;
        if (!title || !flowType || !amount || !expectedDate) {
            return res.status(400).json({ success: false, message: 'Title, flowType, amount, and expectedDate are required' });
        }

        const adjustment = await CashFlowAdjustment.create({
            title: title.trim(),
            flowType,
            category: category || (flowType === 'INFLOW' ? 'Other Expected Inflow' : 'Other Expected Outflow'),
            amount: Number(amount),
            expectedDate: new Date(expectedDate),
            confidenceLevel: confidenceLevel || 'High',
            isConfirmed: !!isConfirmed,
            sourceReference: sourceReference || '',
            notes: notes || '',
            createdBy: req.user ? req.user.id : null,
            createdByName: req.user ? req.user.name : 'Admin'
        });

        res.status(201).json({ success: true, adjustment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Get all Cash Flow Adjustments
// @route GET /api/finance/adjustments
exports.getCashFlowAdjustments = async (req, res) => {
    try {
        const adjustments = await CashFlowAdjustment.find().sort({ expectedDate: 1 });
        res.json({ success: true, adjustments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Delete a Cash Flow Adjustment
// @route DELETE /api/finance/adjustments/:id
exports.deleteCashFlowAdjustment = async (req, res) => {
    try {
        await CashFlowAdjustment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Adjustment deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
