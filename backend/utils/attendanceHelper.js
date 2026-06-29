const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');

const autoGenerateAbsentLogs = async (monthStr) => {
    try {
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return;

        // Fetch active staff users
        const staffUsers = await User.find({ role: 'staff', status: 'active' });
        if (staffUsers.length === 0) return;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
        
        const [yearNum, monthNum] = monthStr.split('-').map(Number);
        const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
        
        let endDay = lastDayOfMonth;
        const isCurrentMonth = (yearNum === todayYear && monthNum === todayMonth);
        const isFutureMonth = (yearNum > todayYear || (yearNum === todayYear && monthNum > todayMonth));
        
        if (isFutureMonth) {
            endDay = 0; // Don't check future months
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
                // Check if a record already exists
                const existing = await DailyAttendance.findOne({ staffId: staff._id, date: dateStr });
                if (!existing) {
                    pOperations.push(
                        DailyAttendance.create({
                            staffId: staff._id,
                            date: dateStr,
                            status: 'Absent'
                        })
                    );
                }
            }
        }

        if (pOperations.length > 0) {
            await Promise.all(pOperations);
            console.log(`[system] Auto-generated ${pOperations.length} absent logs for cycle ${monthStr}`);
        }
    } catch (err) {
        console.error("Error in autoGenerateAbsentLogs helper:", err);
    }
};

module.exports = { autoGenerateAbsentLogs };
