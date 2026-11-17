const Notification = require('../models/Notification');
const { 
    getNotificationConfig, 
    updateNotificationConfig, 
    dispatchNotification 
} = require('../services/notificationDispatcher');

/**
 * 1. Get notifications for the authenticated user based on role and ID
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role || 'customer';
        const { category, isRead, search, limit = 50, page = 1 } = req.query;

        // Construct query matching role or direct user recipient
        const roleScope = [userRole, 'all'];
        const query = {
            $or: [
                { recipientRole: { $in: roleScope }, recipientUser: null },
                { recipientUser: userId }
            ]
        };

        if (category && category !== 'all') {
            query.category = category;
        }

        if (isRead !== undefined && isRead !== '') {
            query.read = isRead === 'true';
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$and = [
                { $or: [{ title: regex }, { message: regex }] }
            ];
        }

        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({
                $or: [
                    { recipientRole: { $in: roleScope }, recipientUser: null, read: false },
                    { recipientUser: userId, read: false }
                ]
            })
        ]);

        res.status(200).json({
            success: true,
            notifications,
            total,
            unreadCount,
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit) || 1
        });
    } catch (err) {
        console.error('Error fetching user notifications:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve notifications: ' + err.message });
    }
};

/**
 * 2. Mark a single notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndUpdate(
            id,
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({ success: true, notification });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 3. Mark all notifications for the current user/role as read
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role || 'customer';
        const roleScope = [userRole, 'all'];

        const filter = {
            read: false,
            $or: [
                { recipientRole: { $in: roleScope }, recipientUser: null },
                { recipientUser: userId }
            ]
        };

        const result = await Notification.updateMany(filter, {
            read: true,
            readAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 4. Delete single notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Notification.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true, message: 'Notification deleted successfully' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 5. Clear all read notifications
 */
exports.clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const userRole = req.user.role || 'customer';
        const roleScope = [userRole, 'all'];

        const filter = {
            read: true,
            $or: [
                { recipientRole: { $in: roleScope }, recipientUser: null },
                { recipientUser: userId }
            ]
        };

        const result = await Notification.deleteMany(filter);
        res.status(200).json({
            success: true,
            message: 'Read notifications cleared successfully',
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error('Error clearing read notifications:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 6. Get Global Notification Settings (Admin or User)
 */
exports.getSettings = async (req, res) => {
    try {
        const config = await getNotificationConfig();
        res.status(200).json({ success: true, config });
    } catch (err) {
        console.error('Error getting notification settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 7. Update Global Notification Settings (Admin Only)
 */
exports.updateSettings = async (req, res) => {
    try {
        const updated = await updateNotificationConfig(req.body);
        res.status(200).json({
            success: true,
            message: 'Notification settings updated successfully',
            config: updated
        });
    } catch (err) {
        console.error('Error updating notification settings:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 8. Send Test Notification (Admin Only)
 */
exports.sendTestNotification = async (req, res) => {
    try {
        const {
            title = 'Test System Notification',
            message = 'This is a real-time test notification from Krishna ERP control center.',
            category = 'general',
            priority = 'medium',
            recipientRole = 'admin',
            recipientUser = null,
            link = '/admin/notifications',
            tone = 'chime'
        } = req.body;

        const notif = await dispatchNotification({
            title,
            message,
            category,
            priority,
            recipientRole,
            recipientUser,
            senderUser: req.user._id || req.user.id,
            link,
            metadata: {
                test: true,
                tone,
                dispatchedBy: req.user.name || 'Admin'
            }
        });

        if (!notif) {
            return res.status(400).json({
                success: false,
                message: 'Notification was blocked or skipped according to current active rules (check if category or recipient is enabled)'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Test notification dispatched successfully across selected channels and devices',
            notification: notif
        });
    } catch (err) {
        console.error('Error sending test notification:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 9. Notification Delivery Logs & Monitoring (Admin Only)
 */
exports.getNotificationLogs = async (req, res) => {
    try {
        const {
            category,
            recipientRole,
            deliveryStatus,
            startDate,
            endDate,
            search,
            limit = 50,
            page = 1
        } = req.query;

        const filter = {};

        if (category && category !== 'all') filter.category = category;
        if (recipientRole && recipientRole !== 'all') filter.recipientRole = recipientRole;
        if (deliveryStatus && deliveryStatus !== 'all') filter.deliveryStatus = deliveryStatus;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [{ title: regex }, { message: regex }];
        }

        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const [logs, total, deliveredCount, pendingCount, failedCount] = await Promise.all([
            Notification.find(filter)
                .populate('recipientUser', 'name email role')
                .populate('senderUser', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ deliveryStatus: 'delivered' }),
            Notification.countDocuments({ deliveryStatus: 'pending' }),
            Notification.countDocuments({ deliveryStatus: 'failed' })
        ]);

        res.status(200).json({
            success: true,
            logs,
            total,
            stats: {
                total,
                deliveredCount,
                pendingCount,
                failedCount
            },
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit) || 1
        });
    } catch (err) {
        console.error('Error fetching notification logs:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
