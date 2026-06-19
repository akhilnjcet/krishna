const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');

// Mark/Update Daily Attendance status
exports.markDailyAttendance = async (req, res) => {
    try {
        const { staffId, date, status } = req.body;

        if (!staffId || !date || !status) {
            return res.status(400).json({ message: "Staff ID, date, and status are required." });
        }

        // Verify staff user exists
        const staff = await User.findOne({ _id: staffId, role: 'staff' });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found." });
        }

        const attendance = await DailyAttendance.findOneAndUpdate(
            { staffId, date },
            { status, markedBy: req.user.id, updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        console.log(`✅ Daily Attendance marked for ${staff.name} on ${date}: ${status}`);
        res.json({ message: "Attendance status updated successfully.", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Daily Attendance for a month (Format: YYYY-MM) or single date (Format: YYYY-MM-DD)
exports.getDailyAttendance = async (req, res) => {
    try {
        const { date, month, staffId } = req.query;
        let query = {};

        if (staffId) {
            query.staffId = staffId;
        }

        if (date) {
            query.date = date;
        } else if (month) {
            // Match date starting with YYYY-MM
            query.date = { $regex: `^${month}` };
        }

        const attendanceRecords = await DailyAttendance.find(query)
            .populate('staffId', 'name email staff_id department designation')
            .sort({ date: 1 });

        res.json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get monthly attendance summary for a staff member
exports.getStaffDailyAttendanceSummary = async (req, res) => {
    try {
        const { staffId, month } = req.query; // month Format: YYYY-MM
        const targetStaffId = staffId || req.user.id;

        if (!month) {
            return res.status(400).json({ message: "Month (Format: YYYY-MM) is required." });
        }

        const records = await DailyAttendance.find({
            staffId: targetStaffId,
            date: { $regex: `^${month}` }
        });

        const summary = {
            present: 0,
            absent: 0,
            halfDay: 0,
            leave: 0,
            holiday: 0,
            totalDays: records.length,
            percentage: 0
        };

        records.forEach(r => {
            if (r.status === 'Present') summary.present++;
            else if (r.status === 'Absent') summary.absent++;
            else if (r.status === 'Half Day') summary.halfDay++;
            else if (r.status === 'Leave') summary.leave++;
            else if (r.status === 'Holiday') summary.holiday++;
        });

        // Attendance Percentage Calculation: (Present + 0.5 * HalfDay) / (Total Days - Holidays) * 100
        const activeDaysCount = summary.present + (summary.halfDay * 0.5);
        const countableDays = summary.totalDays - summary.holiday;
        if (countableDays > 0) {
            summary.percentage = Math.round((activeDaysCount / countableDays) * 100);
        } else if (summary.totalDays > 0) {
            summary.percentage = 100; // All holidays
        }

        res.json({ staffId: targetStaffId, month, summary, records });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
