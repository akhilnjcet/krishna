const Application = require('../models/Application');
const Expense = require('../models/Expense');

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
            .populate('staffId', 'name email role phone profilePhoto')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createApplication = async (req, res) => {
    try {
        const application = await Application.create({
            ...req.body,
            staffId: req.user.id,
            status: 'pending'
        });
        res.status(201).json(application);
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
