const DailyAttendance = require('../models/DailyAttendance');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { getISTDate, getISTTimeString } = require('./dateTimeUtil');

const autoGenerateAbsentLogs = async (monthStr) => {
    try {
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return;

        // Fetch active staff users
        const staffUsers = await User.find({ role: 'staff', status: 'active' });
        if (staffUsers.length === 0) return;

        const todayStr = getISTDate(new Date());
        const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
        
        const [yearNum, monthNum] = monthStr.split('-').map(Number);
        const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
        
        let endDay = lastDayOfMonth;
        const isCurrentMonth = (yearNum === todayYear && monthNum === todayMonth);
        const isFutureMonth = (yearNum > todayYear || (yearNum === todayYear && monthNum > todayMonth));
        
        if (isFutureMonth) {
            endDay = 0; // Don't generate for future months
        } else if (isCurrentMonth) {
            endDay = todayDay - 1; // Check up to yesterday inclusive
        }

        if (endDay <= 0) return;

        const pOperations = [];

        for (let d = 1; d <= endDay; d++) {
            const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(yearNum, monthNum - 1, d);
            
            // Skip Sundays (getDay() === 0)
            if (dateObj.getDay() === 0) continue;

            for (const staff of staffUsers) {
                // Check if a record already exists in DailyAttendance
                const existingDaily = await DailyAttendance.findOne({ staffId: staff._id, date: dateStr });
                if (!existingDaily) {
                    // Check if biometric record exists in Attendance
                    const existingBiometric = await Attendance.findOne({
                        staff_id: staff._id,
                        date: dateStr,
                        status: 'success'
                    }).sort({ login_time: 1 });

                    if (existingBiometric) {
                        // Recover and sync with DailyAttendance as Present
                        pOperations.push(
                            DailyAttendance.create({
                                staffId: staff._id,
                                date: dateStr,
                                status: 'Present',
                                checkIn: getISTTimeString(existingBiometric.login_time),
                                checkOut: existingBiometric.check_out ? getISTTimeString(existingBiometric.check_out) : '',
                                workedHours: existingBiometric.duration_minutes ? parseFloat((existingBiometric.duration_minutes / 60).toFixed(2)) : 8,
                                isApproved: true
                            })
                        );
                    } else {
                        // Mark Absent
                        pOperations.push(
                            DailyAttendance.create({
                                staffId: staff._id,
                                date: dateStr,
                                status: 'Absent',
                                checkIn: '',
                                checkOut: '',
                                workedHours: 0
                            })
                        );
                    }
                }
            }
        }

        if (pOperations.length > 0) {
            await Promise.all(pOperations);
            console.log(`[system] Synchronized / generated ${pOperations.length} logs for cycle ${monthStr}`);
        }
    } catch (err) {
        console.error("Error in autoGenerateAbsentLogs helper:", err);
    }
};

module.exports = { autoGenerateAbsentLogs };
