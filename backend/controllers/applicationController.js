const Application = require('../models/Application');
const Expense = require('../models/Expense');
const DailyAttendance = require('../models/DailyAttendance');
const Overtime = require('../models/Overtime');
const Salary = require('../models/Salary');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const { recalculateSalary } = require('../utils/salaryCalculator');

// Helper to calculate hours between two HH:mm strings
const calculateHoursBetween = (inTime, outTime) => {
    if (!inTime || !outTime) return 8;
    try {
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight
        return Math.max(0, parseFloat((diffMinutes / 60).toFixed(2)));
    } catch (e) {
        return 8;
    }
};

exports.getApplications = async (req, res) => {
    try {
        const { status, type } = req.query;
        let query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        
        // If staff, only show their own applications
        if (req.user.role === 'staff') {
            query.staffId = req.user.id;
        }

        const applications = await Application.find(query)
            .populate('staffId', 'name email role phone profilePhoto department designation base_salary workingDaysPerMonth standardWorkingHoursPerDay')
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getApplicationById = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('staffId', 'name email role phone profilePhoto department designation base_salary workingDaysPerMonth standardWorkingHoursPerDay')
            .populate('reviewedBy', 'name email role');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        if (req.user.role === 'staff' && application.staffId._id.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(application);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createApplication = async (req, res) => {
    try {
        const { type, title, reason, amount, startDate, endDate, entries } = req.body;

        // Validation for unlogged overtime or attendance issues
        if (['unlogged_overtime', 'attendance_issue'].includes(type)) {
            if (!entries || !Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({ message: 'Please provide at least one date entry for your request.' });
            }

            // Check for duplicate dates in the same request
            const dateSet = new Set();
            for (const entry of entries) {
                if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
                    return res.status(400).json({ message: `Invalid date format: ${entry.date || 'Empty date'}. Expected YYYY-MM-DD.` });
                }
                if (dateSet.has(entry.date)) {
                    return res.status(400).json({ message: `Duplicate date ${entry.date} found in request. Please combine into a single entry.` });
                }
                dateSet.add(entry.date);
            }
        }

        const descText = req.body.description || req.body.reason || req.body.title || 'Staff Request';
        const application = await Application.create({
            staffId: req.user.id,
            type,
            title,
            description: descText,
            reason: req.body.reason || descText,
            amount: amount || 0,
            startDate,
            endDate,
            entries: entries || [],
            status: 'pending',
            auditTrail: [{
                action: 'Request Submitted',
                performedBy: req.user.id,
                performedByName: req.user.name || 'Staff Member',
                timestamp: new Date(),
                details: `Submitted ${type} request with ${(entries || []).length} date entries.`
            }]
        });

        // Notify Admin
        try {
            const staffUser = await User.findById(req.user.id);
            const staffName = staffUser ? staffUser.name : 'Staff';
            await Notification.create({
                title: `New ${type.replace(/_/g, ' ').toUpperCase()} Request`,
                message: `${staffName} submitted a ${type.replace(/_/g, ' ')} request: "${title}" with ${(entries || []).length} date(s).`,
                category: 'attendance',
                priority: 'medium',
                recipientRole: 'admin',
                senderUser: req.user.id,
                link: '/admin/applications'
            });
        } catch (notifErr) {
            console.error('Notification dispatch error (non-fatal):', notifErr.message);
        }

        res.status(201).json(application);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Side-by-side comparison endpoint for Admin review
 * Fetches application and recorded DailyAttendance, Overtime, Leave, and locked Payroll status for each requested date
 */
exports.getApplicationComparison = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('staffId', 'name email role phone profilePhoto department designation base_salary workingDaysPerMonth standardWorkingHoursPerDay');
        
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const staffId = application.staffId._id || application.staffId;
        const entries = application.entries || [];
        const comparisons = [];

        for (const entry of entries) {
            const entryDate = entry.date;
            const monthStr = entryDate.substring(0, 7);

            // Fetch recorded DailyAttendance
            const recordedAttendance = await DailyAttendance.findOne({
                staffId,
                date: entryDate
            }).populate('shiftId');

            // Fetch recorded Overtime
            const recordedOvertime = await Overtime.findOne({
                staffId,
                date: entryDate
            });

            // Fetch raw Attendance punches if any
            const recordedPunches = await Attendance.find({
                staff_id: staffId,
                date: entryDate
            }).sort({ timestamp: 1 });

            // Fetch approved Leave if any
            const dateObj = new Date(entryDate);
            const approvedLeave = await Leave.findOne({
                staffId,
                startDate: { $lte: dateObj },
                endDate: { $gte: dateObj },
                status: 'Approved'
            });

            // Fetch Month Salary record to verify if payroll is locked / finalized
            const salaryRecord = await Salary.findOne({ staffId, month: monthStr });
            const isPayrollLocked = salaryRecord ? (salaryRecord.paymentStatus === 'paid' || salaryRecord.paymentStatus === 'Paid') : false;

            comparisons.push({
                entry,
                recordedAttendance: recordedAttendance ? {
                    _id: recordedAttendance._id,
                    status: recordedAttendance.status,
                    checkIn: recordedAttendance.checkIn || null,
                    checkOut: recordedAttendance.checkOut || null,
                    workedHours: recordedAttendance.workedHours || 0,
                    overtimeHours: recordedAttendance.overtimeHours || 0,
                    shiftName: recordedAttendance.shiftName || (recordedAttendance.shiftId ? recordedAttendance.shiftId.name : null),
                    isApproved: recordedAttendance.isApproved,
                    manualCorrectionReason: recordedAttendance.manualCorrectionReason || null
                } : null,
                recordedOvertime: recordedOvertime ? {
                    _id: recordedOvertime._id,
                    hours: recordedOvertime.hours,
                    ratePerHour: recordedOvertime.ratePerHour,
                    totalAmount: recordedOvertime.totalAmount,
                    status: recordedOvertime.status,
                    approvedBy: recordedOvertime.approvedBy,
                    remarks: recordedOvertime.remarks
                } : null,
                rawPunchesCount: recordedPunches.length,
                approvedLeave: approvedLeave ? {
                    type: approvedLeave.type,
                    reason: approvedLeave.reason,
                    days: approvedLeave.days
                } : null,
                payrollLocked: isPayrollLocked,
                payrollStatus: salaryRecord ? salaryRecord.paymentStatus : 'unpaid'
            });
        }

        res.json({
            application,
            comparisons
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Review & Decision handler for Admin
 * Performs side-by-side corrections, updates DailyAttendance & Overtime, recalculates salary, updates audit trail
 */
exports.reviewApplication = async (req, res) => {
    try {
        const { overallStatus, adminRemark, entryDecisions, forceUnlockedApproval } = req.body;
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const staffId = application.staffId;
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Associated staff member not found' });
        }

        // Check if any date belongs to a locked/paid payroll period
        const affectedMonths = new Set();
        (application.entries || []).forEach(e => {
            if (e.date) affectedMonths.add(e.date.substring(0, 7));
        });

        const lockedMonths = [];
        for (const month of affectedMonths) {
            const sal = await Salary.findOne({ staffId, month });
            if (sal && (sal.paymentStatus === 'paid' || sal.paymentStatus === 'Paid')) {
                lockedMonths.push(month);
            }
        }

        if (lockedMonths.length > 0 && !forceUnlockedApproval && ['approved', 'partially_approved'].includes(overallStatus)) {
            return res.status(400).json({
                message: `Payroll for month(s) ${lockedMonths.join(', ')} is finalized and marked as PAID. Modifying attendance/overtime for this period requires explicit admin confirmation override.`,
                requiresConfirmation: true,
                lockedMonths
            });
        }

        // Calculate standard overtime rate
        const baseSalary = staff.base_salary || 0;
        const workingDays = staff.workingDaysPerMonth || 26;
        const workingHoursPerDay = staff.standardWorkingHoursPerDay || 8;
        const defaultHourlyRate = workingDays * workingHoursPerDay > 0
            ? parseFloat((baseSalary / (workingDays * workingHoursPerDay)).toFixed(2))
            : 100;
        const defaultOtRate = parseFloat((defaultHourlyRate * 1.5).toFixed(2));

        const appliedChanges = [];

        // Process entries if provided
        if (entryDecisions && Array.isArray(entryDecisions)) {
            const entryDecisionMap = new Map();
            entryDecisions.forEach(d => entryDecisionMap.set(String(d.entryId || d._id), d));

            for (let i = 0; i < application.entries.length; i++) {
                const entry = application.entries[i];
                const decision = entryDecisionMap.get(entry._id.toString());
                
                if (decision) {
                    entry.status = decision.status || entry.status;
                    entry.adminRemark = decision.adminRemark !== undefined ? decision.adminRemark : entry.adminRemark;
                    if (decision.approvedCheckIn !== undefined) entry.approvedCheckIn = decision.approvedCheckIn;
                    if (decision.approvedCheckOut !== undefined) entry.approvedCheckOut = decision.approvedCheckOut;
                    if (decision.approvedOvertimeHours !== undefined) entry.approvedOvertimeHours = Number(decision.approvedOvertimeHours);

                    // If approved or overall approved and entry is approved
                    if (entry.status === 'approved') {
                        const inTime = entry.approvedCheckIn || entry.requestedIn || '09:00';
                        const outTime = entry.approvedCheckOut || entry.requestedOut || '18:00';
                        const workedHours = calculateHoursBetween(inTime, outTime);
                        const otHours = entry.approvedOvertimeHours !== undefined 
                            ? Number(entry.approvedOvertimeHours) 
                            : (entry.overtimeHours || 0);

                        // 1. Upsert DailyAttendance
                        const existingDaily = await DailyAttendance.findOne({ staffId, date: entry.date });
                        if (existingDaily) {
                            if (!existingDaily.originalCheckIn && existingDaily.checkIn) {
                                existingDaily.originalCheckIn = existingDaily.checkIn;
                            }
                            if (!existingDaily.originalCheckOut && existingDaily.checkOut) {
                                existingDaily.originalCheckOut = existingDaily.checkOut;
                            }
                            existingDaily.checkIn = inTime;
                            existingDaily.checkOut = outTime;
                            existingDaily.workedHours = workedHours;
                            existingDaily.status = 'Present';
                            existingDaily.isApproved = true;
                            existingDaily.manualCorrectionReason = `Staff Request #${application._id}: ${entry.adminRemark || adminRemark || 'Admin correction'}`;
                            existingDaily.correctedBy = req.user.id;
                            existingDaily.correctedAt = new Date();
                            if (otHours > 0) existingDaily.overtimeHours = otHours;
                            await existingDaily.save();
                        } else {
                            await DailyAttendance.create({
                                staffId,
                                date: entry.date,
                                checkIn: inTime,
                                checkOut: outTime,
                                workedHours,
                                status: 'Present',
                                isApproved: true,
                                overtimeHours: otHours,
                                manualCorrectionReason: `Staff Request #${application._id} approved`,
                                correctedBy: req.user.id,
                                correctedAt: new Date()
                            });
                        }

                        // 2. Upsert Overtime if applicable
                        if (otHours > 0) {
                            const otAmount = parseFloat((otHours * defaultOtRate).toFixed(2));
                            await Overtime.findOneAndUpdate(
                                { staffId, date: entry.date },
                                {
                                    staffId,
                                    date: entry.date,
                                    hours: otHours,
                                    ratePerHour: defaultOtRate,
                                    totalAmount: otAmount,
                                    status: 'Approved',
                                    approvedBy: req.user.name || 'Admin',
                                    approvalDate: new Date(),
                                    remarks: `Approved from Staff Request #${application._id}. Note: ${entry.adminRemark || adminRemark || ''}`,
                                    addedBy: req.user.id
                                },
                                { upsert: true, new: true }
                            );
                        }

                        appliedChanges.push({
                            date: entry.date,
                            action: 'Attendance/OT Updated',
                            inTime,
                            outTime,
                            workedHours,
                            otHours
                        });
                    }
                }
            }
        } else if (overallStatus === 'approved') {
            // Approve all entries uniformly
            for (let i = 0; i < application.entries.length; i++) {
                const entry = application.entries[i];
                entry.status = 'approved';
                const inTime = entry.requestedIn || '09:00';
                const outTime = entry.requestedOut || '18:00';
                const workedHours = calculateHoursBetween(inTime, outTime);
                const otHours = entry.overtimeHours || 0;

                const existingDaily = await DailyAttendance.findOne({ staffId, date: entry.date });
                if (existingDaily) {
                    if (!existingDaily.originalCheckIn && existingDaily.checkIn) {
                        existingDaily.originalCheckIn = existingDaily.checkIn;
                    }
                    if (!existingDaily.originalCheckOut && existingDaily.checkOut) {
                        existingDaily.originalCheckOut = existingDaily.checkOut;
                    }
                    existingDaily.checkIn = inTime;
                    existingDaily.checkOut = outTime;
                    existingDaily.workedHours = workedHours;
                    existingDaily.status = 'Present';
                    existingDaily.isApproved = true;
                    existingDaily.manualCorrectionReason = `Staff Request #${application._id}: ${adminRemark || 'Admin approval'}`;
                    existingDaily.correctedBy = req.user.id;
                    existingDaily.correctedAt = new Date();
                    if (otHours > 0) existingDaily.overtimeHours = otHours;
                    await existingDaily.save();
                } else {
                    await DailyAttendance.create({
                        staffId,
                        date: entry.date,
                        checkIn: inTime,
                        checkOut: outTime,
                        workedHours,
                        status: 'Present',
                        isApproved: true,
                        overtimeHours: otHours,
                        manualCorrectionReason: `Staff Request #${application._id} approved`,
                        correctedBy: req.user.id,
                        correctedAt: new Date()
                    });
                }

                if (otHours > 0) {
                    const otAmount = parseFloat((otHours * defaultOtRate).toFixed(2));
                    await Overtime.findOneAndUpdate(
                        { staffId, date: entry.date },
                        {
                            staffId,
                            date: entry.date,
                            hours: otHours,
                            ratePerHour: defaultOtRate,
                            totalAmount: otAmount,
                            status: 'Approved',
                            approvedBy: req.user.name || 'Admin',
                            approvalDate: new Date(),
                            remarks: `Approved from Staff Request #${application._id}. ${adminRemark || ''}`,
                            addedBy: req.user.id
                        },
                        { upsert: true, new: true }
                    );
                }

                appliedChanges.push({
                    date: entry.date,
                    action: 'Attendance/OT Updated',
                    inTime,
                    outTime,
                    workedHours,
                    otHours
                });
            }
        } else if (overallStatus === 'rejected') {
            for (let i = 0; i < application.entries.length; i++) {
                application.entries[i].status = 'rejected';
                if (adminRemark) application.entries[i].adminRemark = adminRemark;
            }
        }

        // Recalculate salary for all affected months
        for (const month of affectedMonths) {
            try {
                await recalculateSalary(staffId, month);
            } catch (salErr) {
                console.error(`Salary recalculation failed for ${month}:`, salErr.message);
            }
        }

        // Update application state
        application.status = overallStatus || application.status;
        application.adminRemark = adminRemark || application.adminRemark;
        application.reviewedBy = req.user.id;
        application.reviewedByName = req.user.name || 'Admin';
        application.reviewedAt = new Date();

        // Audit Trail Entry
        application.auditTrail.push({
            action: `Decision: ${application.status.toUpperCase()}`,
            performedBy: req.user.id,
            performedByName: req.user.name || 'Admin',
            timestamp: new Date(),
            details: adminRemark || 'No remarks provided.',
            changes: {
                overallStatus: application.status,
                appliedChanges,
                forceUnlockedApproval: Boolean(forceUnlockedApproval)
            }
        });

        await application.save();

        // Notify Staff Member
        try {
            await Notification.create({
                title: `Request ${application.status.toUpperCase()}: ${application.title}`,
                message: `Your ${application.type.replace(/_/g, ' ')} request has been ${application.status}. ${adminRemark ? 'Remark: ' + adminRemark : ''}`,
                category: 'attendance',
                priority: 'medium',
                recipientRole: 'staff',
                recipientUser: staffId,
                senderUser: req.user.id,
                link: '/staff/applications'
            });
        } catch (notifErr) {
            console.error('Notification dispatch error (non-fatal):', notifErr.message);
        }

        res.json({
            message: `Application reviewed successfully with status: ${application.status}`,
            application,
            affectedMonths: Array.from(affectedMonths),
            appliedChanges
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status, adminRemark } = req.body;
        const application = await Application.findById(req.params.id);

        if (!application) return res.status(404).json({ message: 'Application not found' });

        application.status = status || application.status;
        application.adminRemark = adminRemark || application.adminRemark;
        application.reviewedBy = req.user.id;
        application.reviewedByName = req.user.name || 'Admin';
        application.reviewedAt = new Date();

        application.auditTrail.push({
            action: `Status Updated to ${status}`,
            performedBy: req.user.id,
            performedByName: req.user.name || 'Admin',
            timestamp: new Date(),
            details: adminRemark || ''
        });

        await application.save();

        // If approved and has an amount, record as expense
        if (status === 'approved' && application.amount > 0) {
            await Expense.create({
                title: `Staff Request Approved: ${application.title} (${application.type})`,
                amount: application.amount,
                category: 'staff',
                description: `Application approved for staff member. Admin Remark: ${adminRemark}`,
                recordedBy: req.user.id
            });
        }

        // Notify Staff
        try {
            await Notification.create({
                title: `Application ${status.toUpperCase()}`,
                message: `Your request "${application.title}" was marked ${status}.`,
                category: 'staff',
                priority: 'medium',
                recipientRole: 'staff',
                recipientUser: application.staffId,
                senderUser: req.user.id,
                link: '/staff/applications'
            });
        } catch (e) {}

        res.json({ message: 'Application status updated successfully', application });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteApplication = async (req, res) => {
    try {
        await Application.findByIdAndDelete(req.params.id);
        res.json({ message: 'Application removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
