import { LocalNotifications } from '@capacitor/local-notifications';
import api from './api';
import { playNotificationSound, unlockAudio } from '../utils/soundService';

/**
 * Helper to convert URL-safe base64 string to Uint8Array for VAPID subscribe
 */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const notificationService = {
    // ── 1. OS & Browser Permissions ──────────────────────────────────────────

    /**
     * Request permissions across Capacitor Android Native + Desktop Web Browser
     */
    requestPermissions: async () => {
        let granted = false;

        // 1. Capacitor Native (Android / iOS)
        try {
            const status = await LocalNotifications.requestPermissions();
            if (status.display === 'granted') {
                granted = true;
            }
        } catch (e) {
            // Not in native environment
        }

        // 2. Standard Web Browser
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                    granted = true;
                }
            } catch (e) {
                console.warn('Browser notification permission error:', e.message);
            }
        }

        return granted;
    },

    /**
     * Check if notifications are currently permitted
     */
    hasPermission: () => {
        if (typeof window === 'undefined') return false;
        if ('Notification' in window && Notification.permission === 'granted') {
            return true;
        }
        return false;
    },

    // ── 2. Real-Time Notification Trigger (Sound + Banner + OS Notification) ──

    /**
     * Handles an inbound real-time notification on any client (Web, Android APK, Desktop)
     */
    handleIncomingNotification: async (notif) => {
        if (!notif) return;

        const eventId = String(notif._id || notif.id || notif.title + '_' + notif.createdAt);
        const tone = notif.tone || notif.metadata?.tone || 'chime';
        const volume = notif.volume || notif.metadata?.volume || 80;

        // 1. Play Tone (with auto deduplication and volume control)
        if (notif.soundEnabled !== false) {
            try {
                await unlockAudio();
                await playNotificationSound(tone, volume, eventId);
            } catch (e) {
                console.warn('Audio tone trigger failed:', e.message);
            }
        }

        // 2. Trigger Capacitor Local Notification if in APK
        try {
            const numericId = Math.floor(Math.random() * 1000000);
            await LocalNotifications.schedule({
                notifications: [{
                    title: notif.title || 'Krishna ERP Alert',
                    body: notif.message || '',
                    id: numericId,
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: undefined,
                    extra: {
                        link: notif.link || '',
                        category: notif.category || 'general'
                    }
                }]
            });
        } catch (capErr) {
            // Not running in Capacitor APK; fallback to Web Notification
        }

        // 3. Trigger Web Desktop Notification if allowed and document is hidden/backgrounded
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                const webNotif = new Notification(notif.title || 'Krishna ERP', {
                    body: notif.message || '',
                    icon: '/icon-192x192.png',
                    tag: eventId,
                    data: {
                        link: notif.link || '',
                        category: notif.category || 'general'
                    }
                });

                webNotif.onclick = () => {
                    window.focus();
                    if (notif.link) {
                        window.location.href = notif.link;
                    }
                };
            } catch (wErr) {
                console.warn('Web notification dispatch error:', wErr.message);
            }
        }
    },

    // ── 3. Web Push Registration ─────────────────────────────────────────────

    /**
     * Subscribes browser to Web Push via VAPID public key
     */
    subscribeUserToPush: async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Web Push is not supported in this browser environment.');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Web Push permission denied.');
                return null;
            }

            const keyRes = await api.get('/notifications/vapid');
            const publicVapidKey = keyRes.data.publicKey;
            if (!publicVapidKey) return null;

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
            }

            await api.post('/notifications/subscribe', { subscription });
            console.log('🔑 Web Push subscription registered.');
            return subscription;
        } catch (err) {
            console.warn('Web Push registration error:', err.message);
            return null;
        }
    },

    // ── 4. API Endpoints ──────────────────────────────────────────────────────

    fetchNotifications: async (params = {}) => {
        const res = await api.get('/notifications', { params });
        return res.data;
    },

    markAsRead: async (id) => {
        const res = await api.put(`/notifications/${id}/read`);
        return res.data;
    },

    markAllAsRead: async () => {
        const res = await api.put('/notifications/read-all');
        return res.data;
    },

    deleteNotification: async (id) => {
        const res = await api.delete(`/notifications/${id}`);
        return res.data;
    },

    clearAllNotifications: async () => {
        const res = await api.delete('/notifications/clear-all');
        return res.data;
    },

    getSettings: async () => {
        const res = await api.get('/notifications/settings');
        return res.data;
    },

    updateSettings: async (settings) => {
        const res = await api.put('/notifications/settings', settings);
        return res.data;
    },

    sendTestNotification: async (payload) => {
        const res = await api.post('/notifications/test', payload);
        return res.data;
    },

    getNotificationLogs: async (params = {}) => {
        const res = await api.get('/notifications/logs', { params });
        return res.data;
    },

    // ── 5. Rental & Utility Reminders (Capacitor Local) ───────────────────────

    scheduleStayReminders: async (room) => {
        if (!room || !room.number) return;
        try {
            await LocalNotifications.cancel({ notifications: [{ id: parseInt(room.number, 10) * 10 }] });
            const notifications = [];
            const now = new Date();

            if (room.dueDate) {
                const dueDate = new Date(room.dueDate);
                const reminderDate = new Date(dueDate.getTime() - (24 * 60 * 60 * 1000));
                if (reminderDate > now) {
                    notifications.push({
                        title: `🏠 Krishna ERP: Rent Due`,
                        body: `Room ${room.number}: Rent ₹${room.rent} due tomorrow (${dueDate.toLocaleDateString()}).`,
                        id: parseInt(room.number, 10) * 10 + 1,
                        schedule: { at: reminderDate }
                    });
                }
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
            }
        } catch (e) {
            console.error('Local reminder schedule failure:', e);
        }
    },

    clearAll: async () => {
        try {
            await LocalNotifications.cancel({ notifications: [] });
        } catch (e) {}
    }
};
