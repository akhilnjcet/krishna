const User = require('../models/User');
const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const Salary = require('../models/Salary');

/**
 * Recalculates salary parameters for a staff member for a specific month (Format: YYYY-MM)
 */
async function recalculateSalary(staffId, month) {
    try {
        const staff = await User.findById(staffId);
        if (!staff || staff.role !== 'staff') {
            throw new Error('Staff member not found');
        }

        // 1. Fetch attendance records for this month
        const attendanceRecords = await DailyAttendance.find({
            staffId,
            date: { $regex: `^${month}` }
        });

        let presentDays = 0;
        let absentDays = 0;
        let halfDays = 0;
        let leaveDays = 0;
        let holidays = 0;
        let totalWorkedHours = 0;

        const stdHours = staff.standardWorkingHoursPerDay || 8;

        attendanceRecords.forEach(a => {
            if (a.isApproved !== false) {
                if (a.status === 'Present') {
                    presentDays++;
                    totalWorkedHours += a.workedHours || stdHours;
                } else if (a.status === 'Half Day') {
                    halfDays++;
                    totalWorkedHours += a.workedHours || (stdHours / 2);
                } else if (a.status === 'Absent') {
                    absentDays++;
                } else if (a.status === 'Leave') {
                    leaveDays++;
                } else if (a.status === 'Holiday') {
                    holidays++;
                }
            }
        });

        // 2. Fetch overtime records
        const overtimeRecords = await Overtime.find({
            staffId,
            date: { $regex: `^${month}` }
        });

        let approvedOvertime = 0;
        let pendingOvertime = 0;
        let overtimeHours = 0;

        overtimeRecords.forEach(ot => {
            if (ot.status === 'Approved') {
                approvedOvertime += ot.totalAmount || 0;
                overtimeHours += ot.hours || 0;
            } else if (ot.status === 'Pending') {
                pendingOvertime += ot.totalAmount || 0;
            }
        });

        // 3. Formulas
        const baseSalary = staff.base_salary || 0;
        const workingDays = staff.workingDaysPerMonth || 26;
        const workingHoursPerDay = staff.standardWorkingHoursPerDay || 8;
        
        // Rates
        const hourlyRate = parseFloat((baseSalary / (workingDays * workingHoursPerDay)).toFixed(2));
        const perDayRate = parseFloat((baseSalary / workingDays).toFixed(2));

        let earnedSalary = 0;
        if (staff.salaryType === 'Daily Wage') {
            const activeDays = presentDays + (halfDays * 0.5);
            if (activeDays > 0) {
                earnedSalary = parseFloat((activeDays * perDayRate).toFixed(2));
            } else if (totalWorkedHours > 0) {
                earnedSalary = parseFloat((totalWorkedHours * hourlyRate).toFixed(2));
            } else {
                earnedSalary = 0;
            }
        } else {
            // Monthly Fixed Salary
            if (attendanceRecords.length === 0) {
                // Default to full base salary when no attendance records logged yet
                earnedSalary = baseSalary;
            } else {
                // Attendance-based deduction calculation
                const unpaidDeduction = parseFloat(((absentDays * perDayRate) + (halfDays * 0.5 * perDayRate)).toFixed(2));
                earnedSalary = Math.max(0, parseFloat((baseSalary - unpaidDeduction).toFixed(2)));
            }
        }

        const bonus = staff.bonusAmount || 0;
        const deductions = staff.deductionAmount || 0;
        const advancePaid = staff.advanceAmount || 0;

        // Fetch existing salary record to retrieve payment history
        let salaryRecord = await Salary.findOne({ staffId, month });
        const payments = salaryRecord ? (salaryRecord.payments || []) : [];

        // Sum all recorded payment transactions
        const salaryAlreadyPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Net Payable = Earned Salary + Approved Overtime + Bonus - Deductions - Advance Recovery
        const netPayable = Math.max(0, parseFloat((earnedSalary + approvedOvertime + bonus - deductions - advancePaid).toFixed(2)));
        
        // Remaining Salary = Net Payable - Already Paid
        const remainingBalance = parseFloat((netPayable - salaryAlreadyPaid).toFixed(2));
        const outstandingAmount = remainingBalance < 0 ? Math.abs(remainingBalance) : 0;

        const paymentStatus = (salaryAlreadyPaid >= netPayable && netPayable > 0) 
            ? 'paid' 
            : (salaryAlreadyPaid > 0 ? 'partially_paid' : 'unpaid');

        // Update or insert salary record with payments array preserved
        salaryRecord = await Salary.findOneAndUpdate(
            { staffId, month },
            {
                baseSalary,
                salaryType: staff.salaryType || 'Monthly',
                totalWorkingDays: workingDays,
                presentDays,
                absentDays,
                halfDays,
                leaveDays,
                holidays,
                overtimeHours,
                overtimeEarnings: approvedOvertime,
                bonus,
                deductions,
                advanceRecovery: advancePaid,
                
                totalEarnedSalary: earnedSalary,
                salaryAlreadyPaid,
                salaryAdvance: advancePaid,
                remainingBalance,
                outstandingAmount,
                
                netSalary: netPayable,
                paymentStatus,
                payments
            },
            { upsert: true, new: true }
        );

        return {
            salaryRecord,
            hourlyRate,
            earnedSalary,
            approvedOvertime,
            pendingOvertime,
            totalWorkedHours,
            netPayable,
            remainingBalance
        };
    } catch (error) {
        console.error(`Error recalculating salary for staff ${staffId}:`, error);
        throw error;
    }
}

module.exports = { recalculateSalary };
