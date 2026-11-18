const DailyAttendance = require('../models/DailyAttendance');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Shift = require('../models/Shift');
const { getISTDate, getISTTimeString } = require('./dateTimeUtil');
const { calculateShiftAttendance, resolveEmployeeShift } = require('./shiftCalculator');

/**
 * Seeds default shifts if none exist in the database
 */
const seedDefaultShifts = async () => {
    try {
        const count = await Shift.countDocuments();
        if (count === 0) {
            console.log('🌱 Seeding initial organization shift configurations...');
            await Shift.create([
                {
                    name: 'Morning Shift',
                    code: 'MORNING',
                    startTime: '09:00',
                    endTime: '17:00',
                    breakDuration: 60,
                    expectedHours: 7,
                    gracePeriodMinutes: 10,
                    earlyExitAllowanceMinutes: 15,
                    lateDetectionEnabled: true,
                    lateNotificationsEnabled: true,
                    shiftType: 'Regular',
                    isOvernight: false,
                    overtimeEnabled: true,
                    minOvertimeMinutes: 30,
                    overtimeMultiplier: 1.0,
                    weeklyOffDays: ['Sunday'],
                    isActive: true,
                    isDefault: true
                },
                {
                    name: 'Night Shift',
                    code: 'NIGHT',
                    startTime: '22:00',
                    endTime: '06:00',
                    breakDuration: 60,
                    expectedHours: 7,
                    gracePeriodMinutes: 10,
                    earlyExitAllowanceMinutes: 15,
                    shiftType: 'Night',
                    isOvernight: true,
                    overtimeEnabled: true,
                    minOvertimeMinutes: 30,
                    overtimeMultiplier: 1.25,
                    weeklyOffDays: ['Sunday'],
                    isActive: true,
                    isDefault: false
                },
                {
                    name: 'General Shift',
                    code: 'GENERAL',
                    startTime: '08:30',
                    endTime: '17:30',
                    breakDuration: 60,
                    expectedHours: 8,
                    gracePeriodMinutes: 15,
                    earlyExitAllowanceMinutes: 15,
                    shiftType: 'Regular',
                    isOvernight: false,
                    overtimeEnabled: true,
                    minOvertimeMinutes: 30,
                    overtimeMultiplier: 1.0,
                    weeklyOffDays: ['Sunday'],
                    isActive: true,
                    isDefault: false
                }
            ]);
            console.log('✅ Initial organization shifts seeded successfully.');
        }
    } catch (err) {
        console.error('Error seeding default shifts:', err.message);
    }
};

/**
 * Reconciles and fixes historical attendance records dynamically
 * - If both IN and OUT exist: sets status to COMPLETED and calculates duration
 * - If IN exists but OUT missing: sets IN PROGRESS for today, MISSING OUT for past dates
 * - Never deletes any attendance data
 */
const recalculateHistoricalAttendance = async () => {
    try {
        const todayStr = getISTDate(new Date());

        // 1. Process all DailyAttendance records
        const allDaily = await DailyAttendance.find({}).populate('staffId');
        let fixedDailyCount = 0;

        for (const record of allDaily) {
            const hasCheckIn = !!(record.checkIn && record.checkIn !== '--' && record.checkIn.trim() !== '');
            const hasCheckOut = !!(record.checkOut && record.checkOut !== '--' && record.checkOut.trim() !== '');

            // Also check if corresponding biometric log in Attendance has check_out or login_time
            let bioLog = null;
            if (record.staffId?._id) {
                bioLog = await Attendance.findOne({
                    staff_id: record.staffId._id,
                    date: record.date
                }).sort({ login_time: 1 });
            }

            const effectiveIn = record.checkIn || (bioLog?.login_time ? getISTTimeString(bioLog.login_time) : null);
            const effectiveOut = record.checkOut || (bioLog?.check_out ? getISTTimeString(bioLog.check_out) : null);

            const hasValidIn = !!(effectiveIn && effectiveIn !== '--');
            const hasValidOut = !!(effectiveOut && effectiveOut !== '--');

            const shift = await resolveEmployeeShift(record.staffId);
            const calc = calculateShiftAttendance({
                inTime: effectiveIn,
                outTime: effectiveOut,
                recordDate: record.date,
                shift,
                breakMinutes: record.breakTime || shift.breakDuration || 0
            });

            let needsUpdate = false;
            const updateFields = {};

            if (hasValidIn && hasValidOut) {
                if (record.status !== 'Completed' && record.status !== 'Present') {
                    updateFields.status = 'Completed';
                    needsUpdate = true;
                }
                if (!record.workedHours || record.workedHours === 0 || (calc.workedHours > 0 && Math.abs(record.workedHours - calc.workedHours) > 0.05)) {
                    updateFields.workedHours = calc.workedHours;
                    needsUpdate = true;
                }
                if (calc.overtimeHours > 0 && record.overtimeHours !== calc.overtimeHours) {
                    updateFields.overtimeHours = calc.overtimeHours;
                    needsUpdate = true;
                }
                if (effectiveOut && !record.checkOut) {
                    updateFields.checkOut = effectiveOut;
                    needsUpdate = true;
                }
            } else if (hasValidIn && !hasValidOut) {
                if (record.date < todayStr && record.status !== 'Missing Out') {
                    updateFields.status = 'Missing Out';
                    needsUpdate = true;
                } else if (record.date === todayStr && record.status !== 'In Progress') {
                    updateFields.status = 'In Progress';
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                updateFields.shiftName = shift.name;
                updateFields.shiftCode = shift.code;
                updateFields.shiftId = shift._id;
                await DailyAttendance.updateOne({ _id: record._id }, { $set: updateFields });
                fixedDailyCount++;
            }
        }

        // 2. Process all Attendance biometric records
        const allBiometrics = await Attendance.find({});
        let fixedBioCount = 0;

        for (const bio of allBiometrics) {
            const hasLogin = !!bio.login_time;
            const hasOut = !!bio.check_out;

            const shift = await resolveEmployeeShift(bio.staff_id);
            const calc = calculateShiftAttendance({
                inTime: bio.login_time,
                outTime: bio.check_out,
                recordDate: bio.date,
                shift
            });

            let needsBioUpdate = false;
            const bioUpdate = {};

            if (hasLogin && hasOut) {
                if (bio.completion_status !== 'COMPLETED') {
                    bioUpdate.completion_status = 'COMPLETED';
                    needsBioUpdate = true;
                }
                if (!bio.duration_minutes || bio.duration_minutes === 0 || bio.duration_minutes !== calc.durationMinutes) {
                    bioUpdate.duration_minutes = calc.durationMinutes;
                    needsBioUpdate = true;
                }
            } else if (hasLogin && !hasOut) {
                if (bio.date < todayStr && bio.completion_status !== 'MISSING_OUT') {
                    bioUpdate.completion_status = 'MISSING_OUT';
                    needsBioUpdate = true;
                } else if (bio.date === todayStr && bio.completion_status !== 'IN_PROGRESS') {
                    bioUpdate.completion_status = 'IN_PROGRESS';
                    needsBioUpdate = true;
                }
            }

            if (!bio.shift_id && shift._id) {
                bioUpdate.shift_id = shift._id;
                bioUpdate.shift_code = shift.code;
                needsBioUpdate = true;
            }

            if (needsBioUpdate) {
                await Attendance.updateOne({ _id: bio._id }, { $set: bioUpdate });
                fixedBioCount++;
            }
        }

        console.log(`[attendance-repair] Reconciled ${fixedDailyCount} daily records and ${fixedBioCount} biometric logs.`);
    } catch (err) {
        console.error('Error recalculating historical attendance:', err);
    }
};

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
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(dateObj);

            for (const staff of staffUsers) {
                const shift = await resolveEmployeeShift(staff);
                const isWeeklyOff = Array.isArray(shift.weeklyOffDays) && shift.weeklyOffDays.includes(dayName);

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
                        const inStr = getISTTimeString(existingBiometric.login_time);
                        const outStr = existingBiometric.check_out ? getISTTimeString(existingBiometric.check_out) : '';
                        const calc = calculateShiftAttendance({
                            inTime: existingBiometric.login_time,
                            outTime: existingBiometric.check_out,
                            recordDate: dateStr,
                            shift
                        });

                        pOperations.push(
                            DailyAttendance.create({
                                staffId: staff._id,
                                date: dateStr,
                                status: calc.status === 'COMPLETED' ? 'Completed' : (outStr ? 'Present' : 'Missing Out'),
                                checkIn: inStr,
                                checkOut: outStr,
                                workedHours: calc.workedHours,
                                shiftId: shift._id,
                                shiftName: shift.name,
                                shiftCode: shift.code,
                                overtimeHours: calc.overtimeHours,
                                isApproved: true
                            })
                        );
                    } else if (isWeeklyOff) {
                        pOperations.push(
                            DailyAttendance.create({
                                staffId: staff._id,
                                date: dateStr,
                                status: 'Weekly Off',
                                checkIn: '',
                                checkOut: '',
                                workedHours: 0,
                                shiftId: shift._id,
                                shiftName: shift.name,
                                shiftCode: shift.code
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
                                workedHours: 0,
                                shiftId: shift._id,
                                shiftName: shift.name,
                                shiftCode: shift.code
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

module.exports = { 
    seedDefaultShifts, 
    recalculateHistoricalAttendance, 
    autoGenerateAbsentLogs 
};
