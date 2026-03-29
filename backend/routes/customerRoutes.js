const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const WorkProgress = require('../models/WorkProgress');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get all projects for the logged in customer
// @route   GET /api/customer/projects
// @access  Private/Customer
router.get('/projects', protect, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: 'Access denied. Customer only portal.' });
        }

        const projects = await Project.find({ customerId: req.user._id })
            .populate('assignedStaff', 'name email designation')
            .sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get detailed progress for a specific project
// @route   GET /api/customer/projects/:projectId/updates
// @access  Private/Customer
router.get('/projects/:projectId/updates', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if project belongs to this customer
        if (project.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this project' });
        }

        const updates = await WorkProgress.find({ projectId: req.params.projectId })
            .populate('staffId', 'name designation profilePhoto')
            .sort({ date: -1 });

        res.json({
            project,
            updates
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
