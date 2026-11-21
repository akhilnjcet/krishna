const Leave = require('../models/Leave');
const { sendStatusUpdateEmail } = require('../services/emailService');

exports.applyLeave = async (req, res) => {
    try {
        const { reason, startDate, endDate } = req.body;

        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({ message: 'A valid reason for leave is required.' });
        }
        if (!startDate || isNaN(new Date(startDate).getTime())) {
            return res.status(400).json({ message: 'A valid start date is required.' });
        }
        if (!endDate || isNaN(new Date(endDate).getTime())) {
            return res.status(400).json({ message: 'A valid end date is required.' });
        }
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: 'End date cannot be earlier than start date.' });
        }

        const leave = await Leave.create({
            staffId: req.user.id,
            reason: reason.trim(),
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        try {
            const { dispatchNotification } = require('../services/notificationDispatcher');
            dispatchNotification({
                title: 'New Leave Request',
                message: `${req.user.name || 'Staff member'} submitted a leave request for ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
                category: 'leave',
                priority: 'medium',
                recipientRole: 'admin',
                link: '/admin/leave',
                metadata: { leaveId: leave._id, staffId: req.user.id }
            }).catch(() => {});
        } catch (e) {}

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLeaves = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'staff' || req.user.role === 'driver') {
            filter.staffId = req.user.id;
        }
        const leaves = await Leave.find(filter).populate('staffId', 'name email').sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateLeaveStatus = async (req, res) => {
    try {
        const rawStatus = (req.body.status || '').toLowerCase().trim();
        const validStatuses = ['pending', 'approved', 'rejected'];

        if (!validStatuses.includes(rawStatus)) {
            return res.status(400).json({ 
                message: `Invalid status "${req.body.status}". Allowed values: pending, approved, rejected.` 
            });
        }

        const leave = await Leave.findByIdAndUpdate(
            req.params.id,
            { status: rawStatus },
            { new: true, runValidators: true }
        ).populate('staffId', 'name email');
        
        if (!leave) return res.status(404).json({ message: 'Leave not found' });
        
        res.json(leave);

        try {
            const { dispatchNotification } = require('../services/notificationDispatcher');
            const targetStaffId = leave.staffId?._id || leave.staffId;
            dispatchNotification({
                title: `Leave Request ${rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)}`,
                message: `Your leave request has been marked as ${rawStatus}.`,
                category: 'leave',
                priority: rawStatus === 'approved' ? 'medium' : 'high',
                recipientRole: 'staff',
                recipientUser: targetStaffId,
                link: '/staff/leave',
                metadata: { leaveId: leave._id, status: rawStatus }
            }).catch(() => {});
        } catch (e) {}

        // Notify Staff
        if (rawStatus && leave.staffId?.email) {
            sendStatusUpdateEmail(leave.staffId.email, leave.staffId.name, 'Leave Request', rawStatus).catch(console.error);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
