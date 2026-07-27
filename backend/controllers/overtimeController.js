const Overtime = require('../models/Overtime');
const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');
const { recalculateSalary } = require('../utils/salaryCalculator');

// Add/Log Overtime Entry
exports.addOvertime = async (req, res) => {
    try {
        const { staffId, date, hours, remarks } = req.body;

        if (!staffId || !date || hours === undefined) {
            return res.status(400).json({ message: "Staff ID, date, and hours are required." });
        }

        // 1. Verify staff member exists
        const staff = await User.findOne({ _id: staffId, role: 'staff' });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found." });
        }

        // 2. Rule: Overtime can only be added on Present Days (Present or Half Day)
        const attendance = await DailyAttendance.findOne({ staffId, date });
        if (!attendance || !['Present', 'Half Day'].includes(attendance.status)) {
            return res.status(400).json({ 
                message: "Overtime can only be added on days when the staff member is marked as Present or Half Day." 
            });
        }

        // Calculate rate and amount
        const ratePerHour = staff.overtimeRate || 0;
        const totalAmount = parseFloat(hours) * ratePerHour;
        const otStatus = staff.otApprovalRequired ? 'Pending' : 'Approved';

        const overtime = await Overtime.findOneAndUpdate(
            { staffId, date },
            { 
                hours: parseFloat(hours), 
                ratePerHour, 
                totalAmount, 
                remarks, 
                status: otStatus,
                addedBy: req.user.id 
            },
            { upsert: true, new: true }
        );

        // Recalculate salary for this month in real time
        const monthStr = date.substring(0, 7);
        await recalculateSalary(staffId, monthStr);

        console.log(`✅ Overtime logged for ${staff.name} on ${date}: ${hours} hrs @ ₹${ratePerHour}/hr`);
        res.status(201).json({ message: "Overtime logged successfully.", overtime });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Edit Overtime Entry
exports.editOvertime = async (req, res) => {
    try {
        const { hours, remarks } = req.body;
        const overtime = await Overtime.findById(req.params.id);
        if (!overtime) {
            return res.status(404).json({ message: "Overtime record not found." });
        }

        const staff = await User.findById(overtime.staffId);
        const ratePerHour = staff ? (staff.overtimeRate || 0) : overtime.ratePerHour;
        
        overtime.hours = parseFloat(hours);
        overtime.ratePerHour = ratePerHour;
        overtime.totalAmount = parseFloat(hours) * ratePerHour;
        overtime.remarks = remarks || overtime.remarks;
        await overtime.save();

        // Recalculate salary for this month in real time
        const monthStr = overtime.date.substring(0, 7);
        await recalculateSalary(overtime.staffId, monthStr);

        res.json({ message: "Overtime record updated successfully.", overtime });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete Overtime Entry
exports.deleteOvertime = async (req, res) => {
    try {
        const overtime = await Overtime.findById(req.params.id);
        if (!overtime) {
            return res.status(404).json({ message: "Overtime record not found." });
        }
        const staffId = overtime.staffId;
        const monthStr = overtime.date.substring(0, 7);

        await overtime.deleteOne();

        // Recalculate salary for this month in real time
        await recalculateSalary(staffId, monthStr);

        res.json({ message: "Overtime record deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Approve / Reject Overtime Entry
exports.approveRejectOvertime = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // status: 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be Approved or Rejected." });
        }

        const overtime = await Overtime.findById(id);
        if (!overtime) {
            return res.status(404).json({ message: "Overtime record not found." });
        }

        overtime.status = status;
        overtime.remarks = remarks || overtime.remarks;
        overtime.approvedBy = req.user.name || req.user.username || 'Admin';
        overtime.approvalDate = new Date();
        await overtime.save();

        // Recalculate salary for this month in real time
        const monthStr = overtime.date.substring(0, 7);
        await recalculateSalary(overtime.staffId, monthStr);

        res.json({ message: `Overtime status updated to ${status} and salary recalculated.`, overtime });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Overtime logs
exports.getOvertimeLogs = async (req, res) => {
    try {
        const { staffId, month, date } = req.query;
        let query = {};

        if (staffId) {
            query.staffId = staffId;
        }

        if (date) {
            query.date = date;
        } else if (month) {
            query.date = { $regex: `^${month}` };
        }

        const logs = await Overtime.find(query)
            .populate('staffId', 'name email staff_id department designation overtimeRate')
            .sort({ date: -1 });

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
