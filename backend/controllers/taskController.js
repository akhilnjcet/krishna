const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const { sendTaskAssignment } = require('../services/whatsappService');
const socketUtil = require('../utils/socket');

// Helpers for Socket.IO broadcasts
const broadcastTaskAssigned = async (task) => {
    try {
        const io = socketUtil.getIO();
        if (io) {
            const populated = await Task.findById(task._id)
                .populate('assignedStaff', 'name email role')
                .populate('assignedBy', 'name role');

            populated.assignedStaff.forEach(staff => {
                io.to(staff._id.toString()).emit('new-task-assigned', {
                    _id: populated._id,
                    title: populated.title,
                    projectName: populated.projectName || 'General',
                    assignedBy: populated.assignedBy?.name || 'Administrator',
                    dueDate: populated.dueDate,
                    createdAt: populated.createdAt
                });
            });

            io.to('admin').emit('admin-task-update', populated);
        }
    } catch (err) {
        console.error("❌ Socket broadcast failed:", err.message);
    }
};

const broadcastTaskUpdated = async (task) => {
    try {
        const io = socketUtil.getIO();
        if (io) {
            const populated = await Task.findById(task._id)
                .populate('assignedStaff', 'name email role')
                .populate('assignedBy', 'name role');

            io.to('admin').emit('admin-task-update', populated);
            populated.assignedStaff.forEach(staff => {
                io.to(staff._id.toString()).emit('task-updated', populated);
            });
        }
    } catch (err) {
        console.error("❌ Socket broadcast update failed:", err.message);
    }
};

// 1. Create a task (Admin Only)
exports.createTask = async (req, res) => {
    try {
        const { projectId, assignedStaff, ...otherDetails } = req.body;
        
        let projectName = 'General';
        if (projectId) {
            const project = await Project.findById(projectId);
            if (project) {
                projectName = project.title;
            }
        }

        // Clean assignedStaff to ensure it is an array
        const staffArray = Array.isArray(assignedStaff) ? assignedStaff : [assignedStaff];

        const task = new Task({
            ...otherDetails,
            projectId,
            projectName,
            assignedStaff: staffArray,
            assignedBy: req.user.id
        });
        await task.save();

        // Dispatch WhatsApp Alert to each assigned staff
        for (const staffId of staffArray) {
            const staff = await User.findById(staffId);
            if (staff) {
                sendTaskAssignment(staff, task).catch(err => console.error('WhatsApp Error:', err));
            }
        }

        // Broadcast Socket.IO
        await broadcastTaskAssigned(task);

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        console.error("❌ Create Task Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// 2. Fetch tasks (Admin: All / Filtered; Staff: Assigned Only)
exports.getTasks = async (req, res) => {
    try {
        let filter = {};
        
        if (req.user.role === 'staff') {
            filter.assignedStaff = req.user.id;
        } else {
            // Admin filters
            const { projectId, status, priority, staffId } = req.query;
            if (projectId) filter.projectId = projectId;
            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (staffId) filter.assignedStaff = staffId;
        }

        const tasks = await Task.find(filter)
            .populate('assignedStaff', 'name email department role')
            .populate('assignedBy', 'name role')
            .sort({ createdAt: -1 });

        // Normalize legacy database records
        const normalizedTasks = tasks.map(t => {
            const taskObj = t.toObject();
            if (taskObj.assignedStaff && !Array.isArray(taskObj.assignedStaff)) {
                taskObj.assignedStaff = [taskObj.assignedStaff];
            }
            return taskObj;
        });

        res.json(normalizedTasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Update Status (Staff & Admin)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = status;
        if (status === 'Completed') {
            task.progressPercentage = 100;
        }
        await task.save();

        await broadcastTaskUpdated(task);
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Staff Task progress updates (percentage, note, photos)
exports.updateTaskProgress = async (req, res) => {
    try {
        const { progressPercentage, note, workPhotos } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (progressPercentage !== undefined) {
            task.progressPercentage = Number(progressPercentage);
            if (Number(progressPercentage) === 100) {
                task.status = 'Completed';
            } else if (task.status === 'Pending') {
                task.status = 'In Progress';
            }
        }

        if (note) {
            task.workNotes.push({
                note,
                staffId: req.user.id,
                staffName: req.user.name,
                createdAt: new Date()
            });
        }

        if (workPhotos && Array.isArray(workPhotos)) {
            task.workPhotos = [...task.workPhotos, ...workPhotos];
        }

        await task.save();
        await broadcastTaskUpdated(task);

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Staff Delay report (Delay reason, remarks)
exports.reportTaskDelay = async (req, res) => {
    try {
        const { delayReason, delayRemarks } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = 'Delayed';
        task.delayReason = delayReason;
        task.delayRemarks = delayRemarks;

        if (delayRemarks) {
            task.workNotes.push({
                note: `[Delay Reported] Reason: ${delayReason}. Notes: ${delayRemarks}`,
                staffId: req.user.id,
                staffName: req.user.name,
                createdAt: new Date()
            });
        }

        await task.save();
        await broadcastTaskUpdated(task);

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Admin edit / reassign task
exports.adminUpdateTask = async (req, res) => {
    try {
        const { projectId, assignedStaff, ...otherDetails } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Detect reassignment to send WhatsApp alerts to new staff members
        const oldStaffIds = task.assignedStaff.map(id => id.toString());
        const newStaffIds = Array.isArray(assignedStaff) 
            ? assignedStaff.map(id => id.toString()) 
            : [assignedStaff.toString()];

        let projectName = task.projectName;
        if (projectId && projectId !== task.projectId?.toString()) {
            const project = await Project.findById(projectId);
            if (project) {
                projectName = project.title;
            }
        }

        // Apply edits
        Object.assign(task, otherDetails);
        if (projectId) task.projectId = projectId;
        task.projectName = projectName;
        task.assignedStaff = newStaffIds;

        await task.save();

        // Dispatch WhatsApp alerts to newly assigned staff members
        const addedStaffIds = newStaffIds.filter(id => !oldStaffIds.includes(id));
        for (const staffId of addedStaffIds) {
            const staff = await User.findById(staffId);
            if (staff) {
                sendTaskAssignment(staff, task).catch(err => console.error('WhatsApp Error:', err));
            }
        }

        await broadcastTaskUpdated(task);

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Get Task Metrics (Admin Dashboard stats)
exports.getTaskStats = async (req, res) => {
    try {
        const total = await Task.countDocuments({});
        const pending = await Task.countDocuments({ status: 'Pending' });
        const inProgress = await Task.countDocuments({ status: 'In Progress' });
        const delayed = await Task.countDocuments({ status: 'Delayed' });
        const completed = await Task.countDocuments({ status: 'Completed' });
        const cancelled = await Task.countDocuments({ status: 'Cancelled' });

        // Overdue: Due Date is before now and status is not Completed or Cancelled
        const overdue = await Task.countDocuments({
            dueDate: { $lt: new Date() },
            status: { $nin: ['Completed', 'Cancelled'] }
        });

        res.json({
            total,
            pending,
            inProgress,
            delayed,
            completed,
            cancelled,
            overdue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 8. Delete task (Admin Only)
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Emit delete updates
        const io = socketUtil.getIO();
        if (io) {
            io.to('admin').emit('admin-task-deleted', req.params.id);
            task.assignedStaff.forEach(staffId => {
                io.to(staffId.toString()).emit('task-deleted', req.params.id);
            });
        }

        res.json({ success: true, message: 'Task removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
