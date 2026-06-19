const Project = require('../models/Project');
const User = require('../models/User');
const ProjectStatusHistory = require('../models/ProjectStatusHistory');
const AdminNotification = require('../models/AdminNotification');
const PushSubscription = require('../models/PushSubscription');
const socketUtil = require('../utils/socket');
const webPushUtil = require('../utils/webPush');

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

        // Helper to broadcast socket and send web pushes
        const dispatchAlert = async (notif) => {
            socketUtil.emitToAdmin('admin-notification', {
                _id: notif._id,
                projectId: notif.projectId,
                projectName: notif.projectName,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                updatedBy: { _id: req.user.id, name: reporterName },
                reason: notif.reason,
                remarks: notif.remarks,
                priority: notif.priority,
                status: notif.status,
                isRead: notif.isRead,
                createdAt: notif.createdAt
            });

            try {
                const admins = await User.find({ role: { $in: ['admin', 'master-admin'] } });
                const adminIds = admins.map(a => a._id);
                const subscriptions = await PushSubscription.find({ userId: { $in: adminIds } });

                const pushPayload = {
                    title: notif.title,
                    body: notif.message,
                    icon: '/icons/icon-192x192.png',
                    data: {
                        url: `/#/admin/notifications`,
                        notificationId: notif._id,
                        priority: notif.priority
                    }
                };

                for (const sub of subscriptions) {
                    const result = await webPushUtil.sendPushNotification(sub.subscription, pushPayload);
                    if (result.expired) {
                        await PushSubscription.deleteOne({ _id: sub._id });
                    }
                }
            } catch (err) {
                console.error("❌ Web Push error in updateProjectStatus:", err.message);
            }
        };

        // If selecting Delayed or Stopped, staff must provide Reason and Remarks
        if (status === 'Delayed' || status === 'Stopped') {
            if (!reason || !remarks) {
                return res.status(400).json({ 
                    message: "Reason and Remarks are required when marking project as Delayed or Stopped." 
                });
            }

            let calculatedPriority = 'Low';
            const r = (reason || '').toLowerCase();
            if (
                r.includes('safety incident') ||
                r.includes('fire') ||
                r.includes('electrical failure') ||
                r.includes('power failure') ||
                r.includes('machine breakdown') ||
                r.includes('emergency')
            ) {
                calculatedPriority = 'Critical';
            } else if (
                r.includes('material shortage') ||
                r.includes('material delay') ||
                r.includes('labour shortage')
            ) {
                calculatedPriority = 'Medium';
            } else {
                calculatedPriority = 'High';
            }

            let titlePrefix = '⚠️';
            if (calculatedPriority === 'Critical') {
                titlePrefix = '🚨 CRITICAL';
            } else if (calculatedPriority === 'High') {
                titlePrefix = '⚠️ HIGH';
            } else if (calculatedPriority === 'Medium') {
                titlePrefix = '⚠️ MEDIUM';
            }
            const displayTitle = `${titlePrefix} ALERT: Project ${status} (${reason})`;

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
                title: displayTitle,
                message: `Project status updated to ${status} by ${reporterName}.`,
                updatedBy: req.user.id,
                reason,
                remarks,
                priority: calculatedPriority,
                status: 'Active'
            });
            await notification.save();

            await dispatchAlert(notification);

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
                remarks: `Status updated back to In Progress.`,
                priority: 'Low',
                status: 'Active'
            });
            await notification.save();

            await dispatchAlert(notification);

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
                remarks: `Project successfully finished.`,
                priority: 'Low',
                status: 'Active'
            });
            await notification.save();

            await dispatchAlert(notification);
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
            .populate('acknowledgedBy', 'name email role')
            .populate('resolvedBy', 'name email role')
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

        // Calculate specific alert counters
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const activeAlertsCount = await AdminNotification.countDocuments({ status: 'Active', priority: { $in: ['Critical', 'High', 'Medium'] } });
        const acknowledgedAlertsCount = await AdminNotification.countDocuments({ status: 'Acknowledged' });
        const resolvedAlertsCount = await AdminNotification.countDocuments({ status: 'Resolved' });
        const criticalAlertsCount = await AdminNotification.countDocuments({ status: 'Active', priority: 'Critical' });
        const todaysIncidentsCount = await AdminNotification.countDocuments({
            priority: { $in: ['Critical', 'High', 'Medium'] },
            createdAt: { $gte: startOfToday }
        });

        // Recent Notifications
        const recentNotifications = await AdminNotification.find({})
            .populate('updatedBy', 'name email')
            .populate('acknowledgedBy', 'name email')
            .populate('resolvedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            activeCount,
            delayedCount,
            stoppedCount,
            completedCount,
            unreadCount,
            activeAlertsCount,
            acknowledgedAlertsCount,
            resolvedAlertsCount,
            criticalAlertsCount,
            todaysIncidentsCount,
            recentNotifications
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Subscribe to web push notifications (Admin Only)
exports.subscribeToPush = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ message: "Subscription object is required and must have endpoint and keys." });
        }

        // Check if subscription already exists for this endpoint
        let existingSub = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });
        if (existingSub) {
            existingSub.userId = req.user.id;
            await existingSub.save();
            return res.status(200).json({ success: true, message: "Subscription updated successfully.", data: existingSub });
        }

        const newSub = new PushSubscription({
            userId: req.user.id,
            subscription
        });
        await newSub.save();

        res.status(201).json({ success: true, message: "Subscription saved successfully.", data: newSub });
    } catch (error) {
        console.error("❌ Error subscribing to push:", error);
        res.status(500).json({ message: error.message });
    }
};

// 8. Get VAPID public key (Public/Admin)
exports.getVapidPublicKey = async (req, res) => {
    try {
        const publicKey = await webPushUtil.initializeWebPush();
        if (!publicKey) {
            return res.status(500).json({ message: "VAPID keys could not be initialized." });
        }
        res.status(200).json({ publicKey });
    } catch (error) {
        console.error("❌ Error getting VAPID public key:", error);
        res.status(500).json({ message: error.message });
    }
};

// 9. Acknowledge warning/emergency alert (Admin Only)
exports.acknowledgeNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const notification = await AdminNotification.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found." });
        }

        notification.status = 'Acknowledged';
        notification.acknowledgedBy = req.user.id;
        notification.acknowledgedAt = new Date();
        if (remarks) {
            notification.remarks = (notification.remarks ? notification.remarks + '\n' : '') + `[Ack Note]: ${remarks}`;
        }
        await notification.save();

        const populated = await AdminNotification.findById(id)
            .populate('updatedBy', 'name email role')
            .populate('acknowledgedBy', 'name email role')
            .populate('resolvedBy', 'name email role');

        socketUtil.emitToAdmin('admin-notification-update', populated);

        res.status(200).json({ success: true, notification: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 10. Resolve warning/emergency alert (Admin Only)
exports.resolveNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionNotes } = req.body;

        if (!resolutionNotes) {
            return res.status(400).json({ message: "Resolution notes are required to resolve the alert." });
        }

        const notification = await AdminNotification.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found." });
        }

        notification.status = 'Resolved';
        notification.resolvedBy = req.user.id;
        notification.resolvedAt = new Date();
        notification.resolutionNotes = resolutionNotes;
        await notification.save();

        // Also resolve in ProjectStatusHistory if pending
        const projectHistory = await ProjectStatusHistory.findOne({
            projectId: notification.projectId,
            status: notification.type,
            resolvedStatus: 'Pending'
        }).sort({ createdAt: -1 });

        if (projectHistory) {
            projectHistory.resolvedStatus = 'Resolved';
            projectHistory.restartDate = new Date();
            await projectHistory.save();
        }

        const populated = await AdminNotification.findById(id)
            .populate('updatedBy', 'name email role')
            .populate('acknowledgedBy', 'name email role')
            .populate('resolvedBy', 'name email role');

        socketUtil.emitToAdmin('admin-notification-update', populated);

        res.status(200).json({ success: true, notification: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
