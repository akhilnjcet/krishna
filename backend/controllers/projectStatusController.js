const Project = require('../models/Project');
const User = require('../models/User');
const ProjectStatusHistory = require('../models/ProjectStatusHistory');
const AdminNotification = require('../models/AdminNotification');
const socketUtil = require('../utils/socket');

// 1. Staff can update the status of any assigned project
exports.updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, remarks, expectedResumeDate } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required." });
        }

        const validStatuses = ['In Progress', 'Delayed', 'Stopped', 'Completed', 'Restarted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        // Role-based permission: Staff can update only assigned projects
        if (req.user.role === 'staff') {
            const isAssigned = project.assignedStaff.some(
                staffId => staffId.toString() === req.user.id
            );
            if (!isAssigned) {
                return res.status(403).json({ message: "Access Denied: You are not assigned to this project." });
            }
        }

        const reporterName = req.user.name;
        let previousReason = '';
        let historyEntry = null;
        let notification = null;

        // If selecting Delayed or Stopped, staff must provide Reason and Remarks
        if (status === 'Delayed' || status === 'Stopped') {
            if (!reason || !remarks) {
                return res.status(400).json({ 
                    message: "Reason and Remarks are required when marking project as Delayed or Stopped." 
                });
            }

            // Create ProjectStatusHistory entry
            historyEntry = new ProjectStatusHistory({
                projectId: project._id,
                projectName: project.title,
                status,
                reason,
                remarks,
                expectedResumeDate,
                reportedBy: req.user.id,
                reportedAt: new Date(),
                resolvedStatus: 'Pending'
            });
            await historyEntry.save();

            // Create an instant notification for Admin
            notification = new AdminNotification({
                projectId: project._id,
                projectName: project.title,
                type: status,
                title: status === 'Delayed' ? '🔴 Project Delayed' : '🔴 Project Stopped',
                message: `Project status updated to ${status} by ${reporterName}.`,
                updatedBy: req.user.id,
                reason,
                remarks
            });
            await notification.save();

            // Broadcast real-time notification via Socket.io
            socketUtil.emitToAdmin('admin-notification', {
                _id: notification._id,
                projectId: project._id,
                projectName: project.title,
                type: status,
                title: notification.title,
                message: notification.message,
                updatedBy: { _id: req.user.id, name: reporterName },
                reason,
                remarks,
                isRead: false,
                createdAt: notification.createdAt
            });

        } else if (status === 'In Progress' || status === 'Restarted') {
            // Find latest unresolved Delayed/Stopped history for this project
            const pendingIncident = await ProjectStatusHistory.findOne({
                projectId: project._id,
                status: { $in: ['Delayed', 'Stopped'] },
                resolvedStatus: 'Pending'
            }).sort({ createdAt: -1 });

            if (pendingIncident) {
                previousReason = pendingIncident.reason;
                pendingIncident.resolvedStatus = 'Resolved';
                pendingIncident.restartDate = new Date();
                await pendingIncident.save();
            }

            // Save Restarted/In Progress history
            historyEntry = new ProjectStatusHistory({
                projectId: project._id,
                projectName: project.title,
                status: 'In Progress', // Save as In Progress in timeline
                reportedBy: req.user.id,
                reportedAt: new Date(),
                resolvedStatus: 'N/A'
            });
            await historyEntry.save();

            // Create Restart notification
            notification = new AdminNotification({
                projectId: project._id,
                projectName: project.title,
                type: 'Restarted',
                title: '🟢 Work Restarted',
                message: `Work restarted on project by ${reporterName}.`,
                updatedBy: req.user.id,
                reason: previousReason || 'N/A', // Previous Reason
                remarks: `Status updated back to In Progress.`
            });
            await notification.save();

            // Broadcast real-time notification via Socket.io
            socketUtil.emitToAdmin('admin-notification', {
                _id: notification._id,
                projectId: project._id,
                projectName: project.title,
                type: 'Restarted',
                title: notification.title,
                message: notification.message,
                updatedBy: { _id: req.user.id, name: reporterName },
                reason: previousReason || 'N/A',
                remarks: notification.remarks,
                isRead: false,
                createdAt: notification.createdAt
            });

        } else if (status === 'Completed') {
            // Log Completed in timeline
            historyEntry = new ProjectStatusHistory({
                projectId: project._id,
                projectName: project.title,
                status: 'Completed',
                reportedBy: req.user.id,
                reportedAt: new Date(),
                resolvedStatus: 'N/A'
            });
            await historyEntry.save();

            // Create Completed notification
            notification = new AdminNotification({
                projectId: project._id,
                projectName: project.title,
                type: 'Completed',
                title: '🔵 Project Completed',
                message: `Project completed by ${reporterName}.`,
                updatedBy: req.user.id,
                remarks: `Project successfully finished.`
            });
            await notification.save();

            // Broadcast real-time notification via Socket.io
            socketUtil.emitToAdmin('admin-notification', {
                _id: notification._id,
                projectId: project._id,
                projectName: project.title,
                type: 'Completed',
                title: notification.title,
                message: notification.message,
                updatedBy: { _id: req.user.id, name: reporterName },
                remarks: notification.remarks,
                isRead: false,
                createdAt: notification.createdAt
            });
        }

        // Update Project main status and save
        project.status = status === 'Restarted' ? 'In Progress' : status;
        await project.save();

        res.status(200).json({ 
            success: true, 
            message: `Project status successfully updated to ${project.status}`,
            project,
            historyEntry,
            notification
        });

    } catch (error) {
        console.error("❌ Error updating project status:", error);
        res.status(500).json({ message: error.message });
    }
};

// 2. Fetch admin notifications history (Admin Only)
exports.getAdminNotifications = async (req, res) => {
    try {
        const { projectId, updatedBy, type, startDate, endDate, isRead } = req.query;
        const filter = {};

        if (projectId) filter.projectId = projectId;
        if (updatedBy) filter.updatedBy = updatedBy;
        if (type) filter.type = type;
        
        if (isRead !== undefined) {
            filter.isRead = isRead === 'true';
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const notifications = await AdminNotification.find(filter)
            .populate('updatedBy', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Mark notification as Read/Unread (Admin Only)
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { isRead } = req.body;

        const notification = await AdminNotification.findByIdAndUpdate(
            id,
            { isRead: isRead !== undefined ? isRead : true },
            { new: true }
        ).populate('updatedBy', 'name email');

        if (!notification) {
            return res.status(404).json({ message: "Notification not found." });
        }

        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Mark all notifications as read (Admin Only)
exports.markAllAsRead = async (req, res) => {
    try {
        await AdminNotification.updateMany({ isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: "All notifications marked as read." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Get complete project activity timeline (Admin, Staff, Customer)
exports.getProjectTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        const timeline = await ProjectStatusHistory.find({ projectId: id })
            .populate('reportedBy', 'name email role')
            .sort({ reportedAt: 1 }); // Sorted chronologically

        res.status(200).json(timeline);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Get Admin Dashboard project counters & notification badge
exports.getDashboardStats = async (req, res) => {
    try {
        // Active: 'in-progress' or 'In Progress' or 'Restarted'
        // Delayed: 'Delayed'
        // Stopped: 'Stopped'
        // Completed: 'completed' or 'Completed'
        const projects = await Project.find({});
        
        let activeCount = 0;
        let delayedCount = 0;
        let stoppedCount = 0;
        let completedCount = 0;

        projects.forEach(p => {
            const statusLower = (p.status || '').toLowerCase();
            if (statusLower === 'in-progress' || statusLower === 'in progress' || statusLower === 'restarted') {
                activeCount++;
            } else if (statusLower === 'delayed') {
                delayedCount++;
            } else if (statusLower === 'stopped') {
                stoppedCount++;
            } else if (statusLower === 'completed') {
                completedCount++;
            }
        });

        // Unread Notification Count
        const unreadCount = await AdminNotification.countDocuments({ isRead: false });

        // Recent Notifications
        const recentNotifications = await AdminNotification.find({})
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            activeCount,
            delayedCount,
            stoppedCount,
            completedCount,
            unreadCount,
            recentNotifications
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
