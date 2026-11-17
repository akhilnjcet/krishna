const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const { sendTaskAssignment } = require('../services/whatsappService');
const socketUtil = require('../utils/socket');
const path = require('path');
const fs = require('fs');

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

            try {
                const { dispatchNotification } = require('../services/notificationDispatcher');
                for (const staff of populated.assignedStaff) {
                    dispatchNotification({
                        title: 'New Task Assigned',
                        message: `You were assigned: "${populated.title}" (${populated.projectName || 'General'}).`,
                        category: 'staff',
                        priority: 'high',
                        recipientRole: 'staff',
                        recipientUser: staff._id,
                        link: '/staff/tasks',
                        metadata: { taskId: populated._id }
                    }).catch(() => {});
                }
            } catch (e) {}

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

// Helper to verify task update permissions
const canModifyTask = (task, user) => {
    if (user.role === 'admin') return true;
    if (user.role === 'staff') {
        const staffList = Array.isArray(task.assignedStaff) ? task.assignedStaff : [task.assignedStaff];
        return staffList.some(s => s && s.toString() === user.id.toString());
    }
    return false;
};

// 3. Update Status (Staff & Admin)
exports.updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (!canModifyTask(task, req.user)) {
            return res.status(403).json({ message: 'Access denied: You are not assigned to this task.' });
        }

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

        if (!canModifyTask(task, req.user)) {
            return res.status(403).json({ message: 'Access denied: You are not assigned to this task.' });
        }

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

        if (!canModifyTask(task, req.user)) {
            return res.status(403).json({ message: 'Access denied: You are not assigned to this task.' });
        }

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

/**
 * 9. Retrieve / Stream Task Attachment with Authentication & Security
 * GET /api/tasks/:id/attachments/:index
 */
exports.getTaskAttachment = async (req, res) => {
    try {
        const { id, index } = req.params;
        const isWorkPhoto = req.query.type === 'workPhoto';

        const task = await Task.findById(id)
            .populate('assignedStaff', '_id name email role')
            .populate('assignedBy', '_id name role');

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task record not found.' });
        }

        // Authorization check: User must be admin or assigned staff or the assigner
        const userId = (req.user._id || req.user.id).toString();
        const isAdmin = req.user.role === 'admin';
        const isAssigned = Array.isArray(task.assignedStaff)
            ? task.assignedStaff.some(s => s && (s._id ? s._id.toString() : s.toString()) === userId)
            : false;
        const isAssigner = task.assignedBy && (task.assignedBy._id ? task.assignedBy._id.toString() : task.assignedBy.toString()) === userId;

        if (!isAdmin && !isAssigned && !isAssigner) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access forbidden: You do not have permission to view attachments for this task.' 
            });
        }

        const list = isWorkPhoto ? (task.workPhotos || []) : (task.attachments || []);
        const idx = parseInt(index, 10);

        if (isNaN(idx) || idx < 0 || idx >= list.length) {
            return res.status(404).json({ 
                success: false, 
                message: `${isWorkPhoto ? 'Work photo' : 'Attachment'} index #${index} was not found on this task.` 
            });
        }

        const rawItem = list[idx];
        if (!rawItem) {
            return res.status(404).json({ success: false, message: 'Attachment entry is null or empty.' });
        }

        // Handle string or legacy object wrapper
        let itemUrl = typeof rawItem === 'object' && rawItem !== null
            ? (rawItem.url || rawItem.fileUrl || rawItem.path || '')
            : String(rawItem).trim();

        if (!itemUrl) {
            return res.status(404).json({ success: false, message: 'Attachment URL is empty.' });
        }

        let mimeType = 'application/octet-stream';
        let fileName = `${isWorkPhoto ? 'work_photo' : 'attachment'}_${idx + 1}`;
        let fileType = 'other';
        let isDataUri = false;
        let base64Buffer = null;

        // Case A: Data URI
        if (itemUrl.startsWith('data:')) {
            isDataUri = true;
            const match = itemUrl.match(/^data:([a-zA-Z0-9\/+-.]+);base64,(.+)$/s);
            if (match) {
                mimeType = match[1];
                base64Buffer = Buffer.from(match[2], 'base64');
            }
        } else if (itemUrl.includes('/uploads/') || itemUrl.startsWith('uploads/')) {
            // Case B: Local storage path
            const cleanRel = itemUrl.substring(itemUrl.indexOf('uploads/')).replace(/^uploads[\/\\]/, '');
            const safeBase = path.basename(cleanRel);
            fileName = safeBase;

            const isVercel = process.env.VERCEL === '1';
            const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
            const fullPath = path.join(uploadDir, safeBase);

            const ext = path.extname(safeBase).toLowerCase();
            const mimeMap = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.txt': 'text/plain'
            };
            if (mimeMap[ext]) mimeType = mimeMap[ext];

            if (req.query.download === '1' || req.query.download === 'true' || req.query.raw === '1') {
                if (!fs.existsSync(fullPath)) {
                    return res.status(404).json({ success: false, message: 'Server storage file no longer exists.' });
                }
                const disposition = (req.query.download === '1' || req.query.download === 'true') ? 'attachment' : 'inline';
                res.setHeader('Content-Disposition', `${disposition}; filename="${safeBase}"`);
                res.setHeader('Content-Type', mimeType);
                return fs.createReadStream(fullPath).pipe(res);
            }
        } else {
            // Case C: Remote URL (Cloudinary / HTTPS)
            const cleanUrl = itemUrl.split('?')[0];
            const extMatch = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
            if (extMatch) {
                const ext = `.${extMatch[1].toLowerCase()}`;
                const mimeMap = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.pdf': 'application/pdf'
                };
                if (mimeMap[ext]) mimeType = mimeMap[ext];
                fileName = path.basename(cleanUrl) || fileName;
            }
        }

        // Categorize fileType
        if (mimeType.startsWith('image/')) {
            fileType = 'image';
        } else if (mimeType === 'application/pdf') {
            fileType = 'pdf';
        } else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('sheet') || mimeType.includes('text/')) {
            fileType = 'document';
        }

        // If client requested raw stream or download of data URI
        if (isDataUri && base64Buffer && (req.query.download === '1' || req.query.download === 'true' || req.query.raw === '1')) {
            const ext = mimeType === 'application/pdf' ? 'pdf' : (mimeType.split('/')[1] || 'bin');
            const safeDownloadName = `${fileName}.${ext}`;
            const disposition = (req.query.download === '1' || req.query.download === 'true') ? 'attachment' : 'inline';
            res.setHeader('Content-Disposition', `${disposition}; filename="${safeDownloadName}"`);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', base64Buffer.length);
            return res.end(base64Buffer);
        }

        return res.json({
            success: true,
            taskId: task._id,
            taskTitle: task.title,
            attachmentIndex: idx,
            url: itemUrl,
            fileName,
            fileType,
            mimeType,
            isDataUri
        });
    } catch (error) {
        console.error('❌ Error retrieving task attachment:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving task attachment', error: error.message });
    }
};
