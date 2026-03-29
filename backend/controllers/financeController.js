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

        const totalIncome = invoices
            .filter(inv => inv.paymentStatus === 'paid')
            .reduce((sum, inv) => sum + inv.amount, 0);

        const totalStaffExpense = salaries.reduce((sum, sal) => sum + sal.salaryAmount, 0);
        const totalOtherExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalExpense = totalStaffExpense + totalOtherExpense;

        const pendingDues = invoices
            .filter(inv => inv.paymentStatus === 'unpaid')
            .reduce((sum, inv) => sum + inv.amount, 0);

        res.json({
            totalIncome,
            totalExpense,
            netProfit: totalIncome - totalExpense,
            pendingDues,
            expenseBreakdown: {
                staff: totalStaffExpense,
                others: totalOtherExpense
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get staff salary history
// @route   GET /api/finance/staff-salary
exports.getStaffSalary = async (req, res) => {
    try {
        const history = await Salary.find({ staffId: req.user.id }).sort({ month: -1 });
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
        const totalPaid = invoices
            .filter(inv => inv.paymentStatus === 'paid')
            .reduce((sum, inv) => sum + inv.amount, 0);

        res.json({
            totalInvoiced,
            totalPaid,
            remainingDues: totalInvoiced - totalPaid,
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
        res.status(500).json({ message: err.message });
    }
};
