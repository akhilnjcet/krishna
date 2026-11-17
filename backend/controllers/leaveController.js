const Leave = require('../models/Leave');
const { sendStatusUpdateEmail } = require('../services/emailService');

exports.applyLeave = async (req, res) => {
    try {
        const { reason, startDate, endDate } = req.body;
        const leave = await Leave.create({
            staffId: req.user.id,
            reason,
            startDate,
            endDate
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
        if (req.user.role === 'staff') {
            filter.staffId = req.user.id;
        }
        const leaves = await Leave.find(filter).populate('staffId', 'name email');
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateLeaveStatus = async (req, res) => {
    try {
        const leave = await Leave.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        ).populate('staffId', 'name email');
        
        if (!leave) return res.status(404).json({ message: 'Leave not found' });
        
        res.json(leave);

        try {
            const { dispatchNotification } = require('../services/notificationDispatcher');
            const targetStaffId = leave.staffId?._id || leave.staffId;
            dispatchNotification({
                title: `Leave Request ${req.body.status}`,
                message: `Your leave request has been marked as ${req.body.status}.`,
                category: 'leave',
                priority: req.body.status === 'Approved' ? 'medium' : 'high',
                recipientRole: 'staff',
                recipientUser: targetStaffId,
                link: '/staff/leave',
                metadata: { leaveId: leave._id, status: req.body.status }
            }).catch(() => {});
        } catch (e) {}

        // Notify Staff
        if (req.body.status && leave.staffId?.email) {
            sendStatusUpdateEmail(leave.staffId.email, leave.staffId.name, 'Leave Request', req.body.status).catch(console.error);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
