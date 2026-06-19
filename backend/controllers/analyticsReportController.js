const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const Salary = require('../models/Salary');
const ProjectStatusHistory = require('../models/ProjectStatusHistory');
const User = require('../models/User');
const Task = require('../models/Task');

// 1. Staff Attendance Report
exports.getAttendanceReport = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        let matchQuery = {};
        if (month) {
            matchQuery.date = { $regex: `^${month}` };
        }

        const records = await DailyAttendance.find(matchQuery)
            .populate('staffId', 'name staff_id department designation')
            .sort({ date: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Monthly Payroll Report
exports.getPayrollReport = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        let query = {};
        if (month) query.month = month;

        const records = await Salary.find(query)
            .populate('staffId', 'name staff_id department designation')
            .sort({ netSalary: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Overtime Report
exports.getOvertimeReport = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        let query = {};
        if (month) query.date = { $regex: `^${month}` };

        const entries = await Overtime.find(query)
            .populate('staffId', 'name staff_id department designation')
            .sort({ date: -1 });

        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Project Delay Report
exports.getProjectDelayReport = async (req, res) => {
    try {
        // Find timeline status logs where status is Delayed or Stopped
        const logs = await ProjectStatusHistory.find({
            status: { $in: ['Delayed', 'Stopped'] }
        })
        .populate('reportedBy', 'name designation')
        .sort({ reportedAt: -1 });

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Salary Payment Report
exports.getSalaryPaymentReport = async (req, res) => {
    try {
        const { status } = req.query; // paid or unpaid
        let query = {};
        if (status) query.paymentStatus = status;

        const records = await Salary.find(query)
            .populate('staffId', 'name staff_id department designation bank_name account_number')
            .sort({ month: -1 });

        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Staff Performance Report
exports.getStaffPerformanceReport = async (req, res) => {
    try {
        // Fetch all staff members
        const staffMembers = await User.find({ role: 'staff', status: 'active' }).select('name staff_id department designation');
        
        const reportData = [];

        for (const staff of staffMembers) {
            // Count Attendance Summary
            const attendanceRecords = await DailyAttendance.find({ staffId: staff._id });
            let presentCount = 0;
            let totalActive = 0;
            attendanceRecords.forEach(a => {
                if (a.status === 'Present') {
                    presentCount++;
                    totalActive++;
                } else if (a.status === 'Half Day') {
                    presentCount += 0.5;
                    totalActive++;
                } else if (a.status === 'Absent' || a.status === 'Leave') {
                    totalActive++;
                }
            });
            const attendancePercentage = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 100;

            // Count Task Completion
            const totalTasks = await Task.countDocuments({ assignedStaff: staff._id });
            const completedTasks = await Task.countDocuments({ assignedStaff: staff._id, status: 'completed' });

            // Count Overtime logged
            const otEntries = await Overtime.find({ staffId: staff._id });
            let totalOTHours = 0;
            otEntries.forEach(ot => {
                totalOTHours += ot.hours;
            });

            reportData.push({
                _id: staff._id,
                staffId: staff.staff_id,
                name: staff.name,
                department: staff.department,
                designation: staff.designation,
                attendancePercentage,
                totalTasks,
                completedTasks,
                totalOTHours
            });
        }

        res.json(reportData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
