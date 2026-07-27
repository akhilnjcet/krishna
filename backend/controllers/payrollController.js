const Salary = require('../models/Salary');
const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const User = require('../models/User');
const { recalculateSalary } = require('../utils/salaryCalculator');

// Calculate draft payroll for a month
exports.calculateDraftPayroll = async (req, res) => {
    try {
        const { staffId, month } = req.query; // month Format: YYYY-MM
        if (!staffId || !month) {
            return res.status(400).json({ message: "Staff ID and month are required." });
        }

        const result = await recalculateSalary(staffId, month);

        res.json({
            staffId,
            staffName: result.salaryRecord.staffId?.name || '',
            month,
            salaryType: result.salaryRecord.salaryType,
            baseSalary: result.salaryRecord.baseSalary,
            calculatedBase: result.earnedSalary,
            totalWorkingDays: result.salaryRecord.totalWorkingDays,
            presentDays: result.salaryRecord.presentDays,
            absentDays: result.salaryRecord.absentDays,
            halfDays: result.salaryRecord.halfDays,
            leaveDays: result.salaryRecord.leaveDays,
            holidays: result.salaryRecord.holidays,
            overtimeHours: result.salaryRecord.overtimeHours,
            overtimeEarnings: result.approvedOvertime,
            pendingOvertime: result.pendingOvertime,
            bonus: result.salaryRecord.bonus,
            deductions: result.salaryRecord.deductions,
            advanceRecovery: result.salaryRecord.advanceRecovery,
            totalEarnedSalary: result.earnedSalary,
            salaryAlreadyPaid: result.salaryRecord.salaryAlreadyPaid,
            salaryAdvance: result.salaryRecord.salaryAdvance,
            remainingBalance: result.salaryRecord.remainingBalance,
            outstandingAmount: result.salaryRecord.outstandingAmount,
            payments: result.salaryRecord.payments,
            netSalary: result.netPayable,
            hourlyRate: result.hourlyRate,
            totalWorkedHours: result.totalWorkedHours
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create and Save Monthly Payroll Record
exports.createPayroll = async (req, res) => {
    try {
        const { staffId, month } = req.body;

        if (!staffId || !month) {
            return res.status(400).json({ message: "Staff ID and month are required." });
        }

        const result = await recalculateSalary(staffId, month);

        res.status(201).json({ message: "Payroll recorded successfully.", payroll: result.salaryRecord });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get payroll records
exports.getPayrollRecords = async (req, res) => {
    try {
        const { month, staffId } = req.query;
        let query = {};

        if (month) query.month = month;
        if (staffId) query.staffId = staffId;

        const records = await Salary.find(query)
            .populate('staffId', 'name email staff_id department designation upi_id bank_name account_number ifsc_code joiningDate phone')
            .sort({ month: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update salary payment status
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { status } = req.body; // status: 'paid' or 'unpaid'
        
        if (!['paid', 'unpaid'].includes(status)) {
            return res.status(400).json({ message: "Invalid payment status. Must be 'paid' or 'unpaid'." });
        }

        const payroll = await Salary.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: "Payroll record not found." });
        }

        payroll.paymentStatus = status;
        payroll.paidAt = status === 'paid' ? Date.now() : undefined;
        await payroll.save();

        res.json({ message: `Payment status updated to ${status}.`, payroll });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add salary payment transaction (supports partial, advance, final settlement, and overpayment)
exports.addSalaryPayment = async (req, res) => {
    try {
        const { staffId, month, amount, type, paymentMethod, notes, approvedBy, reason, exceededAllowed } = req.body;

        if (!staffId || !month || !amount || !type) {
            return res.status(400).json({ message: "Staff ID, month, amount, and type are required." });
        }

        let salary = await Salary.findOne({ staffId, month });
        if (!salary) {
            const staff = await User.findById(staffId);
            if (!staff) {
                return res.status(404).json({ message: "Staff member not found." });
            }
            salary = new Salary({
                staffId,
                month,
                baseSalary: staff.base_salary || 0,
                salaryType: staff.salaryType || 'Monthly',
                totalEarnedSalary: staff.base_salary || 0,
                netSalary: staff.base_salary || 0,
                payments: []
            });
        }

        const newTransaction = {
            amount: parseFloat(amount),
            type,
            paymentMethod,
            notes,
            processedBy: req.user.id,
            createdAt: new Date(),
            approvedBy,
            reason,
            exceededAllowed: !!exceededAllowed
        };

        salary.payments.push(newTransaction);
        await salary.save();

        // Recalculate using unified helper
        const result = await recalculateSalary(staffId, month);

        // Log transaction in the General Expense Ledger
        const Expense = require('../models/Expense');
        const staffObj = await User.findById(staffId);
        await Expense.create({
            title: `Staff Pay (${type}): ${staffObj ? staffObj.name : 'Employee'}`,
            amount: parseFloat(amount),
            category: 'staff',
            description: `Month: ${month}. Method: ${paymentMethod}. Remarks: ${notes || 'N/A'}${exceededAllowed ? ` (Exceeded balance approved by ${approvedBy} for: ${reason})` : ''}`,
            recordedBy: req.user.id,
            date: new Date()
        });

        res.status(201).json({ message: "Transaction added successfully.", salary: result.salaryRecord });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
