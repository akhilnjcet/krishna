const WorkProgress = require('../models/WorkProgress');
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;

// Staff: Create Progress Update
exports.createProgress = async (req, res) => {
    try {
        const { projectId, title, description, progressPercentage, status, materialsUsed, issues, nextPlan, notes } = req.body;

        // Process uploaded photos if any
        const photos = req.files ? req.files.map(file => ({
            url: file.path,
            publicId: file.filename
        })) : [];

        const progress = await WorkProgress.create({
            projectId,
            staffId: req.user.id,
            title,
            description,
            progressPercentage: Number(progressPercentage),
            status,
            photos,
            materialsUsed,
            issues,
            nextPlan,
            notes,
            date: new Date()
        });

        // Sync with Project model
        await Project.findByIdAndUpdate(projectId, {
            progress: Number(progressPercentage),
            status: status.toLowerCase() === 'completed' ? 'completed' : 'in-progress',
            updateNotes: description,
            nextNotes: nextPlan
        });

        res.status(201).json(progress);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

// Admin/Customer: Get progress for specific project
exports.getProjectProgress = async (req, res) => {
    try {
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
