const Project = require('../models/Project');
const { sendProgressUpdate } = require('../services/whatsappService');

exports.createProject = async (req, res) => {
    try {
        const { title, customerId, serviceType } = req.body;
        
        if (!title || !customerId || !serviceType) {
            return res.status(400).json({ 
                message: "Title, Customer ID, and Service Type are required." 
            });
        }

        const project = new Project(req.body);
        const savedProject = await project.save();
        
        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        await recalculateProjectPaymentStatus(savedProject._id);
        
        console.log(`✅ Project Created: ${savedProject.title}`);
        res.status(201).json(savedProject);
    } catch (error) {
        console.error('❌ Project Creation Error:', error);
        res.status(500).json({ 
            message: error.message,
            tip: "Check if Customer ID is a valid MongoDB ID"
        });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'customer') {
            filter.customerId = req.user.id;
        } else if (req.user.role === 'staff') {
            filter.assignedStaff = req.user.id;
        }
        const projects = await Project.find(filter).populate('customerId', 'name email').populate('assignedStaff', 'name email');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('customerId');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Recalculate payment status in case budget, discount, or advancePaid changed
        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        // If progress or status is updated, notify customer
        if (req.body.progress !== undefined || req.body.status !== undefined) {
            sendProgressUpdate(finalProject, {
                progress: finalProject.progress,
                todayWork: req.body.updateNotes || 'Project status updated.',
                nextWork: req.body.nextNotes || 'Check dashboard for details.'
            }).catch(err => console.error('WhatsApp Error:', err));
        }

        res.json(finalProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.proposeTimeline = async (req, res) => {
    try {
        const { timeline } = req.body;
        if (!timeline || !Array.isArray(timeline)) {
            return res.status(400).json({ message: "Timeline array is required." });
        }

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (req.user.role === 'staff') {
            const isAssigned = project.assignedStaff.some(s => s.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'You are not assigned to this project.' });
            }
        }

        project.timeline = timeline;
        project.timelineStatus = 'Proposed by Staff';
        const savedProject = await project.save();
        res.json(savedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendTimeline = async (req, res) => {
    try {
        const { timeline } = req.body;
        if (!timeline || !Array.isArray(timeline)) {
            return res.status(400).json({ message: "Timeline array is required." });
        }

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.timeline = timeline;
        project.timelineStatus = 'Sent to Client';
        const savedProject = await project.save();
        res.json(savedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.requestAdditionalWork = async (req, res) => {
    try {
        const { title, description, amount, status } = req.body;
        if (!title) return res.status(400).json({ message: "Title is required for additional work." });

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const isCustomer = req.user.role === 'customer';
        const workItem = {
            title,
            description,
            amount: isCustomer ? 0 : (parseFloat(amount) || 0),
            status: isCustomer ? 'Pending' : (status || 'Approved')
        };

        project.additionalWork.push(workItem);
        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.status(201).json(finalProject);
    } catch (error) {
        res.status(550).json({ message: error.message });
    }
};

exports.updateAdditionalWorkStatus = async (req, res) => {
    try {
        const { status, amount, title, description } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const workItem = project.additionalWork.id(req.params.workId);
        if (!workItem) return res.status(404).json({ message: "Additional work item not found" });

        if (status !== undefined) workItem.status = status;
        if (amount !== undefined) workItem.amount = parseFloat(amount) || 0;
        if (title !== undefined) workItem.title = title;
        if (description !== undefined) workItem.description = description;

        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.json(finalProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteAdditionalWork = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        project.additionalWork.pull({ _id: req.params.workId });
        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.json(finalProject);
    } catch (error) {
        res.status(550).json({ message: error.message });
    }
};

