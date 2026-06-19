const Salary = require('../models/Salary');
const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const User = require('../models/User');

// Calculate draft payroll for a month
exports.calculateDraftPayroll = async (req, res) => {
    try {
        const { staffId, month } = req.query; // month Format: YYYY-MM
        if (!staffId || !month) {
            return res.status(400).json({ message: "Staff ID and month are required." });
        }

        const staff = await User.findOne({ _id: staffId, role: 'staff' });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found." });
        }

        // 1. Fetch monthly attendance records
        const attendance = await DailyAttendance.find({
            staffId,
            date: { $regex: `^${month}` }
        });

        let presentDays = 0;
        let absentDays = 0;
        let halfDays = 0;
        let leaveDays = 0;
        let holidays = 0;
        const totalWorkingDays = attendance.length;

        attendance.forEach(a => {
            if (a.status === 'Present') presentDays++;
            else if (a.status === 'Absent') absentDays++;
            else if (a.status === 'Half Day') halfDays++;
            else if (a.status === 'Leave') leaveDays++;
            else if (a.status === 'Holiday') holidays++;
        });

        // 2. Calculate Base Salary based on Salary Type
        let baseSalary = staff.base_salary || 0;
        let calculatedBase = 0;
        const salaryType = staff.salaryType || 'Monthly';

        if (salaryType === 'Daily Wage') {
            calculatedBase = baseSalary * (presentDays + (halfDays * 0.5));
        } else {
            // 'Monthly' or 'Contract' - fixed pay
            calculatedBase = baseSalary;
        }

        // 3. Fetch Overtime records for the month
        const overtimeEntries = await Overtime.find({
            staffId,
            date: { $regex: `^${month}` }
        });

        let overtimeHours = 0;
        let overtimeEarnings = 0;
        overtimeEntries.forEach(o => {
            overtimeHours += o.hours;
            overtimeEarnings += o.totalAmount;
        });

        // 4. Default financial modifiers from staff profile
        const bonus = staff.bonusAmount || 0;
        const deductions = staff.deductionAmount || 0;
        const advanceRecovery = staff.advanceAmount || 0;

        // Net Salary calculation
        const netSalary = calculatedBase + overtimeEarnings + bonus - deductions - advanceRecovery;

        res.json({
            staffId,
            staffName: staff.name,
            month,
            salaryType,
            baseSalary,
            calculatedBase,
            totalWorkingDays,
            presentDays,
            absentDays,
            halfDays,
            leaveDays,
            holidays,
            overtimeHours,
            overtimeEarnings,
            bonus,
            deductions,
            advanceRecovery,
            netSalary: Math.max(0, netSalary)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create and Save Monthly Payroll Record
exports.createPayroll = async (req, res) => {
    try {
        const { 
            staffId, month, baseSalary, salaryType, totalWorkingDays, 
            presentDays, absentDays, halfDays, leaveDays, holidays, 
            overtimeHours, overtimeEarnings, bonus, deductions, 
            advanceRecovery, netSalary 
        } = req.body;

        if (!staffId || !month || netSalary === undefined) {
            return res.status(400).json({ message: "Staff ID, month, and net salary are required." });
        }

        const payroll = await Salary.findOneAndUpdate(
            { staffId, month },
            {
                baseSalary,
                salaryType,
                totalWorkingDays,
                presentDays,
                absentDays,
                halfDays,
                leaveDays,
                holidays,
                overtimeHours,
                overtimeEarnings,
                bonus,
                deductions,
                advanceRecovery,
                netSalary,
                paymentStatus: 'unpaid'
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Payroll record created for staff ${staffId} for month ${month}`);
        res.status(201).json({ message: "Payroll recorded successfully.", payroll });
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
