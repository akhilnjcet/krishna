const WorkProgress = require('../models/WorkProgress');
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const socketUtil = require('../utils/socket');

// Staff / Admin: Create Progress Update
exports.createProgress = async (req, res) => {
    try {
        const { projectId, title, description, progressPercentage, status, materialsUsed, issues, nextPlan, notes } = req.body;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ message: 'A valid Target Project ID is required.' });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Subject heading is required.' });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({ message: 'Core intelligence message is required.' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Target project archive not found.' });
        }

        // Enforce assignment: staff can only log progress for assigned projects
        if (req.user.role === 'staff') {
            const isAssigned = project.assignedStaff && project.assignedStaff.some(s => s.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this project.' });
            }
        }

        // Process uploaded photos if any
        const photos = req.files ? req.files.map(file => ({
            url: file.path,
            publicId: file.filename
        })) : [];

        const parsedProgress = Number(progressPercentage);
        const validPercentage = Number.isFinite(parsedProgress)
            ? Math.min(100, Math.max(0, parsedProgress))
            : (project.progress || 0);

        let workProgressStatus = 'In Progress';
        if (status) {
            const sLower = status.toLowerCase();
            if (sLower === 'completed') workProgressStatus = 'Completed';
            else if (sLower === 'not started') workProgressStatus = 'Not Started';
            else workProgressStatus = 'In Progress';
        }

        const progress = await WorkProgress.create({
            projectId,
            staffId: req.user._id || req.user.id,
            title: title.trim(),
            description: description.trim(),
            progressPercentage: validPercentage,
            status: workProgressStatus,
            photos,
            materialsUsed,
            issues,
            nextPlan,
            notes,
            date: new Date()
        });

        // Sync with Project model
        const projectStatus = (status && status.toLowerCase() === 'completed')
            ? 'completed'
            : (project.status === 'completed' ? 'completed' : 'in-progress');

        const updatedProject = await Project.findByIdAndUpdate(projectId, {
            progress: validPercentage,
            status: projectStatus,
            updateNotes: description.trim(),
            nextNotes: nextPlan || ''
        }, { new: true });

        // Broadcast to customer portal
        try {
            if (project.customerId) {
                socketUtil.emitToUser(project.customerId, 'project-updated', {
                    projectId: updatedProject._id,
                    customerId: updatedProject.customerId,
                    progress: updatedProject.progress,
                    status: updatedProject.status,
                    updateNotes: updatedProject.updateNotes
                });
            }
        } catch (socketErr) {
            console.warn('Socket broadcast warning:', socketErr?.message);
        }

        res.status(201).json(progress);
    } catch (error) {
        console.error('Create progress error:', error);
        res.status(500).json({ message: error.message || 'Failed to record progress update.' });
    }
};

// Staff: Get my progress updates
exports.getMyProgress = async (req, res) => {
    try {
        const updates = await WorkProgress.find({ staffId: req.user.id })
            .populate('projectId', 'title location')
            .sort({ date: -1 });
        res.json(updates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Get all progress updates
exports.getAllProgress = async (req, res) => {
    try {
        const updates = await WorkProgress.find()
            .populate('projectId', 'title location')
            .populate('staffId', 'name')
            .sort({ date: -1 });
        res.json(updates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin/Staff/Customer: Get progress for specific project with authorization
exports.getProjectProgress = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // Enforce ownership check
        if (req.user.role === 'customer') {
            if (project.customerId?.toString() !== req.user.id.toString()) {
                return res.status(403).json({ message: 'Access denied: You do not own this project.' });
            }
        } else if (req.user.role === 'staff') {
            const isAssigned = project.assignedStaff.some(s => s.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this project.' });
            }
        }

        const updates = await WorkProgress.find({ projectId: req.params.projectId })
            .populate('staffId', 'name profilePhoto')
            .sort({ date: -1 });
        res.json(updates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Approve/Update progress
exports.updateProgressStatus = async (req, res) => {
    try {
        const progress = await WorkProgress.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true }
        );
        if (!progress) return res.status(404).json({ message: 'Update not found' });
        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Delete progress report
exports.deleteProgress = async (req, res) => {
    try {
        const progress = await WorkProgress.findById(req.params.id);
        if (!progress) return res.status(404).json({ message: 'Update not found' });

        // Delete photos from Cloudinary
        for (const photo of progress.photos) {
            if (photo.publicId) {
                await cloudinary.uploader.destroy(photo.publicId).catch(e => console.error(e));
            }
        }

        await WorkProgress.findByIdAndDelete(req.params.id);
        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
