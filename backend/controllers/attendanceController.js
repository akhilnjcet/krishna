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

        // Retrieve registered face template for this staff member
        let registeredDescriptor = staffUser.faceDescriptor && staffUser.faceDescriptor.length === 128
            ? staffUser.faceDescriptor
            : null;

        if (!registeredDescriptor) {
            const faceRecord = await FaceData.findOne({ userId: staffUser._id });
            if (faceRecord && faceRecord.faceEmbedding && faceRecord.faceEmbedding.length === 128) {
                registeredDescriptor = faceRecord.faceEmbedding;
            }
        }

        let isFaceMatched = false;
        let matchDistance = 1.0;
        let confidenceScore = 0;
        let verificationReason = 'Biometric Face Match';
        let verificationResult = 'success';

        // Face comparison if descriptor provided
        if (descriptor && Array.isArray(descriptor) && descriptor.length === 128) {
            if (registeredDescriptor) {
                matchDistance = getEuclideanDistance(descriptor, registeredDescriptor);
                confidenceScore = getConfidenceScore(matchDistance);
                // Threshold 0.52 (industry standard for face-api 128d)
                if (matchDistance <= 0.52) {
                    isFaceMatched = true;
                    verificationResult = 'success';
                } else {
                    isFaceMatched = false;
                    verificationResult = 'mismatch';
                    verificationReason = `Face mismatch (Distance: ${matchDistance.toFixed(2)}, required <= 0.52)`;
                }
            } else {
                // First-time enrollment on scan with acknowledged consent
                if (consent_acknowledged) {
                    staffUser.faceDescriptor = descriptor;
                    await staffUser.save();
                    await FaceData.findOneAndUpdate(
                        { userId: staffUser._id },
                        { faceEmbedding: descriptor },
                        { upsert: true }
                    );
                    isFaceMatched = true;
                    confidenceScore = 95;
                    verificationReason = 'Initial biometric template enrollment and verification';
                    verificationResult = 'success';
                } else {
                    isFaceMatched = false;
                    verificationResult = 'mismatch';
                    verificationReason = 'No registered face template found. Consent required before enrollment.';
                }
            }
        } else {
            isFaceMatched = false;
            verificationResult = 'fail';
            verificationReason = 'No valid facial biometric descriptor captured';
        }

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
            // Find the active check-in record for today
            const activeSession = await Attendance.findOne({
                staff_id: staffUser._id,
                date: today,
                status: 'success'
            }).sort({ login_time: 1 });

            if (!activeSession) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot check out: No active check-in session found for today. Please check in first.'
                });
            }

            if (overallStatus === 'success') {
                const durationCalc = calculateDuration(activeSession.login_time, now);
                const workedHours = durationCalc.hours;
                const durationMins = durationCalc.minutes;

                activeSession.check_out = now;
                activeSession.action = 'Check in / Check out';
                activeSession.duration_minutes = durationMins;
                activeSession.location = validatedLocation;
                activeSession.audit_trail.push({
                    action: 'RECORDED',
                    performed_by: staffUser._id,
                    performed_by_name: staffUser.name,
                    timestamp: now,
                    details: `Check out recorded via face scan (Confidence: ${confidenceScore}%) and location. Duration: ${durationCalc.formatted}.`,
                    ip_address: req.ip || req.headers['x-forwarded-for'] || ''
                });

                await activeSession.save();
                attendanceRecord = activeSession;

                // Sync DailyAttendance
                const checkInTimeStr = getISTTimeString(activeSession.login_time);
                const dailyStatus = workedHours >= 7.5 ? 'Present' : (workedHours >= 4 ? 'Half Day' : 'Half Day');

                await DailyAttendance.findOneAndUpdate(
                    { staffId: staffUser._id, date: today },
                    {
                        status: dailyStatus,
                        checkIn: checkInTimeStr,
                        checkOut: timeStr,
                        workedHours,
                        isApproved: true,
                        updatedAt: now
                    },
                    { upsert: true, new: true }
                );

                // Overtime calculation
                const stdHours = staffUser.standardWorkingHoursPerDay || 8;
                const Overtime = require('../models/Overtime');
                if (workedHours > stdHours) {
                    const otHours = parseFloat((workedHours - stdHours).toFixed(2));
                    const otRate = staffUser.overtimeRate || 0;
                    const otAmount = parseFloat((otHours * otRate).toFixed(2));
                    const otStatus = staffUser.otApprovalRequired ? 'Pending' : 'Approved';

                    await Overtime.findOneAndUpdate(
                        { staffId: staffUser._id, date: today },
                        {
                            staffId: staffUser._id,
                            date: today,
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
            // Check-In flow: Create single canonical attendance record
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
                    details: `${normalizedAction} recorded via face scan (Confidence: ${confidenceScore}%) and location`,
                    ip_address: req.ip || req.headers['x-forwarded-for'] || ''
                }]
            });

            await attendanceRecord.save();

            if (overallStatus === 'success') {
                await DailyAttendance.findOneAndUpdate(
                    { staffId: staffUser._id, date: today },
                    {
                        status: 'Present',
                        checkIn: timeStr,
                        checkOut: '',
                        workedHours: 0,
                        markedBy: staffUser._id,
                        isApproved: true,
                        updatedAt: now
                    },
                    { upsert: true, new: true }
                );
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

                // Await delivery with a 3.5s timeout so cloud/serverless environments do not freeze before sockets finish sending
                if (dispatchTasks.length > 0) {
                    await Promise.race([
                        Promise.allSettled(dispatchTasks),
                        new Promise(resolve => setTimeout(resolve, 3500))
                    ]);
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

        // Fetch raw biometric logs, daily register records, and overtime records concurrently
        const [rawLogs, dailyRecords, otRecords] = await Promise.all([
            Attendance.find(biometricQuery).sort({ date: 1, login_time: 1 }),
            DailyAttendance.find(dailyQuery).sort({ date: 1 }),
            Overtime.find(dailyQuery)
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

        // Collect all distinct dates from both sources
        const allDates = Array.from(new Set([
            ...dailyRecords.map(d => d.date),
            ...rawLogs.map(l => l.date)
        ])).sort(); // Ascending chronological order (YYYY-MM-DD)

        const todayStr = getISTDate(new Date());

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

            // Calculate duration if check_out exists
            if (earliestLogin && latestCheckOut && totalDurationMins === 0) {
                totalDurationMins = Math.max(1, Math.round((new Date(latestCheckOut) - new Date(earliestLogin)) / 60000));
            }

            // Priority to authoritative biometric login_time in IST; fallback to DailyAttendance
            const checkInTimeStr = earliestLogin 
                ? getISTTimeString(earliestLogin) 
                : (daily?.checkIn ? normalizeAttendanceTime(daily.checkIn) : '--');
            const checkOutTimeStr = latestCheckOut 
                ? getISTTimeString(latestCheckOut) 
                : (daily?.checkOut ? normalizeAttendanceTime(daily.checkOut) : '--');

            const checkInDisplay = earliestLogin 
                ? formatISTDisplay(earliestLogin, false) 
                : (checkInTimeStr !== '--' ? formatISTDisplay(checkInTimeStr, false) : '--');
            const checkInFullDisplay = earliestLogin 
                ? formatISTDisplay(earliestLogin, true) 
                : checkInDisplay;

            const checkOutDisplay = latestCheckOut 
                ? formatISTDisplay(latestCheckOut, false) 
                : (checkOutTimeStr !== '--' ? formatISTDisplay(checkOutTimeStr, false) : '--');
            const checkOutFullDisplay = latestCheckOut 
                ? formatISTDisplay(latestCheckOut, true) 
                : checkOutDisplay;

            const workedHours = daily?.workedHours !== undefined ? daily.workedHours : parseFloat((totalDurationMins / 60).toFixed(2));

            // Determine canonical status
            let canonicalStatus = 'Absent';
            if (daily?.status) {
                canonicalStatus = daily.status;
            } else if (earliestLogin) {
                if (!latestCheckOut && dateStr === todayStr) {
                    canonicalStatus = 'Present';
                } else if (workedHours >= 7.5 || totalDurationMins >= 450) {
                    canonicalStatus = 'Present';
                } else if (workedHours >= 4 || totalDurationMins >= 240) {
                    canonicalStatus = 'Half Day';
                } else {
                    canonicalStatus = 'Present';
                }
            }

            return {
                _id: bestLog?._id || `daily-${dateStr}`,
                staff_id: targetStaffId,
                full_name: bestLog?.full_name || req.user.name,
                date: dateStr,
                login_time: earliestLogin,
                check_out: latestCheckOut,
                checkInStr: checkInTimeStr,
                checkOutStr: checkOutTimeStr,
                checkInDisplay,
                checkInFullDisplay,
                checkOutDisplay,
                checkOutFullDisplay,
                duration_minutes: totalDurationMins,
                workedHours,
                status: canonicalStatus,
                overtimeHours: ot?.hours || 0,
                location: bestLog?.location || null,
                rawAttemptsCount: dateBiometrics.length,
                is_active_shift: (!latestCheckOut && dateStr === todayStr && !!earliestLogin)
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
