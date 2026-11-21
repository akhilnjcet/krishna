const Attendance = require('../models/Attendance');
const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');
const FaceData = require('../models/FaceData');
const { getISTDate, getISTTimeString, formatISTDisplay, calculateDuration, normalizeAttendanceTime } = require('../utils/dateTimeUtil');

// Helper: Euclidean distance between two 128-d vectors
const getEuclideanDistance = (v1, v2) => {
    if (!v1 || !v2 || v1.length !== v2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
};

// Helper: Cosine similarity to percentage
const getConfidenceScore = (distance) => {
    const cosineSim = Math.max(0, 1 - (Math.pow(distance, 2) / 2));
    return Math.min(100, Math.round(cosineSim * 100));
};

/**
 * Record staff attendance using face scan and location
 * POST /api/attendance/record
 */
exports.recordAttendance = async (req, res) => {
    try {
        const {
            action = 'Check in',
            descriptor,
            face_image,
            location = {},
            device_info = '',
            consent_acknowledged = false
        } = req.body;

        const staffUser = await User.findById(req.user._id || req.user.id);
        if (!staffUser) {
            return res.status(404).json({ message: 'Staff user profile not found.' });
        }

        const today = getISTDate(new Date());
        const now = new Date();
        const timeStr = getISTTimeString(now);
        const isCheckOut = action === 'Check out' || action === 'OUT';
        const normalizedAction = isCheckOut ? 'Check out' : 'Check in';
        const normalizedType = isCheckOut ? 'OUT' : 'IN';

        // ── IDEMPOTENT CHECK-IN & SESSION VALIDATION ─────────────────────────
        if (!isCheckOut) {
            // Check if user already has an attendance session for today
            const existingSession = await Attendance.findOne({
                staff_id: staffUser._id,
                date: today,
                status: 'success'
            }).sort({ login_time: 1 });

            if (existingSession) {
                // If user has already checked out today
                if (existingSession.check_out) {
                    return res.status(200).json({
                        success: true,
                        already_marked: true,
                        already_checked_out: true,
                        message: `Shift already completed for today (Checked in: ${formatISTDisplay(existingSession.login_time)}, Checked out: ${formatISTDisplay(existingSession.check_out)}).`,
                        record: existingSession
                    });
                }

                // If user has already checked in (shift in progress)
                return res.status(200).json({
                    success: true,
                    already_marked: true,
                    message: `Attendance is already marked for today at ${formatISTDisplay(existingSession.login_time)}. Your shift is currently in progress.`,
                    record: existingSession
                });
            }
        } else {
            // Check-out: Must have an active check-in session for today
            const activeSession = await Attendance.findOne({
                staff_id: staffUser._id,
                date: today,
                status: 'success'
            }).sort({ login_time: 1 });

            if (!activeSession) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot check out: No active check-in record found for today. Please check in first.'
                });
            }

            if (activeSession.check_out) {
                return res.status(200).json({
                    success: true,
                    already_checked_out: true,
                    message: `You have already checked out today at ${formatISTDisplay(activeSession.check_out)}.`,
                    record: activeSession
                });
            }
        }

        // Validate facial biometric descriptor format
        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return res.status(400).json({
                success: false,
                message: 'No valid facial biometric descriptor captured. Please ensure your face is well lit and properly framed.',
                can_request_correction: true
            });
        }

        // Retrieve registered face template strictly for this authenticated user
        let registeredDescriptor = staffUser.faceDescriptor && staffUser.faceDescriptor.length === 128
            ? staffUser.faceDescriptor
            : null;

        if (!registeredDescriptor) {
            const faceRecord = await FaceData.findOne({ userId: staffUser._id });
            if (faceRecord && faceRecord.faceEmbedding && faceRecord.faceEmbedding.length === 128) {
                registeredDescriptor = faceRecord.faceEmbedding;
            }
        }

        // PREVENT AUTO-ENROLLMENT DURING ATTENDANCE:
        // A driver or staff member must have an enrolled face BEFORE recording attendance.
        // If no face is enrolled, reject attendance immediately. Never auto-enroll on scan.
        if (!registeredDescriptor) {
            const roleLabel = staffUser.role === 'driver' ? 'Driver' : 'Staff Member';
            return res.status(403).json({
                success: false,
                face_not_registered: true,
                message: `Face not registered for ${roleLabel} "${staffUser.name}". Biometric attendance requires official enrollment. Please contact an administrator or fleet supervisor to complete your facial enrollment.`,
                can_request_correction: true
            });
        }

        // Strict 1-to-1 Biometric Matching against authenticated user's registered template
        const matchDistance = getEuclideanDistance(descriptor, registeredDescriptor);
        const confidenceScore = getConfidenceScore(matchDistance);

        // Biometric threshold: 0.52 (industry standard for face-api 128-d Euclidean distance)
        if (matchDistance > 0.52) {
            // Check if the presented face belongs to ANOTHER registered user (impersonation/proxy attempt)
            let matchedOtherUser = null;
            const otherFaceRecords = await FaceData.find({ userId: { $ne: staffUser._id } }).populate('userId', 'name role staff_id email');
            for (const f of otherFaceRecords) {
                if (f.userId && f.faceEmbedding && f.faceEmbedding.length === 128) {
                    const dist = getEuclideanDistance(descriptor, f.faceEmbedding);
                    if (dist <= 0.52) {
                        matchedOtherUser = f.userId;
                        break;
                    }
                }
            }

            if (!matchedOtherUser) {
                const otherUsersWithFace = await User.find({
                    _id: { $ne: staffUser._id },
                    faceDescriptor: { $exists: true, $not: { $size: 0 } }
                }).select('name role staff_id email faceDescriptor');

                for (const u of otherUsersWithFace) {
                    if (u.faceDescriptor && u.faceDescriptor.length === 128) {
                        const dist = getEuclideanDistance(descriptor, u.faceDescriptor);
                        if (dist <= 0.52) {
                            matchedOtherUser = u;
                            break;
                        }
                    }
                }
            }

            if (matchedOtherUser) {
                const conflictRole = matchedOtherUser.role === 'driver' ? 'Driver' : matchedOtherUser.role === 'admin' ? 'Administrator' : 'Staff Member';
                return res.status(422).json({
                    success: false,
                    face_mismatch: true,
                    impersonation_detected: true,
                    message: `Biometric Identity Mismatch: The scanned face belongs to ${conflictRole} "${matchedOtherUser.name}". Attendance for "${staffUser.name}" can only be recorded using their own registered face.`,
                    can_request_correction: true
                });
            }

            return res.status(422).json({
                success: false,
                face_mismatch: true,
                message: `Biometric verification failed: The scanned face does not match the registered face template for "${staffUser.name}" (Distance: ${matchDistance.toFixed(2)}, required <= 0.52).`,
                can_request_correction: true
            });
        }

        const isFaceMatched = true;
        const verificationResult = 'success';
        const verificationReason = `Biometric Face Match (Confidence: ${confidenceScore}%)`;

        // Validate location coordinates if present
        const validatedLocation = {
            latitude: location.latitude ? Number(location.latitude) : null,
            longitude: location.longitude ? Number(location.longitude) : null,
            accuracy: location.accuracy ? Number(location.accuracy) : null,
            address: location.address ? String(location.address).trim() : ''
        };

        const overallStatus = isFaceMatched ? 'success' : 'fail';
        let attendanceRecord = null;

        if (isCheckOut) {
            // Find the active check-in record for today (or yesterday if overnight shift)
            let activeSession = await Attendance.findOne({
                staff_id: staffUser._id,
                date: today,
                status: 'success'
            }).sort({ login_time: 1 });

            // If not found today, check if yesterday had an unclosed session (overnight shift support)
            if (!activeSession) {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const yesterdayStr = getISTDate(yesterday);
                activeSession = await Attendance.findOne({
                    staff_id: staffUser._id,
                    date: yesterdayStr,
                    status: 'success',
                    check_out: null
                }).sort({ login_time: -1 });
            }

            if (!activeSession) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot check out: No active check-in session found. Please check in first.'
                });
            }

            if (overallStatus === 'success') {
                const { resolveEmployeeShift, calculateShiftAttendance } = require('../utils/shiftCalculator');
                const shift = await resolveEmployeeShift(staffUser);

                const sessionDate = activeSession.date || today;
                const calc = calculateShiftAttendance({
                    inTime: activeSession.login_time,
                    outTime: now,
                    recordDate: sessionDate,
                    shift
                });

                const workedHours = calc.workedHours;
                const durationMins = calc.durationMinutes;

                activeSession.check_out = now;
                activeSession.action = 'Check in / Check out';
                activeSession.duration_minutes = durationMins;
                activeSession.completion_status = 'COMPLETED';
                activeSession.shift_id = shift._id;
                activeSession.shift_code = shift.code;
                activeSession.is_overnight = shift.isOvernight;
                activeSession.is_early_checkout = calc.isEarlyExit;
                activeSession.early_departure_minutes = calc.earlyExitMinutes;
                activeSession.location = validatedLocation;
                activeSession.audit_trail.push({
                    action: 'RECORDED',
                    performed_by: staffUser._id,
                    performed_by_name: staffUser.name,
                    timestamp: now,
                    details: `Check out recorded via face scan (Confidence: ${confidenceScore}%) and location. Shift: ${shift.name}. Duration: ${calc.formattedDuration}. ${calc.isEarlyExit ? `Early Checkout: -${calc.earlyExitMinutes}m.` : 'On Time.'}`,
                    ip_address: req.ip || req.headers['x-forwarded-for'] || ''
                });

                await activeSession.save();
                attendanceRecord = activeSession;

                // Sync DailyAttendance with COMPLETED status and dynamic shift calculation
                const checkInTimeStr = getISTTimeString(activeSession.login_time);

                await DailyAttendance.findOneAndUpdate(
                    { staffId: staffUser._id, date: sessionDate },
                    {
                        status: 'Completed',
                        checkIn: checkInTimeStr,
                        checkOut: timeStr,
                        workedHours,
                        overtimeHours: calc.overtimeHours,
                        lateMinutes: calc.lateMinutes,
                        earlyExitMinutes: calc.earlyExitMinutes,
                        isEarlyExit: calc.isEarlyExit,
                        shiftId: shift._id,
                        shiftCode: shift.code,
                        shiftName: shift.name,
                        isOvernight: shift.isOvernight,
                        isApproved: true,
                        updatedAt: now
                    },
                    { upsert: true, new: true }
                );

                // Dispatch Early Checkout notification to admin if enabled
                if (calc.isEarlyExit && shift.earlyExitNotificationsEnabled !== false) {
                    try {
                        const Notification = require('../models/Notification');
                        const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } });
                        const checkOutDisplay = formatISTDisplay(now, false);

                        for (const admin of adminUsers) {
                            const existingNotif = await Notification.findOne({
                                recipient: admin._id,
                                'metadata.type': 'EARLY_CHECKOUT',
                                'metadata.staffId': staffUser._id,
                                'metadata.date': sessionDate
                            });

                            if (!existingNotif) {
                                await Notification.create({
                                    recipient: admin._id,
                                    title: 'Early Checkout Detected',
                                    message: `${staffUser.name} checked out early on ${sessionDate} at ${checkOutDisplay}. Early departure duration: ${calc.earlyExitMinutes} minutes.`,
                                    type: 'warning',
                                    category: 'attendance',
                                    link: '/admin/shifts',
                                    metadata: {
                                        type: 'EARLY_CHECKOUT',
                                        staffId: staffUser._id,
                                        date: sessionDate,
                                        earlyMinutes: calc.earlyExitMinutes,
                                        checkOutTime: checkOutDisplay
                                    }
                                });
                            }
                        }
                    } catch (notifErr) {
                        console.error('Error dispatching early checkout notification:', notifErr);
                    }
                }

                // Overtime calculation using shift rules
                const stdHours = shift.expectedHours || staffUser.standardWorkingHoursPerDay || 7;
                const Overtime = require('../models/Overtime');
                if (workedHours > stdHours) {
                    const otHours = calc.overtimeHours || parseFloat((workedHours - stdHours).toFixed(2));
                    const otRate = staffUser.overtimeRate || 0;
                    const otAmount = parseFloat((otHours * otRate).toFixed(2));
                    const otStatus = staffUser.otApprovalRequired ? 'Pending' : 'Approved';

                    await Overtime.findOneAndUpdate(
                        { staffId: staffUser._id, date: sessionDate },
                        {
                            staffId: staffUser._id,
                            date: sessionDate,
                            hours: otHours,
                            ratePerHour: otRate,
                            totalAmount: otAmount,
                            regularHours: stdHours,
                            checkIn: checkInTimeStr,
                            checkOut: timeStr,
                            status: otStatus,
                            addedBy: staffUser._id,
                            createdAt: now
                        },
                        { upsert: true }
                    );
                }
            } else {
                return res.status(422).json({
                    success: false,
                    message: verificationReason || 'Face verification failed during checkout.',
                    can_request_correction: true
                });
            }
        } else {
            // Check-In flow: Resolve shift & create single canonical attendance record
            const { resolveEmployeeShift, calculateShiftAttendance } = require('../utils/shiftCalculator');
            const shift = await resolveEmployeeShift(staffUser);

            const calc = calculateShiftAttendance({
                inTime: now,
                outTime: null,
                recordDate: today,
                shift
            });

            attendanceRecord = new Attendance({
                staff_id: staffUser._id,
                full_name: staffUser.name,
                login_time: now,
                date: today,
                type: normalizedType,
                action: normalizedAction,
                face_verified: isFaceMatched,
                face_match_confidence: confidenceScore,
                status: overallStatus,
                completion_status: 'IN_PROGRESS',
                shift_id: shift._id,
                shift_code: shift.code,
                is_overnight: shift.isOvernight,
                is_late: calc.isLate,
                late_minutes: calc.lateMinutes,
                verification_reason: verificationReason,
                verification_result: verificationResult,
                face_image: face_image || null,
                face_image_deleted: false,
                location: validatedLocation,
                device_ip: req.ip || req.headers['x-forwarded-for'] || '',
                device_info: device_info || req.headers['user-agent'] || '',
                audit_trail: [{
                    action: 'RECORDED',
                    performed_by: staffUser._id,
                    performed_by_name: staffUser.name,
                    timestamp: now,
                    details: `${normalizedAction} recorded via face scan (Confidence: ${confidenceScore}%) and location. Assigned Shift: ${shift.name}. ${calc.isLate ? `Late Arrival: +${calc.lateMinutes}m` : 'On Time'}.`,
                    ip_address: req.ip || req.headers['x-forwarded-for'] || ''
                }]
            });

            await attendanceRecord.save();

            if (overallStatus === 'success') {
                await DailyAttendance.findOneAndUpdate(
                    { staffId: staffUser._id, date: today },
                    {
                        status: 'In Progress',
                        checkIn: timeStr,
                        checkOut: '',
                        workedHours: 0,
                        lateMinutes: calc.lateMinutes,
                        isLate: calc.isLate,
                        shiftId: shift._id,
                        shiftCode: shift.code,
                        shiftName: shift.name,
                        isOvernight: shift.isOvernight,
                        markedBy: staffUser._id,
                        isApproved: true,
                        updatedAt: now
                    },
                    { upsert: true, new: true }
                );

                // Dispatch Late Arrival Alert (Avoid duplicates for same attendance event)
                if (calc.isLate && shift.lateNotificationsEnabled !== false) {
                    try {
                        const Notification = require('../models/Notification');
                        const existingNotif = await Notification.findOne({
                            category: 'attendance',
                            'metadata.staffId': staffUser._id,
                            'metadata.date': today,
                            'metadata.type': 'LATE_ARRIVAL'
                        });

                        if (!existingNotif) {
                            await Notification.create({
                                title: `Late Arrival Alert: ${staffUser.name}`,
                                message: `${staffUser.name} arrived late on ${today} at ${timeStr} (${calc.lateMinutes} mins late against shift start ${shift.startTime} with ${shift.gracePeriodMinutes || 10}m grace).`,
                                category: 'attendance',
                                priority: 'medium',
                                metadata: {
                                    staffId: staffUser._id,
                                    staffName: staffUser.name,
                                    date: today,
                                    inTime: timeStr,
                                    shiftStart: shift.startTime,
                                    lateMinutes: calc.lateMinutes,
                                    type: 'LATE_ARRIVAL'
                                }
                            });
                        }
                    } catch (notifErr) {
                        console.warn('Late arrival notification notice:', notifErr.message);
                    }
                }
            }
        }

        // If face verification succeeded, handle payroll and notifications
        if (overallStatus === 'success' && attendanceRecord) {

            // Real-time salary recalculation
            try {
                const { recalculateSalary } = require('../utils/salaryCalculator');
                const monthStr = today.substring(0, 7);
                await recalculateSalary(staffUser._id, monthStr);
            } catch (salErr) {
                console.warn('Salary recalculation notice:', salErr.message);
            }

            // Emit live socket event
            try {
                const socketUtil = require('../utils/socket');
                const io = socketUtil.getIO();
                if (io) {
                    const monthStr = today.substring(0, 7);
                    io.emit('attendance_recorded', {
                        staffId: String(staffUser._id),
                        staffName: staffUser.name,
                        date: today,
                        action: normalizedAction,
                        status: 'Present',
                        location: validatedLocation
                    });
                    io.emit(isCheckOut ? 'clock_out' : 'clock_in', {
                        staffId: String(staffUser._id),
                        date: today,
                        time: now
                    });
                    io.emit('daily_attendance_changed', { staffId: String(staffUser._id), date: today });
                    io.emit('payroll_updated', { staffId: String(staffUser._id), month: monthStr });
                }
            } catch (sockErr) {
                console.warn('Socket notification notice:', sockErr.message);
            }

            // Dispatch WhatsApp & Email attendance confirmation notifications to staff member
            try {
                const { sendStaffAttendanceNotification } = require('../services/whatsappService');
                const { sendStaffAttendanceEmail } = require('../services/emailService');

                const formattedDateTime = now.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });

                const notificationPayload = {
                    type: normalizedAction,
                    dateTimeStr: formattedDateTime
                };

                const dispatchTasks = [];

                // 1. WhatsApp notification
                dispatchTasks.push(
                    sendStaffAttendanceNotification(staffUser, notificationPayload).catch(err => {
                        console.warn('WhatsApp staff attendance alert notice:', err.message);
                    })
                );

                // 2. Email notification
                const targetEmail = (staffUser.email || '').trim().toLowerCase();
                if (targetEmail && targetEmail.includes('@')) {
                    dispatchTasks.push(
                        sendStaffAttendanceEmail(targetEmail, staffUser.name, notificationPayload).catch(err => {
                            console.warn('Email staff attendance alert notice:', err.message);
                        })
                    );
                }

                // Dispatch alerts asynchronously in the background so HTTP response returns in <50ms
                if (dispatchTasks.length > 0) {
                    Promise.allSettled(dispatchTasks).catch(err => console.warn('Attendance notification error:', err.message));
                }
            } catch (notifyErr) {
                console.warn('Attendance notification dispatch notice:', notifyErr.message);
            }

            return res.status(200).json({
                success: true,
                message: `${normalizedAction} recorded successfully.`,
                record: attendanceRecord
            });
        } else {
            // Failed verification response
            return res.status(422).json({
                success: false,
                message: verificationReason || 'Face verification failed.',
                record: attendanceRecord,
                can_request_correction: true
            });
        }
    } catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({ message: error.message || 'Server error processing attendance' });
    }
};

/**
 * Get attendance logs with rich filtering for Administrator Dashboard
 * GET /api/attendance
 */
exports.getAttendanceLogs = async (req, res) => {
    try {
        const {
            staff_id,
            date,
            month,
            startDate,
            endDate,
            status,
            action,
            type,
            verification_result,
            correction_status,
            search,
            sortOrder,
            order,
            sort
        } = req.query;

        let query = {};

        if (staff_id) query.staff_id = staff_id;

        if (date) {
            query.date = date;
        } else if (month) {
            // month is YYYY-MM
            query.date = { $regex: `^${month}` };
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        if (status) query.status = status;
        if (action) query.action = action;
        if (type) query.type = type;
        if (verification_result) query.verification_result = verification_result;
        if (correction_status) query.correction_status = correction_status;

        if (search) {
            const matchedUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { staff_id: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);
            query.$or = [
                { staff_id: { $in: userIds } },
                { full_name: { $regex: search, $options: 'i' } }
            ];
        }

        const isAsc = (sortOrder === 'asc' || order === 'asc' || sort === 'asc');
        const sortCriteria = isAsc ? { date: 1, login_time: 1 } : { date: -1, login_time: -1 };

        const logs = await Attendance.find(query)
            .populate('staff_id', 'staff_id name email department designation profilePhoto phone')
            .populate('face_image_deleted_by', 'name email')
            .populate('correction_details.reviewed_by', 'name email')
            .sort(sortCriteria)
            .limit(500);

        const formattedLogs = logs.map(log => {
            const obj = log.toObject ? log.toObject() : { ...log };
            obj.login_time_ist = log.login_time ? formatISTDisplay(log.login_time, true) : '--';
            obj.login_time_ist_short = log.login_time ? formatISTDisplay(log.login_time, false) : '--';
            obj.check_out_ist = log.check_out ? formatISTDisplay(log.check_out, true) : '--';
            obj.check_out_ist_short = log.check_out ? formatISTDisplay(log.check_out, false) : '--';
            return obj;
        });

        res.json(formattedLogs);
    } catch (error) {
        console.error('Error fetching attendance logs:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get current staff user's own logs
 * GET /api/attendance/my-logs
 */
/**
 * GET /api/attendance/my-logs
 * Single source of truth for Staff Timesheet.
 * Synchronized with DailyAttendance, deduplicating accidental rapid scans,
 * and sorted in ascending chronological order (oldest date first, newest date last).
 */
exports.getStaffLogs = async (req, res) => {
    try {
        const targetStaffId = req.user._id || req.user.id;
        const { month } = req.query;
        const Overtime = require('../models/Overtime');

        let biometricQuery = { staff_id: targetStaffId };
        let dailyQuery = { staffId: targetStaffId };

        if (month) {
            biometricQuery.date = { $regex: `^${month}` };
            dailyQuery.date = { $regex: `^${month}` };
            await require('../utils/attendanceHelper').autoGenerateAbsentLogs(month);
        }

        // Fetch raw biometric logs, daily register records, and overtime records concurrently (latest first)
        const [rawLogs, dailyRecords, otRecords] = await Promise.all([
            Attendance.find(biometricQuery).sort({ date: -1, login_time: -1 }),
            DailyAttendance.find(dailyQuery).sort({ date: -1 }),
            Overtime.find(dailyQuery).sort({ date: -1 })
        ]);

        const dailyMap = new Map();
        dailyRecords.forEach(d => dailyMap.set(d.date, d));

        const otMap = new Map();
        otRecords.forEach(o => otMap.set(o.date, o));

        // Group biometric logs by date
        const biometricByDate = new Map();
        rawLogs.forEach(log => {
            const dateStr = log.date;
            if (!biometricByDate.has(dateStr)) {
                biometricByDate.set(dateStr, []);
            }
            biometricByDate.get(dateStr).push(log);
        });

        // Collect all distinct dates from both sources sorted latest date first (descending order)
        const allDates = Array.from(new Set([
            ...dailyRecords.map(d => d.date),
            ...rawLogs.map(l => l.date)
        ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        const todayStr = getISTDate(new Date());

        const { resolveEmployeeShift, calculateShiftAttendance } = require('../utils/shiftCalculator');
        const employeeShift = await resolveEmployeeShift(targetStaffId);

        const consolidatedTimesheets = allDates.map(dateStr => {
            const dateBiometrics = biometricByDate.get(dateStr) || [];
            const daily = dailyMap.get(dateStr);
            const ot = otMap.get(dateStr);

            // Determine earliest login_time and latest check_out among biometric logs
            let earliestLogin = null;
            let latestCheckOut = null;
            let totalDurationMins = 0;
            let bestLog = dateBiometrics[0] || null;

            dateBiometrics.forEach(item => {
                if (item.status === 'success') {
                    if (!earliestLogin || new Date(item.login_time) < new Date(earliestLogin)) {
                        earliestLogin = item.login_time;
                        bestLog = item;
                    }
                    if (item.check_out) {
                        if (!latestCheckOut || new Date(item.check_out) > new Date(latestCheckOut)) {
                            latestCheckOut = item.check_out;
                        }
                    }
                    if (item.duration_minutes > totalDurationMins) {
                        totalDurationMins = item.duration_minutes;
                    }
                }
            });

            // Fallback to DailyAttendance if biometric log doesn't have checkIn or checkOut
            const effectiveIn = earliestLogin || (daily?.checkIn && daily.checkIn !== '--' ? daily.checkIn : null);
            const effectiveOut = latestCheckOut || (daily?.checkOut && daily.checkOut !== '--' ? daily.checkOut : null);

            // Run centralized shift calculator
            const calc = calculateShiftAttendance({
                inTime: effectiveIn,
                outTime: effectiveOut,
                recordDate: dateStr,
                shift: employeeShift,
                breakMinutes: daily?.breakDuration ?? daily?.breakTime ?? employeeShift?.breakDuration
            });

            // Format check-in and check-out strings
            const checkInTimeStr = effectiveIn ? normalizeAttendanceTime(effectiveIn) : '--';
            const checkOutTimeStr = effectiveOut ? normalizeAttendanceTime(effectiveOut) : '--';

            const checkInDisplay = checkInTimeStr !== '--' ? formatISTDisplay(checkInTimeStr, false) : '--';
            const checkInFullDisplay = checkInTimeStr !== '--' ? formatISTDisplay(checkInTimeStr, true) : '--';

            const checkOutDisplay = checkOutTimeStr !== '--' ? formatISTDisplay(checkOutTimeStr, false) : '--';
            const checkOutFullDisplay = checkOutTimeStr !== '--' ? formatISTDisplay(checkOutTimeStr, true) : '--';

            // Duration: ensure duration is NEVER 0 or -- when both IN and OUT exist
            const durationMinutes = calc.durationMinutes > 0 ? calc.durationMinutes : totalDurationMins;
            const workedHours = calc.workedHours > 0 ? calc.workedHours : (daily?.workedHours !== undefined ? daily.workedHours : parseFloat((durationMinutes / 60).toFixed(2)));

            // Canonical status according to strict rules:
            // 1. Both IN and OUT exist -> COMPLETED
            // 2. Only IN exists and is today -> IN PROGRESS
            // 3. Only IN exists and is past date -> MISSING OUT
            // 4. Neither exists -> Weekly Off or Absent
            const canonicalStatus = calc.status;
            const isActiveShift = (calc.status === 'IN PROGRESS');

            return {
                _id: bestLog?._id || `daily-${dateStr}`,
                staff_id: targetStaffId,
                full_name: bestLog?.full_name || req.user.name,
                date: dateStr,
                login_time: earliestLogin || (effectiveIn ? new Date(`${dateStr}T${effectiveIn}`) : null),
                check_out: latestCheckOut || (effectiveOut ? new Date(`${dateStr}T${effectiveOut}`) : null),
                checkInStr: checkInTimeStr,
                checkOutStr: checkOutTimeStr,
                checkInDisplay,
                checkInFullDisplay,
                checkOutDisplay,
                checkOutFullDisplay,
                duration_minutes: durationMinutes,
                workedHours,
                status: canonicalStatus,
                completion_status: calc.completionStatus,
                shift_name: employeeShift.name,
                shift_code: employeeShift.code,
                is_overnight: employeeShift.isOvernight,
                is_late: calc.isLate,
                lateMinutes: calc.lateMinutes,
                is_early_exit: calc.isEarlyExit,
                earlyExitMinutes: calc.earlyExitMinutes,
                overtimeHours: ot?.hours || calc.overtimeHours || 0,
                location: bestLog?.location || null,
                rawAttemptsCount: dateBiometrics.length,
                is_active_shift: isActiveShift
            };
        });

        res.json(consolidatedTimesheets);
    } catch (error) {
        console.error('Error in getStaffLogs:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * View captured face image (Admin only)
 * Logs access to audit trail!
 * GET /api/attendance/:id/image
 */
exports.viewFaceImage = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Administrator role required to view face images.' });
        }

        const log = await Attendance.findById(req.params.id)
            .populate('staff_id', 'staff_id name email department designation profilePhoto');

        if (!log) {
            return res.status(404).json({ message: 'Attendance log not found' });
        }

        // Log this image view into the immutable audit trail
        const auditEntry = {
            action: 'IMAGE_VIEWED',
            performed_by: req.user._id || req.user.id,
            performed_by_name: req.user.name || 'Admin',
            timestamp: new Date(),
            details: `Admin ${req.user.name} inspected captured attendance face image`,
            ip_address: req.ip || req.headers['x-forwarded-for'] || ''
        };

        log.audit_trail.push(auditEntry);
        await log.save();

        res.json({
            success: true,
            face_image: log.face_image,
            face_image_deleted: log.face_image_deleted,
            face_image_deleted_by_name: log.face_image_deleted_by_name,
            face_image_deleted_at: log.face_image_deleted_at,
            audit_trail: log.audit_trail,
            staff: log.staff_id,
            timestamp: log.login_time,
            location: log.location
        });
    } catch (error) {
        console.error('Error viewing face image:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete captured face image (Admin only)
 * Purges image while PRESERVING attendance timestamp, verification status, and location!
 * DELETE /api/attendance/:id/image
 */
exports.deleteFaceImage = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can delete captured face images.' });
        }

        const log = await Attendance.findById(req.params.id);
        if (!log) {
            return res.status(404).json({ message: 'Attendance log not found' });
        }

        if (log.face_image_deleted) {
            return res.status(400).json({ message: 'Face image has already been deleted under retention policy.' });
        }

        // Purge image content
        log.face_image = null;
        log.face_image_deleted = true;
        log.face_image_deleted_by = req.user._id || req.user.id;
        log.face_image_deleted_by_name = req.user.name || 'Administrator';
        log.face_image_deleted_at = new Date();

        // Record audit trail event
        log.audit_trail.push({
            action: 'IMAGE_DELETED',
            performed_by: req.user._id || req.user.id,
            performed_by_name: req.user.name || 'Administrator',
            timestamp: new Date(),
            details: `Face image permanently purged under organizational privacy retention policy by ${req.user.name}. Attendance record preserved.`,
            ip_address: req.ip || req.headers['x-forwarded-for'] || ''
        });

        await log.save();

        res.json({
            success: true,
            message: 'Face image permanently deleted under retention policy. Attendance timestamp and location details retained.',
            log
        });
    } catch (error) {
        console.error('Error deleting face image:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Submit manual attendance correction request
 * POST /api/attendance/request-correction
 */
exports.requestCorrection = async (req, res) => {
    try {
        const {
            attendance_id,
            date,
            requested_action = 'Check in',
            requested_time,
            reason,
            location_notes = ''
        } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: 'Please provide a clear reason for the manual attendance correction.' });
        }

        const staffUser = await User.findById(req.user._id || req.user.id);
        const reqDate = date || new Date().toISOString().split('T')[0];
        const reqTime = requested_time ? new Date(requested_time) : new Date();

        let log = null;
        if (attendance_id) {
            log = await Attendance.findById(attendance_id);
        }

        if (!log) {
            // Create a pending correction log record
            log = new Attendance({
                staff_id: staffUser._id,
                full_name: staffUser.name,
                login_time: reqTime,
                date: reqDate,
                type: requested_action === 'Check out' ? 'OUT' : 'IN',
                action: requested_action,
                face_verified: false,
                status: 'fail',
                verification_result: 'manual_override',
                verification_reason: `Manual correction requested: ${reason}`,
                location: { address: location_notes || 'Location provided via correction request' },
                device_info: req.headers['user-agent'] || '',
                correction_status: 'pending'
            });
        } else {
            log.correction_status = 'pending';
        }

        log.correction_details = {
            reason,
            requested_action,
            requested_time: reqTime,
            requested_by: staffUser._id,
            requested_by_name: staffUser.name,
            requested_at: new Date()
        };

        log.audit_trail.push({
            action: 'CORRECTION_REQUESTED',
            performed_by: staffUser._id,
            performed_by_name: staffUser.name,
            timestamp: new Date(),
            details: `Staff requested ${requested_action} correction. Reason: ${reason}`
        });

        await log.save();

        res.json({
            success: true,
            message: 'Manual attendance correction request submitted for administrator review.',
            log
        });
    } catch (error) {
        console.error('Error requesting attendance correction:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Review attendance correction request (Admin only)
 * PUT /api/attendance/:id/review-correction
 */
exports.reviewCorrection = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can review attendance corrections.' });
        }

        const { decision, review_notes = '' } = req.body;
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ message: "Decision must be 'approved' or 'rejected'." });
        }

        const log = await Attendance.findById(req.params.id);
        if (!log) {
            return res.status(404).json({ message: 'Attendance log not found' });
        }

        log.correction_status = decision;
        if (!log.correction_details) log.correction_details = {};
        log.correction_details.reviewed_by = req.user._id || req.user.id;
        log.correction_details.reviewed_by_name = req.user.name || 'Admin';
        log.correction_details.reviewed_at = new Date();
        log.correction_details.review_notes = review_notes;

        if (decision === 'approved') {
            log.status = 'success';
            log.face_verified = true;
            log.verification_reason = `Approved by admin: ${review_notes || 'Manual review verified'}`;
            log.verification_result = 'manual_override';

            // Also update DailyAttendance
            const today = log.date;
            const logTime = log.correction_details?.requested_time || log.login_time;
            const timeStr = getISTTimeString(logTime);

            const updatePayload = {
                status: 'Present',
                isApproved: true,
                markedBy: req.user._id,
                updatedAt: new Date()
            };

            if (log.action === 'Check out' || log.type === 'OUT') {
                updatePayload.checkOut = timeStr;
            } else {
                updatePayload.checkIn = timeStr;
            }

            await DailyAttendance.findOneAndUpdate(
                { staffId: log.staff_id, date: today },
                updatePayload,
                { upsert: true, new: true }
            );
        }

        log.audit_trail.push({
            action: decision === 'approved' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED',
            performed_by: req.user._id || req.user.id,
            performed_by_name: req.user.name || 'Admin',
            timestamp: new Date(),
            details: `Correction ${decision} by ${req.user.name}. Notes: ${review_notes || 'None'}`
        });

        await log.save();

        res.json({
            success: true,
            message: `Correction request ${decision}.`,
            log
        });
    } catch (error) {
        console.error('Error reviewing attendance correction:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get exception logs and pending correction requests (Admin only)
 * GET /api/attendance/exceptions
 */
exports.getExceptions = async (req, res) => {
    try {
        const exceptions = await Attendance.find({
            $or: [
                { correction_status: { $in: ['pending', 'approved', 'rejected'] } },
                { status: 'fail' },
                { verification_result: { $ne: 'success' } }
            ]
        })
            .populate('staff_id', 'staff_id name email department designation profilePhoto')
            .sort({ login_time: -1 })
            .limit(100);

        res.json(exceptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Enroll or update staff face template with explicit consent
 * POST /api/attendance/enroll-face
 */
exports.enrollFaceTemplate = async (req, res) => {
    try {
        const { descriptor, consentGiven } = req.body;
        if (!consentGiven) {
            return res.status(400).json({ message: 'Explicit consent is required to enroll biometric face template.' });
        }
        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor format. Expected 128-dimensional vector.' });
        }

        const userId = req.user._id || req.user.id;

        // Check if this biometric face already belongs to another registered user
        const otherFaces = await FaceData.find({ userId: { $ne: userId } }).populate('userId', 'name role');
        for (const record of otherFaces) {
            if (record.userId && record.faceEmbedding && record.faceEmbedding.length === 128) {
                const dist = getEuclideanDistance(descriptor, record.faceEmbedding);
                if (dist <= 0.45) {
                    return res.status(400).json({
                        message: `Cannot enroll: This facial template matches registered ${record.userId.role || 'user'} "${record.userId.name}". Each user must have a unique facial template.`
                    });
                }
            }
        }

        const otherUsersWithFace = await User.find({
            _id: { $ne: userId },
            faceDescriptor: { $exists: true, $not: { $size: 0 } }
        }).select('name role faceDescriptor');
        for (const u of otherUsersWithFace) {
            if (u.faceDescriptor && u.faceDescriptor.length === 128) {
                const dist = getEuclideanDistance(descriptor, u.faceDescriptor);
                if (dist <= 0.45) {
                    return res.status(400).json({
                        message: `Cannot enroll: This facial template matches registered ${u.role || 'user'} "${u.name}". Each user must have a unique facial template.`
                    });
                }
            }
        }

        await User.findByIdAndUpdate(userId, { faceDescriptor: descriptor });
        await FaceData.findOneAndUpdate(
            { userId },
            { faceEmbedding: descriptor, createdAt: new Date() },
            { upsert: true }
        );

        res.json({
            success: true,
            message: 'Biometric face template registered successfully.'
        });
    } catch (error) {
        console.error('Error enrolling face template:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete complete attendance record (Admin only)
 * DELETE /api/attendance/:id
 */
exports.deleteLog = async (req, res) => {
    try {
        const log = await Attendance.findById(req.params.id);
        if (!log) return res.status(404).json({ message: 'Log not found' });
        await log.deleteOne();
        res.json({ message: 'Attendance record deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update attendance log (Admin only)
 * PUT /api/attendance/:id
 */
exports.updateLog = async (req, res) => {
    try {
        const { login_time, check_out, status, action } = req.body;
        const log = await Attendance.findById(req.params.id);


        if (!log) return res.status(404).json({ message: 'Log not found' });


        if (login_time) log.login_time = new Date(login_time);
        if (check_out) log.check_out = new Date(check_out);
        if (status) log.status = status;
        if (action) log.action = action;


        if (log.login_time && log.check_out) {
            log.duration_minutes = Math.round((log.check_out - log.login_time) / 60000);
            log.type = 'OUT';
        }

        log.audit_trail.push({
            action: 'MANUALLY_EDITED',
            performed_by: req.user._id || req.user.id,
            performed_by_name: req.user.name || 'Admin',
            timestamp: new Date(),
            details: `Log manually edited by admin ${req.user.name}`
        });


        await log.save();
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
