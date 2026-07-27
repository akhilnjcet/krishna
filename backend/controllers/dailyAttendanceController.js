const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');
const { autoGenerateAbsentLogs } = require('../utils/attendanceHelper');

// Mark/Update Daily Attendance status
exports.markDailyAttendance = async (req, res) => {
    try {
        const { staffId, date, status, checkIn, checkOut, breakTime } = req.body;

        if (!staffId || !date || !status) {
            return res.status(400).json({ message: "Staff ID, date, and status are required." });
        }

        // Verify staff user exists
        const staff = await User.findOne({ _id: staffId, role: 'staff' });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found." });
        }

        // Calculate hours if status is Present or Half Day
        let workedHours = 0;
        let lateMinutes = 0;
        let earlyExitMinutes = 0;

        if (status === 'Present' || status === 'Half Day') {
            const defaultCheckIn = "09:00";
            const defaultCheckOut = status === 'Present' ? "17:00" : "13:00";
            
            const actualCheckIn = checkIn || defaultCheckIn;
            const actualCheckOut = checkOut || defaultCheckOut;
            const actualBreakTime = breakTime !== undefined ? Number(breakTime) : 0;

            // Compute worked hours
            const [inH, inM] = actualCheckIn.split(':').map(Number);
            const [outH, outM] = actualCheckOut.split(':').map(Number);
            const totalMins = (outH * 60 + outM) - (inH * 60 + inM) - actualBreakTime;
            workedHours = Math.max(0, parseFloat((totalMins / 60).toFixed(2)));

            // Compute late/early minutes relative to standard shift 9 AM to 5 PM
            const stdInMins = 9 * 60; // 09:00
            const stdOutMins = 17 * 60; // 17:00

            const actualInMins = inH * 60 + inM;
            const actualOutMins = outH * 60 + outM;

            lateMinutes = Math.max(0, actualInMins - stdInMins);
            earlyExitMinutes = Math.max(0, stdOutMins - actualOutMins);
        }

        const attendance = await DailyAttendance.findOneAndUpdate(
            { staffId, date },
            { 
                status, 
                checkIn: (status === 'Present' || status === 'Half Day') ? checkIn || "09:00" : "",
                checkOut: (status === 'Present' || status === 'Half Day') ? checkOut || (status === 'Present' ? "17:00" : "13:00") : "",
                breakTime: (status === 'Present' || status === 'Half Day') ? breakTime || 0 : 0,
                workedHours,
                lateMinutes,
                earlyExitMinutes,
                isApproved: true,
                markedBy: req.user.id, 
                updatedAt: Date.now() 
            },
            { upsert: true, new: true }
        );

        // Generate / Update Overtime record if workedHours > standard working hours per day
        const stdHours = staff.standardWorkingHoursPerDay || 8;
        const Overtime = require('../models/Overtime');

        if (workedHours > stdHours) {
            const otHours = parseFloat((workedHours - stdHours).toFixed(2));
            const otRate = staff.overtimeRate || 0;
            const otAmount = parseFloat((otHours * otRate).toFixed(2));
            const otStatus = staff.otApprovalRequired ? 'Pending' : 'Approved';

            await Overtime.findOneAndUpdate(
                { staffId, date },
                {
                    hours: otHours,
                    ratePerHour: otRate,
                    totalAmount: otAmount,
                    regularHours: stdHours,
                    checkIn: checkIn || "09:00",
                    checkOut: checkOut || "17:00",
                    status: otStatus,
                    addedBy: req.user.id,
                    createdAt: Date.now()
                },
                { upsert: true }
            );
        } else {
            // Delete overtime record if worked hours are not exceeding standard hours
            await Overtime.findOneAndDelete({ staffId, date });
        }

        // Recalculate salary for this month in real time
        // Emit real-time Socket.IO notifications
        try {
            const socketUtil = require('../utils/socket');
            const io = socketUtil.getIO();
            if (io) {
                io.emit('attendance_updated', { staffId: String(staffId), date, status });
                io.emit('attendance_recorded', { staffId: String(staffId), date, status });
                io.emit('daily_attendance_changed', { staffId: String(staffId), date, status });
            }
        } catch (sErr) {
            console.warn("Socket notification warning:", sErr.message);
        }

        console.log(`✅ Daily Attendance & Salary updated for ${staff.name} on ${date}: ${status}`);
        res.json({ message: "Attendance and salary updated successfully.", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Daily Attendance for a month (Format: YYYY-MM) or single date (Format: YYYY-MM-DD)
exports.getDailyAttendance = async (req, res) => {
    try {
        const { date, month, staffId } = req.query;
        let query = {};

        if (month) {
            await autoGenerateAbsentLogs(month);
        }

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

        await autoGenerateAbsentLogs(month);

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
