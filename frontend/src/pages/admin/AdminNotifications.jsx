import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Bell, Check, Eye, Filter, Trash2, Calendar, 
    User, Activity, Search, RefreshCw, AlertTriangle,
    ShieldAlert, CheckCircle2, RotateCcw, Play, CheckSquare, HelpCircle
} from 'lucide-react';

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [projects, setProjects] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeAlertsCount: 0,
        acknowledgedAlertsCount: 0,
        resolvedAlertsCount: 0,
        criticalAlertsCount: 0,
        todaysIncidentsCount: 0,
        unreadCount: 0
    });

    const [filters, setFilters] = useState({
        projectId: '',
        updatedBy: '',
        type: '',
        startDate: '',
        endDate: '',
        isRead: ''
    });

    const [ackModal, setAckModal] = useState({ show: false, id: null, remarks: '' });
    const [resolveModal, setResolveModal] = useState({ show: false, id: null, notes: '' });

    useEffect(() => {
        fetchMetadata();
        fetchNotifications();
        fetchStats();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [projRes, staffRes] = await Promise.all([
                api.get('/projects'),
                api.get('/staff')
            ]);
            setProjects(projRes.data || []);
            setStaffList(staffRes.data || []);
        } catch (err) {
            console.error("Error fetching metadata:", err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/projects/dashboard/stats');
            setStats({
                activeAlertsCount: res.data.activeAlertsCount || 0,
                acknowledgedAlertsCount: res.data.acknowledgedAlertsCount || 0,
                resolvedAlertsCount: res.data.resolvedAlertsCount || 0,
                criticalAlertsCount: res.data.criticalAlertsCount || 0,
                todaysIncidentsCount: res.data.todaysIncidentsCount || 0,
                unreadCount: res.data.unreadCount || 0
            });
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const fetchNotifications = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.projectId) params.projectId = currentFilters.projectId;
            if (currentFilters.updatedBy) params.updatedBy = currentFilters.updatedBy;
            if (currentFilters.type) params.type = currentFilters.type;
            if (currentFilters.isRead !== '') params.isRead = currentFilters.isRead;
            if (currentFilters.startDate) params.startDate = currentFilters.startDate;
            if (currentFilters.endDate) params.endDate = currentFilters.endDate;

            const res = await api.get('/notifications', { params });
            setNotifications(res.data || []);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        fetchNotifications(newFilters);
    };

    const handleClearFilters = () => {
        const cleared = {
            projectId: '',
            updatedBy: '',
            type: '',
            startDate: '',
            endDate: '',
            isRead: ''
        };
        setFilters(cleared);
        fetchNotifications(cleared);
    };

    const handleMarkAsRead = async (id, currentStatus) => {
        try {
            await api.put(`/notifications/${id}/read`, { isRead: !currentStatus });
            setNotifications(notifications.map(n => 
                n._id === id ? { ...n, isRead: !currentStatus } : n
            ));
            fetchStats();
        } catch (err) {
            console.error("Failed to mark read status:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            fetchStats();
            alert("All notifications marked as read.");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const handleAcknowledgeSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/notifications/${ackModal.id}/acknowledge`, { remarks: ackModal.remarks });
            setAckModal({ show: false, id: null, remarks: '' });
            fetchNotifications();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to acknowledge notification.");
        }
    };

    const handleResolveSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/notifications/${resolveModal.id}/resolve`, { resolutionNotes: resolveModal.notes });
            setResolveModal({ show: false, id: null, notes: '' });
            fetchNotifications();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to resolve notification.");
        }
    };

    const getPriorityStyles = (priority, status, createdAt) => {
        const isEscalated = priority === 'Critical' && status === 'Active' && ((new Date() - new Date(createdAt)) / 60000) > 5;
        if (isEscalated) {
            return {
                bg: 'bg-red-500/10 dark:bg-red-950/20 animate-pulse border-l-8 border-l-red-600',
                badge: 'bg-red-600 text-white'
            };
        }
        switch (priority) {
            case 'Critical':
                return {
                    bg: 'bg-red-50/30 dark:bg-red-950/5 border-l-4 border-l-red-600',
                    badge: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                };
            case 'High':
                return {
                    bg: 'bg-orange-50/30 dark:bg-orange-950/5 border-l-4 border-l-orange-500',
                    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                };
            case 'Medium':
                return {
                    bg: 'bg-yellow-50/30 dark:bg-yellow-950/5 border-l-4 border-l-yellow-500',
                    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                };
            case 'Low':
            default:
                return {
                    bg: 'bg-blue-50/30 dark:bg-blue-950/5 border-l-4 border-l-blue-500',
                    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                };
        }
    };

    const getStatusIndicator = (status) => {
        switch (status) {
            case 'Active':
                return 'bg-red-100 text-red-700 border border-red-200';
            case 'Acknowledged':
                return 'bg-amber-100 text-amber-700 border border-amber-200';
            case 'Resolved':
                return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            default:
                return 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 dark:border-dark-border">
                <div>
                    <h1 className="text-4xl font-bold text-[#111827] dark:text-dark-text tracking-tight font-poppins">
                        Alert Center <span className="text-[#2563EB]">Dashboard</span>
                    </h1>
                    <p className="text-sm text-[#6B7280] dark:text-dark-muted mt-2">
                        Real-time warning tracking, sound alert configuration, incident metrics, and multi-priority logs.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleMarkAllAsRead} 
                        className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-dark-border dark:bg-dark-surface rounded-xl text-sm font-bold text-[#111827] dark:text-dark-text hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-dark-bg transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Check className="w-4 h-4" /> Mark All as Read
                    </button>
                    <button 
                        onClick={() => { fetchNotifications(); fetchStats(); }} 
                        className="px-5 py-2.5 bg-[#2563EB] rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {/* Critical Alerts */}
                <div className="bg-red-50/50 dark:bg-red-950/15 border-2 border-red-100 dark:border-red-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Critical Alerts</span>
                        <div className="bg-red-500/10 p-2 rounded-xl"><ShieldAlert className="w-5 h-5 text-red-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-red-700 dark:text-red-400">{stats.criticalAlertsCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Requires Action</p>
                    </div>
                </div>

                {/* Active Alerts */}
                <div className="bg-blue-50/50 dark:bg-blue-950/15 border-2 border-blue-100 dark:border-blue-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Active Alerts</span>
                        <div className="bg-blue-500/10 p-2 rounded-xl"><Activity className="w-5 h-5 text-blue-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{stats.activeAlertsCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unresolved Total</p>
                    </div>
                </div>

                {/* Acknowledged */}
                <div className="bg-amber-50/50 dark:bg-amber-950/15 border-2 border-amber-100 dark:border-amber-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Acknowledged</span>
                        <div className="bg-amber-500/10 p-2 rounded-xl"><Check className="w-5 h-5 text-amber-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.acknowledgedAlertsCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Under Review</p>
                    </div>
                </div>

                {/* Resolved */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border-2 border-emerald-100 dark:border-emerald-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Resolved</span>
                        <div className="bg-emerald-500/10 p-2 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.resolvedAlertsCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Closed Incidents</p>
                    </div>
                </div>

                {/* Today's Incidents */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/15 border-2 border-indigo-100 dark:border-indigo-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Today's Total</span>
                        <div className="bg-indigo-500/10 p-2 rounded-xl"><Calendar className="w-5 h-5 text-indigo-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{stats.todaysIncidentsCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reported Today</p>
                    </div>
                </div>

                {/* Unread Alerts */}
                <div className="bg-yellow-50/50 dark:bg-yellow-950/15 border-2 border-yellow-100 dark:border-yellow-950 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-yellow-600 tracking-wider">Unread Inbox</span>
                        <div className="bg-yellow-500/10 p-2 rounded-xl"><Bell className="w-5 h-5 text-yellow-600" /></div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-yellow-700 dark:text-yellow-500">{stats.unreadCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unread Notifications</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface p-6 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#2563EB]" /> Filter Alert Logs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Project</label>
                        <select 
                            name="projectId"
                            value={filters.projectId}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Reported By</label>
                        <select 
                            name="updatedBy"
                            value={filters.updatedBy}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        >
                            <option value="">All Staff</option>
                            {staffList.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Alert Type</label>
                        <select 
                            name="type"
                            value={filters.type}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        >
                            <option value="">All Types</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Stopped">Stopped</option>
                            <option value="Restarted">Restarted</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Read Status</label>
                        <select 
                            name="isRead"
                            value={filters.isRead}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        >
                            <option value="">All</option>
                            <option value="false">Unread Only</option>
                            <option value="true">Read Only</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Start Date</label>
                        <input 
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">End Date</label>
                        <input 
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        />
                    </div>
                </div>
                {Object.values(filters).some(Boolean) && (
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleClearFilters}
                            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* List / Table */}
            <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Syncing feeds...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-24 text-center">
                        <Bell className="w-12 h-12 text-slate-200 dark:text-dark-border mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text mb-1">No Alerts Logged</h3>
                        <p className="text-sm text-slate-400 dark:text-dark-muted">No notifications matching selected filters found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border-b border-[#E2E8F0] dark:border-dark-border text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="p-6">Priority / Type</th>
                                    <th className="p-6">Project Name</th>
                                    <th className="p-6">Reported By</th>
                                    <th className="p-6">Details</th>
                                    <th className="p-6">Timeline State</th>
                                    <th className="p-6">Response Tracking</th>
                                    <th className="p-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] dark:divide-dark-border text-sm">
                                {notifications.map((n) => {
                                    const { bg, badge } = getPriorityStyles(n.priority, n.status, n.createdAt);
                                    return (
                                        <tr 
                                            key={n._id}
                                            className={`hover:bg-slate-50/50 dark:bg-slate-800/50 dark:hover:bg-blue-900/5 transition-all ${bg} ${
                                                !n.isRead ? 'font-medium' : ''
                                            }`}
                                        >
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badge}`}>
                                                        {n.priority || 'Low'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                                                        {n.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text">{n.projectName}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{n.title}</div>
                                            </td>
                                            <td className="p-6 text-slate-700 dark:text-slate-300 dark:text-dark-text font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 dark:bg-dark-bg text-[#2563EB] flex items-center justify-center font-bold text-xs uppercase border border-[#E2E8F0] dark:border-dark-border">
                                                        {n.updatedBy?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold">{n.updatedBy?.name || 'Deleted User'}</div>
                                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{n.updatedBy?.role || 'staff'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-xs"><span className="text-slate-400 font-bold">Reason:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{n.reason || 'N/A'}</span></div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs line-clamp-2"><span className="text-slate-400 font-bold">Remarks:</span> {n.remarks || '—'}</div>
                                            </td>
                                            <td className="p-6 text-xs font-bold whitespace-nowrap">
                                                <div className="text-slate-500 dark:text-slate-400 dark:text-dark-muted flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(n.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 ml-4">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${getStatusIndicator(n.status)}`}>
                                                        {n.status}
                                                    </span>
                                                    {n.status === 'Acknowledged' && (
                                                        <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Ack by: <span className="font-bold">{n.acknowledgedBy?.name}</span>
                                                        </div>
                                                    )}
                                                    {n.status === 'Resolved' && (
                                                        <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Res by: <span className="font-bold">{n.resolvedBy?.name}</span>
                                                            {n.resolutionNotes && <p className="italic text-slate-400 line-clamp-1">"{n.resolutionNotes}"</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {n.status === 'Active' && ['Critical', 'High', 'Medium'].includes(n.priority) && (
                                                        <button 
                                                            onClick={() => setAckModal({ show: true, id: n._id, remarks: '' })}
                                                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-500/10"
                                                            title="Acknowledge Alert"
                                                        >
                                                            Ack
                                                        </button>
                                                    )}
                                                    {n.status !== 'Resolved' && ['Critical', 'High', 'Medium'].includes(n.priority) && (
                                                        <button 
                                                            onClick={() => setResolveModal({ show: true, id: n._id, notes: '' })}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/10"
                                                            title="Resolve Alert"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleMarkAsRead(n._id, n.isRead)}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            n.isRead 
                                                                ? 'text-slate-300 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-dark-bg' 
                                                                : 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100'
                                                        }`}
                                                        title={n.isRead ? "Mark as Unread" : "Mark as Read"}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Acknowledge Dialog Modal */}
            {ackModal.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text mb-4">Acknowledge Incident Alert</h3>
                        <form onSubmit={handleAcknowledgeSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Acknowledge Remarks / Notes</label>
                                <textarea 
                                    rows="3"
                                    required
                                    placeholder="Provide immediate action steps or comments..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-[#2563EB]"
                                    value={ackModal.remarks}
                                    onChange={e => setAckModal({ ...ackModal, remarks: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setAckModal({ show: false, id: null, remarks: '' })}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Confirm Acknowledge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resolve Dialog Modal */}
            {resolveModal.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 dark:border-dark-border">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text mb-4">Resolve Incident Alert</h3>
                        <form onSubmit={handleResolveSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Incident Resolution Notes</label>
                                <textarea 
                                    rows="4"
                                    required
                                    placeholder="Explain how the blocker was resolved and how work was resumed..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-[#2563EB]"
                                    value={resolveModal.notes}
                                    onChange={e => setResolveModal({ ...resolveModal, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setResolveModal({ show: false, id: null, notes: '' })}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Mark as Resolved
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;
