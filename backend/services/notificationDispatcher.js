const Notification = require('../models/Notification');
const SystemSetting = require('../models/SystemSetting');
const PushSubscription = require('../models/PushSubscription');
const socketUtil = require('../utils/socket');
const webPushUtil = require('../utils/webPush');

const DEFAULT_CONFIG = {
    channels: {
        in_app: true,
        web_push: true,
        apk_push: true,
        desktop: true,
        sound: true,
        email: true
    },
    categories: {
        customer: true,
        staff: true,
        attendance: true,
        face_verification: true,
        leave: true,
        advance: true,
        salary: true,
        project: true,
        quote: true,
        invoice: true,
        payment: true,
        chat: true,
        system: true,
        security: true,
        general: true
    },
    recipients: {
        admin: true,
        staff: true,
        customer: true
    },
    sounds: {
        enabled: true,
        defaultTone: 'chime',
        volume: 80,
        categoryTones: {
            payment: 'success',
            attendance: 'ding',
            face_verification: 'ding',
            security: 'alert',
            leave: 'modern',
            advance: 'modern',
            salary: 'success',
            project: 'bell',
            quote: 'bell',
            invoice: 'chime',
            staff: 'modern',
            customer: 'chime',
            chat: 'modern',
            system: 'alert',
            general: 'chime'
        }
    }
};

let cachedConfig = null;
let lastCacheFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Fetch active notification configuration from DB with fallback to defaults
 */
const getNotificationConfig = async () => {
    const now = Date.now();
    if (cachedConfig && (now - lastCacheFetch < CACHE_TTL)) {
        return cachedConfig;
    }

    try {
        const setting = await SystemSetting.findOne({ key: 'notification_config' });
        if (setting && setting.value) {
            const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
            cachedConfig = {
                channels: { ...DEFAULT_CONFIG.channels, ...parsed.channels },
                categories: { ...DEFAULT_CONFIG.categories, ...parsed.categories },
                recipients: { ...DEFAULT_CONFIG.recipients, ...parsed.recipients },
                sounds: {
                    ...DEFAULT_CONFIG.sounds,
                    ...parsed.sounds,
                    categoryTones: { ...DEFAULT_CONFIG.sounds.categoryTones, ...(parsed.sounds?.categoryTones || {}) }
                }
            };
        } else {
            cachedConfig = { ...DEFAULT_CONFIG };
        }
    } catch (err) {
        console.error('Failed to load notification_config from DB:', err.message);
        cachedConfig = { ...DEFAULT_CONFIG };
    }

    lastCacheFetch = now;
    return cachedConfig;
};

/**
 * Update active notification configuration
 */
const updateNotificationConfig = async (newConfig) => {
    try {
        const current = await getNotificationConfig();
        const merged = {
            channels: { ...current.channels, ...newConfig.channels },
            categories: { ...current.categories, ...newConfig.categories },
            recipients: { ...current.recipients, ...newConfig.recipients },
            sounds: {
                ...current.sounds,
                ...newConfig.sounds,
                categoryTones: { ...current.sounds.categoryTones, ...(newConfig.sounds?.categoryTones || {}) }
            }
        };

        await SystemSetting.findOneAndUpdate(
            { key: 'notification_config' },
            {
                key: 'notification_config',
                value: merged,
                category: 'notifications',
                description: 'Global real-time notification channels, categories, sound tones, and recipient preferences',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        cachedConfig = merged;
        lastCacheFetch = Date.now();

        // Broadcast settings update to admin clients
        socketUtil.emitToAdmin('notification-settings-updated', merged);

        return merged;
    } catch (err) {
        console.error('Failed to save notification_config:', err);
        throw err;
    }
};

/**
 * Central Dispatcher for ALL System Notifications
 */
const dispatchNotification = async ({
    title,
    message,
    category = 'general',
    priority = 'medium',
    recipientRole = 'admin',
    recipientUser = null,
    senderUser = null,
    link = '',
    metadata = {}
}) => {
    try {
        const config = await getNotificationConfig();

        // Check if category is enabled
        if (config.categories && config.categories[category] === false) {
            console.log(`🔕 Notification for category '${category}' is disabled by admin rules. Skipping.`);
            return null;
        }

        // Check if recipient role is enabled
        if (recipientRole !== 'all') {
            if (config.recipients && config.recipients[recipientRole] === false) {
                console.log(`🔕 Notification for recipient role '${recipientRole}' is disabled by admin rules. Skipping.`);
                return null;
            }
        }

        // Determine sound tone
        const tone = config.sounds?.categoryTones?.[category] || config.sounds?.defaultTone || 'chime';
        const soundEnabled = config.channels?.sound !== false && config.sounds?.enabled !== false;

        // Build channel tracking list
        const activeChannels = [];
        if (config.channels?.in_app !== false) activeChannels.push({ name: 'in_app', status: 'delivered' });
        if (soundEnabled) activeChannels.push({ name: 'sound', status: 'delivered' });
        if (config.channels?.desktop !== false) activeChannels.push({ name: 'desktop', status: 'delivered' });
        if (config.channels?.web_push !== false) activeChannels.push({ name: 'web_push', status: 'pending' });
        if (config.channels?.apk_push !== false) activeChannels.push({ name: 'apk_push', status: 'pending' });

        // Save Notification to Database for permanent history and unread tracking
        const notification = new Notification({
            title,
            message,
            category,
            priority,
            recipientRole,
            recipientUser,
            senderUser,
            link,
            metadata: {
                ...metadata,
                tone,
                soundEnabled,
                volume: config.sounds?.volume || 80
            },
            channels: activeChannels,
            deliveryStatus: 'delivered',
            read: false
        });

        await notification.save();

        const payload = {
            _id: notification._id,
            id: notification._id,
            title: notification.title,
            message: notification.message,
            category: notification.category,
            priority: notification.priority,
            recipientRole: notification.recipientRole,
            recipientUser: notification.recipientUser,
            link: notification.link,
            tone,
            soundEnabled,
            volume: config.sounds?.volume || 80,
            metadata: notification.metadata,
            read: false,
            createdAt: notification.createdAt
        };

        // Real-Time Socket.IO Dispatch
        const io = socketUtil.getIO();
        if (io) {
            if (recipientRole === 'all') {
                io.to('admin').emit('notification', payload);
                io.to('staff').emit('notification', payload);
                io.to('customer').emit('notification', payload);
                io.emit('notification-broadcast', payload);
            } else if (recipientRole === 'admin') {
                socketUtil.emitToAdmin('notification', payload);
                // Backward-compatibility: also emit legacy admin-notification event for project alerts
                socketUtil.emitToAdmin('admin-notification', payload);
            } else if (recipientRole === 'staff') {
                io.to('staff').emit('notification', payload);
                if (recipientUser) {
                    socketUtil.emitToUser(recipientUser, 'notification', payload);
                }
            } else if (recipientRole === 'customer') {
                io.to('customer').emit('notification', payload);
                if (recipientUser) {
                    socketUtil.emitToUser(recipientUser, 'notification', payload);
                }
            }

            if (recipientUser && recipientRole !== 'all') {
                socketUtil.emitToUser(recipientUser, 'notification', payload);
            }
        }

        // Asynchronous Web Push Dispatch (runs in background without blocking caller)
        if (config.channels?.web_push !== false) {
            dispatchWebPush(notification, payload).catch(err => {
                console.warn('Web push background dispatch error:', err.message);
            });
        }

        return notification;
    } catch (err) {
        console.error('❌ Failed to dispatch notification:', err);
        return null;
    }
};

/**
 * Helper to dispatch Web Push to relevant registered subscriptions
 */
const dispatchWebPush = async (notification, payload) => {
    try {
        let subQuery = {};
        if (notification.recipientRole === 'admin') {
            // Find subscriptions of admin users
            const User = require('../models/User');
            const adminUsers = await User.find({ role: 'admin' }).select('_id');
            const adminIds = adminUsers.map(u => u._id);
            subQuery = { userId: { $in: adminIds } };
        } else if (notification.recipientUser) {
            subQuery = { userId: notification.recipientUser };
        }

        const subscriptions = await PushSubscription.find(subQuery);
        if (!subscriptions || subscriptions.length === 0) return;

        const pushData = {
            title: payload.title,
            body: payload.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
                id: payload._id,
                link: payload.link || '/admin/notifications',
                category: payload.category
            }
        };

        for (const sub of subscriptions) {
            if (sub.subscription) {
                const res = await webPushUtil.sendPushNotification(sub.subscription, pushData);
                if (res && res.expired) {
                    await PushSubscription.deleteOne({ _id: sub._id });
                }
            }
        }
    } catch (err) {
        console.warn('dispatchWebPush failed:', err.message);
    }
};

module.exports = {
    DEFAULT_CONFIG,
    getNotificationConfig,
    updateNotificationConfig,
    dispatchNotification
};
