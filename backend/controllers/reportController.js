const WorkReport = require('../models/WorkReport');

exports.submitReport = async (req, res) => {
    try {
        const report = await WorkReport.create({
            ...req.body,
            staffId: req.user.id
        });
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getReports = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'staff') {
            filter.staffId = req.user.id;
        }
        const reports = await WorkReport.find(filter)
            .populate('staffId', 'name email department')
            .sort({ date: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const report = await WorkReport.findByIdAndDelete(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.json({ message: 'Report removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
