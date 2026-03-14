const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskAssignment } = require('../services/whatsappService');

exports.createTask = async (req, res) => {
    try {
        const task = await Task.create(req.body);
        
        // Notify Staff
        if (task.assignedStaff) {
            const staff = await User.findById(task.assignedStaff);
            if (staff) {
                sendTaskAssignment(staff, task).catch(err => console.error('WhatsApp Error:', err));
            }
        }

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTasks = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'staff') {
            filter.assignedStaff = req.user.id;
        }
        const tasks = await Task.find(filter)
            .populate('assignedStaff', 'name email department')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
