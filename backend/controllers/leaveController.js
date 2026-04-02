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

        // Notify Staff
        if (req.body.status && leave.staffId?.email) {
            sendStatusUpdateEmail(leave.staffId.email, leave.staffId.name, 'Leave Request', req.body.status).catch(console.error);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
