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
