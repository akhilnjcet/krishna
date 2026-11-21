import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Bell, Check, Eye, Filter, Trash2, Calendar, 
    User, Activity, Search, RefreshCw, AlertTriangle,
    ShieldAlert, CheckCircle2, RotateCcw, Play, CheckSquare, 
    Volume2, VolumeX, Mail, Globe, Smartphone, Monitor, Sliders,
    Send, CheckCheck, X, ChevronRight, Clock, CreditCard, FileText,
    Users, MessageSquare, AlertCircle, Info, ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import { 
    playNotificationSound, 
    unlockAudio, 
    AVAILABLE_TONES, 
    isSoundMuted, 
    setSoundMuted,
    getNotificationVolume,
    setNotificationVolume,
    getSelectedTone,
    setSelectedTone
} from '../../utils/soundService';
import { notificationService } from '../../services/notificationService';

const CATEGORY_META = {
    payment: { label: 'Payment', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    attendance: { label: 'Attendance', icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    face_verification: { label: 'Face Verification', icon: Calendar, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
    leave: { label: 'Leave Request', icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
    advance: { label: 'Salary Advance', icon: CreditCard, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
    salary: { label: 'Salary / Payroll', icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    project: { label: 'Project Status', icon: CheckSquare, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
    quote: { label: 'Formal Quote', icon: FileText, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
    invoice: { label: 'Invoice', icon: FileText, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40' },
    staff: { label: 'Staff Activity', icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    customer: { label: 'Customer Action', icon: Users, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40' },
    chat: { label: 'Chat & Inquiry', icon: MessageSquare, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
    system: { label: 'System Notice', icon: AlertTriangle, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40' },
    security: { label: 'Security & Auth', icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
    general: { label: 'General Announcement', icon: Bell, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' }
};

const AdminNotifications = () => {
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'rules' | 'logs' | 'incidents'

    // ── 1. INBOX STATE ────────────────────────────────────────────────────────
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [inboxCategory, setInboxCategory] = useState('all');
    const [inboxSearch, setInboxSearch] = useState('');

    // ── 2. CONTROL PANEL (RULES & SETTINGS) STATE ─────────────────────────────
    const [settings, setSettings] = useState({
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
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSuccess, setSettingsSuccess] = useState(false);

    // Test notification modal/form state
    const [testForm, setTestForm] = useState({
        title: 'Test Notification',
        message: 'This is a test notification from the Krishna ERP control panel.',
        category: 'payment',
        priority: 'high',
        recipientRole: 'admin',
        tone: 'success'
    });
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // ── 3. DELIVERY LOGS STATE ────────────────────────────────────────────────
    const [logs, setLogs] = useState([]);
    const [logStats, setLogStats] = useState({ total: 0, deliveredCount: 0, pendingCount: 0, failedCount: 0 });
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logFilters, setLogFilters] = useState({
        status: 'all',
        category: 'all',
        role: 'all',
        search: ''
    });

    // ── 4. INCIDENT ALERTS STATE (LEGACY/PROJECT WORKFLOW) ────────────────────
    const [incidentAlerts, setIncidentAlerts] = useState([]);
    const [incidentStats, setIncidentStats] = useState({
        activeAlertsCount: 0,
        acknowledgedAlertsCount: 0,
        resolvedAlertsCount: 0,
        criticalAlertsCount: 0
    });
    const [ackModal, setAckModal] = useState({ show: false, id: null, remarks: '' });
    const [resolveModal, setResolveModal] = useState({ show: false, id: null, notes: '' });

    useEffect(() => {
        fetchInbox();
        fetchSettings();
        fetchIncidentStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        } else if (activeTab === 'incidents') {
            fetchIncidentAlerts();
        }
    }, [activeTab]);

    // ── API FETCHERS ──────────────────────────────────────────────────────────

    const fetchInbox = async () => {
        try {
            setLoadingInbox(true);
            const params = { limit: 50 };
            if (inboxCategory !== 'all') params.category = inboxCategory;
            if (inboxSearch) params.search = inboxSearch;

            const res = await notificationService.fetchNotifications(params);
            if (res && res.success) {
                setNotifications(Array.isArray(res.notifications) ? res.notifications : []);
                setUnreadCount(res.unreadCount || 0);
            }
        } catch (err) {
            console.error('Error fetching inbox notifications:', err);
            setNotifications([]);
        } finally {
            setLoadingInbox(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await notificationService.getSettings();
            if (res && res.success && res.config) {
                setSettings(res.config);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSavingSettings(true);
            setSettingsSuccess(false);
            const res = await notificationService.updateSettings(settings);
            if (res && res.success) {
                setSettingsSuccess(true);
                setTimeout(() => setSettingsSuccess(false), 3000);
            }
        } catch (err) {
            alert('Failed to save notification settings: ' + err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSendTest = async (e) => {
        e.preventDefault();
        try {
            setSendingTest(true);
            setTestResult(null);
            unlockAudio();
            const res = await notificationService.sendTestNotification(testForm);
            setTestResult({ success: true, message: res.message || 'Dispatched successfully!' });
            fetchInbox();
            if (activeTab === 'logs') fetchLogs();
        } catch (err) {
            setTestResult({ success: false, message: err.response?.data?.message || err.message });
        } finally {
            setSendingTest(false);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoadingLogs(true);
            const params = { limit: 50 };
            if (logFilters.status !== 'all') params.deliveryStatus = logFilters.status;
            if (logFilters.category !== 'all') params.category = logFilters.category;
            if (logFilters.role !== 'all') params.recipientRole = logFilters.role;
            if (logFilters.search) params.search = logFilters.search;

            const res = await notificationService.getNotificationLogs(params);
            if (res && res.success) {
                setLogs(Array.isArray(res.logs) ? res.logs : []);
                setLogStats(res.stats || { total: 0, deliveredCount: 0, pendingCount: 0, failedCount: 0 });
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchIncidentStats = async () => {
        try {
            const res = await api.get('/projects/dashboard/stats');
            setIncidentStats({
                activeAlertsCount: res.data?.activeAlertsCount || 0,
                acknowledgedAlertsCount: res.data?.acknowledgedAlertsCount || 0,
                resolvedAlertsCount: res.data?.resolvedAlertsCount || 0,
                criticalAlertsCount: res.data?.criticalAlertsCount || 0
            });
        } catch (err) {
            console.error('Error fetching incident stats:', err);
        }
    };

    const fetchIncidentAlerts = async () => {
        try {
            const res = await api.get('/project-alerts');
            const alerts = Array.isArray(res.data) 
                ? res.data 
                : (Array.isArray(res.data?.notifications) ? res.data.notifications : []);
            setIncidentAlerts(alerts);
        } catch (err) {
            console.error('Error fetching incident alerts:', err);
            setIncidentAlerts([]);
        }
    };

    // ── INBOX ACTIONS ─────────────────────────────────────────────────────────

    const handleMarkSingleRead = async (id, currentRead) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            if (!currentRead) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Mark read fail:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Mark all read fail:', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error('Delete notification fail:', err);
        }
    };

    const handleClearRead = async () => {
        try {
            await notificationService.clearAllNotifications();
            setNotifications(prev => prev.filter(n => !n.read));
        } catch (err) {
            console.error('Clear read fail:', err);
        }
    };

    // ── SOUND TEST ────────────────────────────────────────────────────────────

    const handlePreviewSound = (tone, volume) => {
        unlockAudio();
        playNotificationSound(tone, volume);
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Notification Command Center
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Real-time alerting across Web, Android APK, Desktop, SMS, and Email
                            </p>
                        </div>
                    </div>
                </div>

                {/* Unread Pill & Refresh */}
                <div className="flex items-center gap-2.5">
                    {unreadCount > 0 && (
                        <div className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            {unreadCount} Unread Alerts
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'inbox') fetchInbox();
                            else if (activeTab === 'rules') fetchSettings();
                            else if (activeTab === 'logs') fetchLogs();
                            else if (activeTab === 'incidents') fetchIncidentAlerts();
                        }}
                        className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                <button
                    type="button"
                    onClick={() => setActiveTab('inbox')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'inbox'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    Inbox & Live Alerts
                    {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('rules')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'rules'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <Sliders className="w-4 h-4" />
                    Channels, Rules & Sound Control
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'logs'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    Delivery Logs & Audit
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('incidents')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'incidents'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    Project Incidents
                    {incidentStats.activeAlertsCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {incidentStats.activeAlertsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── TAB 1: INBOX & LIVE ALERTS ────────────────────────────────────────── */}
            {activeTab === 'inbox' && (
                <div className="space-y-4">
                    {/* Filter & Action Toolbar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                        {/* Search and Category Filter */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={inboxSearch}
                                    onChange={(e) => setInboxSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                                    placeholder="Search alerts..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            <select
                                value={inboxCategory}
                                onChange={(e) => {
                                    setInboxCategory(e.target.value);
                                    setTimeout(fetchInbox, 50);
                                }}
                                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Categories</option>
                                {Object.entries(CATEGORY_META).map(([key, info]) => (
                                    <option key={key} value={key}>{info.label}</option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={fetchInbox}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                Filter
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl flex items-center gap-1.5 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark All Read
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleClearRead}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors"
                            >
                                Clear Read
                            </button>
                        </div>
                    </div>

                    {/* Alerts List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {loadingInbox ? (
                            <div className="p-12 text-center text-slate-400 text-sm">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                Loading notifications...
                            </div>
                        ) : (!Array.isArray(notifications) || notifications.length === 0) ? (
                            <div className="p-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                                    No notifications found
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    No alerts match the current filter criteria.
                                </p>
                            </div>
                        ) : (
                            notifications.map(item => {
                                const meta = CATEGORY_META[item.category] || CATEGORY_META.general;
                                const IconComponent = meta.icon;

                                return (
                                    <div
                                        key={item._id}
                                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                            !item.read 
                                                ? 'bg-blue-50/40 dark:bg-blue-950/20' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`font-semibold text-sm ${!item.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {item.title}
                                                    </span>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                                        {item.category}
                                                    </span>
                                                    {!item.read && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                    {item.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                                                    {item.recipientRole && (
                                                        <span>• Role: <strong className="text-slate-600 dark:text-slate-300 capitalize">{item.recipientRole}</strong></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                            {item.link && (
                                                <Link
                                                    to={item.link}
                                                    className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg flex items-center gap-1 transition-colors"
                                                >
                                                    View <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleMarkSingleRead(item._id, item.read)}
                                                title={item.read ? 'Mark Unread' : 'Mark Read'}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item._id)}
                                                title="Delete"
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 2: CHANNELS, RULES & SOUND CONTROL PANEL ──────────────────────── */}
            {activeTab === 'rules' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Checkbox Grid Controls */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Channel Toggles */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        Delivery Channels
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Enable or disable real-time channels application-wide
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { key: 'in_app', label: 'In-App Banner', icon: Bell, desc: 'Real-time badge & toast' },
                                    { key: 'sound', label: 'Audio Tone', icon: Volume2, desc: 'Pleasant sound synthesizer' },
                                    { key: 'desktop', label: 'Desktop Browser', icon: Monitor, desc: 'Native OS desktop notifications' },
                                    { key: 'web_push', label: 'Web Push (VAPID)', icon: Globe, desc: 'Background service worker push' },
                                    { key: 'apk_push', label: 'Android APK Push', icon: Smartphone, desc: 'Capacitor native push' },
                                    { key: 'email', label: 'Email Alerts', icon: Mail, desc: 'Immediate dispatch to mailbox' }
                                ].map(ch => {
                                    const IconComponent = ch.icon;
                                    const active = settings.channels?.[ch.key] !== false;
                                    return (
                                        <label
                                            key={ch.key}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                                active 
                                                    ? 'border-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20' 
                                                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        channels: { ...prev.channels, [ch.key]: e.target.checked }
                                                    }));
                                                }}
                                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {ch.label}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {ch.desc}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Recipient Groups */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        Recipient Audiences
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Target specific roles for real-time notification dispatch
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { key: 'admin', label: 'Admin Dashboard', desc: 'Central management terminal' },
                                    { key: 'staff', label: 'Staff Dashboard & APK', desc: 'Field engineers & operators' },
                                    { key: 'customer', label: 'Customer Portal', desc: 'Clients & project owners' }
                                ].map(rec => {
                                    const active = settings.recipients?.[rec.key] !== false;
                                    return (
                                        <label
                                            key={rec.key}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                                active 
                                                    ? 'border-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20' 
                                                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        recipients: { ...prev.recipients, [rec.key]: e.target.checked }
                                                    }));
                                                }}
                                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {rec.label}
                                                </span>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {rec.desc}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Event Categories */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        Event Categories
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Select which operational events trigger notifications
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {Object.entries(CATEGORY_META).map(([key, info]) => {
                                    const active = settings.categories?.[key] !== false;
                                    return (
                                        <label
                                            key={key}
                                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                                                active 
                                                    ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20' 
                                                    : 'border-slate-200 dark:border-slate-800 opacity-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        categories: { ...prev.categories, [key]: e.target.checked }
                                                    }));
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500 text-xs"
                                            />
                                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {info.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-between pt-2">
                            {settingsSuccess && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Rules saved & synchronized across all clients!
                                </span>
                            )}
                            <div className="ml-auto">
                                <button
                                    type="button"
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Notification Config
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Audio Synthesizer Controls & Live Test Sender */}
                    <div className="space-y-6">
                        {/* Audio Engine Configuration */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Volume2 className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        Notification Tone Engine
                                    </h3>
                                </div>
                            </div>

                            {/* Default Tone Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Default System Tone
                                </label>
                                <select
                                    value={settings.sounds?.defaultTone || 'chime'}
                                    onChange={(e) => {
                                        const tone = e.target.value;
                                        setSettings(prev => ({
                                            ...prev,
                                            sounds: { ...prev.sounds, defaultTone: tone }
                                        }));
                                        handlePreviewSound(tone, settings.sounds?.volume || 80);
                                    }}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {AVAILABLE_TONES.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} — {t.desc}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Volume Slider */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span>Tone Volume</span>
                                    <span>{settings.sounds?.volume || 80}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.sounds?.volume || 80}
                                    onChange={(e) => {
                                        const vol = parseInt(e.target.value, 10);
                                        setSettings(prev => ({
                                            ...prev,
                                            sounds: { ...prev.sounds, volume: vol }
                                        }));
                                    }}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                            </div>

                            {/* Preview All Tones Grid */}
                            <div className="pt-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Preview Tones
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_TONES.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handlePreviewSound(t.id, settings.sounds?.volume || 80)}
                                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors"
                                        >
                                            <span className="truncate">{t.name}</span>
                                            <Play className="w-3 h-3 text-blue-500 shrink-0 ml-1" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Test Notification Trigger Tool */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <Send className="w-4 h-4 text-emerald-600" />
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                    Send Live Test Alert
                                </h3>
                            </div>

                            <form onSubmit={handleSendTest} className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={testForm.title}
                                        onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Message
                                    </label>
                                    <textarea
                                        value={testForm.message}
                                        onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Category
                                        </label>
                                        <select
                                            value={testForm.category}
                                            onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                        >
                                            {Object.entries(CATEGORY_META).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Recipient
                                        </label>
                                        <select
                                            value={testForm.recipientRole}
                                            onChange={(e) => setTestForm({ ...testForm, recipientRole: e.target.value })}
                                            className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="staff">Staff</option>
                                            <option value="customer">Customer</option>
                                            <option value="all">All Roles</option>
                                        </select>
                                    </div>
                                </div>

                                {testResult && (
                                    <p className={`text-xs font-semibold ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {testResult.message}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={sendingTest}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Dispatch Live Test Alert
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 3: DELIVERY LOGS & AUDIT ──────────────────────────────────────── */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Log Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-slate-400">Total Logged</span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {logStats.total}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-emerald-500">Delivered</span>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {logStats.deliveredCount}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-amber-500">Pending</span>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                                {logStats.pendingCount}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-rose-500">Failed</span>
                            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                                {logStats.failedCount}
                            </p>
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={logFilters.search}
                                onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                                placeholder="Search logs..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                            />
                        </div>

                        <select
                            value={logFilters.status}
                            onChange={(e) => {
                                setLogFilters({ ...logFilters, status: e.target.value });
                                setTimeout(fetchLogs, 50);
                            }}
                            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                            <option value="all">All Delivery Statuses</option>
                            <option value="delivered">Delivered</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>

                        <select
                            value={logFilters.role}
                            onChange={(e) => {
                                setLogFilters({ ...logFilters, role: e.target.value });
                                setTimeout(fetchLogs, 50);
                            }}
                            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                            <option value="customer">Customer</option>
                        </select>

                        <button
                            type="button"
                            onClick={fetchLogs}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Apply Filter
                        </button>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                                    <th className="py-3 px-4">Event / Title</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Recipient</th>
                                    <th className="py-3 px-4">Channels</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loadingLogs ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                                            Loading logs...
                                        </td>
                                    </tr>
                                ) : (!Array.isArray(logs) || logs.length === 0) ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No delivery logs recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[240px]">
                                                <div className="truncate">{log.title}</div>
                                                <div className="text-[11px] font-normal text-slate-500 truncate">{log.message}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                                    {log.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                                                    {log.recipientRole}
                                                </div>
                                                {log.recipientUser && (
                                                    <div className="text-[11px] text-slate-400 truncate">
                                                        {log.recipientUser.name || log.recipientUser.email}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(log.channels || []).map((ch, idx) => (
                                                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                            {ch.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    log.deliveryStatus === 'delivered'
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : log.deliveryStatus === 'pending'
                                                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                                }`}>
                                                    {log.deliveryStatus}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB 4: PROJECT INCIDENT ALERTS (LEGACY/PROJECT STATUS) ─────────────── */}
            {activeTab === 'incidents' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-amber-500">Active Incidents</span>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{incidentStats.activeAlertsCount}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-rose-500">Critical Alerts</span>
                            <p className="text-2xl font-bold text-rose-600 mt-1">{incidentStats.criticalAlertsCount}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-blue-500">Acknowledged</span>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{incidentStats.acknowledgedAlertsCount}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-emerald-500">Resolved</span>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{incidentStats.resolvedAlertsCount}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {(!Array.isArray(incidentAlerts) || incidentAlerts.length === 0) ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No project incidents reported.
                            </div>
                        ) : (
                            incidentAlerts.map(inc => (
                                <div key={inc._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{inc.title}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase">
                                                {inc.type}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                inc.priority === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {inc.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Project: <strong>{inc.projectName}</strong></p>
                                        {inc.reason && <p className="text-xs text-amber-600 mt-0.5">Reason: {inc.reason}</p>}
                                        <p className="text-[11px] text-slate-400 mt-1">{new Date(inc.createdAt).toLocaleString()}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {inc.status === 'Active' && (
                                            <button
                                                type="button"
                                                onClick={() => setAckModal({ show: true, id: inc._id, remarks: '' })}
                                                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all"
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                        {inc.status !== 'Resolved' && (
                                            <button
                                                type="button"
                                                onClick={() => setResolveModal({ show: true, id: inc._id, notes: '' })}
                                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Acknowledge Modal */}
            {ackModal.show && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 dark:text-white">Acknowledge Incident Alert</h3>
                        <textarea
                            value={ackModal.remarks}
                            onChange={(e) => setAckModal({ ...ackModal, remarks: e.target.value })}
                            placeholder="Enter acknowledgment remarks..."
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAckModal({ show: false, id: null, remarks: '' })}
                                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await api.put(`/notifications/${ackModal.id}/acknowledge`, { remarks: ackModal.remarks });
                                    setAckModal({ show: false, id: null, remarks: '' });
                                    fetchIncidentAlerts();
                                    fetchIncidentStats();
                                }}
                                className="px-4 py-1.5 text-xs bg-amber-500 text-white font-bold rounded-xl"
                            >
                                Confirm Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {resolveModal.show && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 dark:text-white">Resolve Incident Alert</h3>
                        <textarea
                            value={resolveModal.notes}
                            onChange={(e) => setResolveModal({ ...resolveModal, notes: e.target.value })}
                            placeholder="Enter resolution notes..."
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            rows={3}
                            required
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setResolveModal({ show: false, id: null, notes: '' })}
                                className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!resolveModal.notes) return alert('Resolution notes required');
                                    await api.put(`/notifications/${resolveModal.id}/resolve`, { resolutionNotes: resolveModal.notes });
                                    setResolveModal({ show: false, id: null, notes: '' });
                                    fetchIncidentAlerts();
                                    fetchIncidentStats();
                                }}
                                className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-bold rounded-xl"
                            >
                                Confirm Resolve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;
