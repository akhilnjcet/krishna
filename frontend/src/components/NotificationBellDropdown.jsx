import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, CheckCheck, Trash2, Volume2, VolumeX, ExternalLink, 
    CreditCard, Calendar, CheckSquare, FileText, AlertTriangle, 
    ShieldAlert, Users, MessageSquare, Clock, Filter, X, ChevronRight,
    Settings, RefreshCw
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { isSoundMuted, setSoundMuted, unlockAudio } from '../utils/soundService';
import { getSocket } from '../utils/socket';
import useAuthStore from '../stores/authStore';

const CATEGORY_ICONS = {
    payment: { icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    attendance: { icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    face_verification: { icon: Calendar, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
    leave: { icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
    advance: { icon: CreditCard, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
    salary: { icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    project: { icon: CheckSquare, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
    quote: { icon: FileText, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
    invoice: { icon: FileText, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40' },
    staff: { icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    customer: { icon: Users, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40' },
    chat: { icon: MessageSquare, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
    system: { icon: AlertTriangle, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40' },
    security: { icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
    general: { icon: Bell, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' }
};

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
};

const NotificationBellDropdown = ({ role = 'admin', customSettingsLink = null }) => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [muted, setMuted] = useState(isSoundMuted());

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial load & socket setup
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchNotifications();

        // Register Web Push in the background if supported
        notificationService.subscribeUserToPush().catch(() => {});

        // Connect to Socket.IO
        const socket = getSocket();
        if (socket) {
            socket.connect();

            // Join relevant rooms
            const myRole = user?.role || role;
            socket.emit('join-room', myRole);

            const myId = user?._id || user?.id;
            if (myId) {
                socket.emit('join-room', `user_${myId}`);
                socket.emit('join-room', String(myId));
            }

            const handleInboundNotification = (notif) => {
                if (!notif) return;
                
                // Trigger sound and native push via notificationService
                notificationService.handleIncomingNotification(notif);

                // Update UI state
                setNotifications(prev => [notif, ...prev.filter(n => n._id !== notif._id)]);
                setUnreadCount(prev => prev + 1);
            };

            socket.on('notification', handleInboundNotification);
            socket.on('notification-broadcast', handleInboundNotification);

            return () => {
                socket.off('notification', handleInboundNotification);
                socket.off('notification-broadcast', handleInboundNotification);
            };
        }
    }, [isAuthenticated, user, role]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationService.fetchNotifications({ limit: 40 });
            if (data && data.success) {
                setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
                setUnreadCount(data.unreadCount || 0);
            } else {
                setNotifications([]);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMute = (e) => {
        e.stopPropagation();
        unlockAudio();
        const nextMuted = !muted;
        setMuted(nextMuted);
        setSoundMuted(nextMuted);
    };

    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleItemClick = async (notif) => {
        try {
            if (!notif.read) {
                await notificationService.markAsRead(notif._id);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error marking as read:', err);
        }

        setIsOpen(false);

        if (notif.link) {
            navigate(notif.link);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const handleClearRead = async () => {
        try {
            await notificationService.clearAllNotifications();
            setNotifications(prev => prev.filter(n => !n.read));
        } catch (err) {
            console.error('Error clearing read notifications:', err);
        }
    };

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const filteredList = selectedCategory === 'all' 
        ? safeNotifications 
        : safeNotifications.filter(n => n && n.category === selectedCategory);

    const categoriesAvailable = Array.from(new Set(safeNotifications.map(n => n?.category))).filter(Boolean);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Trigger */}
            <button
                type="button"
                onClick={() => {
                    unlockAudio();
                    setIsOpen(!isOpen);
                }}
                className="relative p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
                title="Notifications"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Dropdown Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-[360px] sm:w-[420px] max-w-[94vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                {/* Sound Mute / Unmute Button */}
                                <button
                                    type="button"
                                    onClick={handleToggleMute}
                                    title={muted ? 'Unmute notification tones' : 'Mute notification tones'}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        muted 
                                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100' 
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>

                                {/* Mark all as read */}
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        title="Mark all as read"
                                        className="p-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        <span className="hidden sm:inline">Mark read</span>
                                    </button>
                                )}

                                {/* Refresh */}
                                <button
                                    type="button"
                                    onClick={fetchNotifications}
                                    title="Refresh notifications"
                                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Category Filter Pills (if multiple categories present) */}
                        {categoriesAvailable.length > 1 && (
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors whitespace-nowrap ${
                                        selectedCategory === 'all'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    All
                                </button>
                                {categoriesAvailable.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors whitespace-nowrap capitalize ${
                                            selectedCategory === cat
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {cat.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Notification Items List */}
                        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                            {filteredList.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        No notifications
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        You're all caught up! Real-time alerts will appear here.
                                    </p>
                                </div>
                            ) : (
                                filteredList.map(item => {
                                    const meta = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.general;
                                    const IconComponent = meta.icon;

                                    return (
                                        <div
                                            key={item._id}
                                            onClick={() => handleItemClick(item)}
                                            className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                                                !item.read
                                                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/30'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            {/* Icon */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>

                                            {/* Body */}
                                            <div className="flex-1 min-w-0 pr-6">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className={`text-xs font-semibold truncate ${
                                                        !item.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {typeof item.title === 'object' ? (item.title?.text || item.title?.message || JSON.stringify(item.title)) : String(item.title || '')}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {formatTimeAgo(item.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {typeof item.message === 'object' ? (item.message?.text || item.message?.message || JSON.stringify(item.message)) : String(item.message || '')}
                                                </p>
                                                {item.link && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-1">
                                                        View details <ChevronRight className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Unread Indicator Dot */}
                                            {!item.read && (
                                                <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950" />
                                            )}

                                            {/* Delete Action Button */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(e, item._id)}
                                                title="Delete notification"
                                                className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-xs">
                            <button
                                type="button"
                                onClick={handleClearRead}
                                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                                Clear read
                            </button>
                            {(role === 'admin' || customSettingsLink) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate(customSettingsLink || '/admin/notifications');
                                    }}
                                    className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Control Center</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBellDropdown;
