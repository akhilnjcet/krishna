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

        // If progress or status is updated, notify customer
        if (req.body.progress !== undefined || req.body.status !== undefined) {
            sendProgressUpdate(project, {
                progress: project.progress,
                todayWork: req.body.updateNotes || 'Project status updated.',
                nextWork: req.body.nextNotes || 'Check dashboard for details.'
            }).catch(err => console.error('WhatsApp Error:', err));
        }

        res.json(project);
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
