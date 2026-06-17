import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Bell, Check, Eye, Filter, Trash2, Calendar, 
    User, Activity, Search, RefreshCw, AlertTriangle,
    ShieldAlert, CheckCircle2, RotateCcw, Play
} from 'lucide-react';

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [projects, setProjects] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        projectId: '',
        updatedBy: '',
        type: '',
        startDate: '',
        endDate: '',
        isRead: ''
    });

    useEffect(() => {
        fetchMetadata();
        fetchNotifications();
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
        } catch (err) {
            console.error("Failed to mark read status:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            alert("All notifications marked as read.");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const getStatusIndicator = (type) => {
        switch (type) {
            case 'Delayed':
                return { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200', badge: '🔴 Delayed' };
            case 'Stopped':
                return { icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200', badge: '🔴 Stopped' };
            case 'Completed':
                return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200', badge: '🔵 Completed' };
            case 'Restarted':
                return { icon: RotateCcw, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/20 border-teal-200', badge: '🟢 Restarted' };
            default:
                return { icon: Play, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200', badge: '🟢 In Progress' };
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-dark-border">
                <div>
                    <h1 className="text-4xl font-bold text-[#111827] dark:text-dark-text tracking-tight font-poppins">
                        Notification <span className="text-[#2563EB]">Center</span>
                    </h1>
                    <p className="text-sm text-[#6B7280] dark:text-dark-muted mt-2">
                        Audit feed and timeline logs for operational deviations and delays.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleMarkAllAsRead} 
                        className="px-5 py-2.5 bg-white border border-[#E2E8F0] dark:border-dark-border dark:bg-dark-surface rounded-xl text-sm font-bold text-[#111827] dark:text-dark-text hover:bg-slate-50 dark:hover:bg-dark-bg transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Check className="w-4 h-4" /> Mark All as Read
                    </button>
                    <button 
                        onClick={() => fetchNotifications()} 
                        className="px-5 py-2.5 bg-[#2563EB] rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-dark-text uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#2563EB]" /> Filter Alert Logs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">Project</label>
                        <select 
                            name="projectId"
                            value={filters.projectId}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-muted uppercase mb-2">End Date</label>
                        <input 
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-dark-text outline-none focus:border-[#2563EB]"
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
            <div className="bg-white dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Syncing feeds...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-24 text-center">
                        <Bell className="w-12 h-12 text-slate-200 dark:text-dark-border mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-dark-text mb-1">No Alerts Logged</h3>
                        <p className="text-sm text-slate-400 dark:text-dark-muted">No notifications matching selected filters found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-dark-bg border-b border-[#E2E8F0] dark:border-dark-border text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="p-6">Status</th>
                                    <th className="p-6">Project Name</th>
                                    <th className="p-6">Updated By</th>
                                    <th className="p-6">Incident Reason</th>
                                    <th className="p-6">Remarks</th>
                                    <th className="p-6">Reported At</th>
                                    <th className="p-6 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] dark:divide-dark-border text-sm">
                                {notifications.map((n) => {
                                    const { badge, color, icon: Icon } = getStatusIndicator(n.type);
                                    return (
                                        <tr 
                                            key={n._id}
                                            className={`hover:bg-slate-50/50 dark:hover:bg-blue-900/5 transition-all ${
                                                !n.isRead ? 'bg-blue-50/20 dark:bg-blue-950/10 font-medium' : ''
                                            }`}
                                        >
                                            <td className="p-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${color}`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {n.type === 'Restarted' ? '🟢 Work Restarted' : badge}
                                                </span>
                                            </td>
                                            <td className="p-6 font-bold text-slate-800 dark:text-dark-text">
                                                {n.projectName}
                                            </td>
                                            <td className="p-6 text-slate-700 dark:text-dark-text font-semibold flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-dark-bg text-[#2563EB] flex items-center justify-center font-bold text-xs uppercase border border-[#E2E8F0] dark:border-dark-border">
                                                    {n.updatedBy?.name?.charAt(0) || 'U'}
                                                </div>
                                                {n.updatedBy?.name || 'Deleted User'}
                                            </td>
                                            <td className="p-6 text-slate-600 dark:text-dark-muted font-medium">
                                                {n.reason || <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="p-6 text-slate-600 dark:text-dark-muted max-w-xs truncate">
                                                {n.remarks || <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="p-6 text-xs text-slate-500 dark:text-dark-muted font-bold whitespace-nowrap">
                                                {new Date(n.createdAt).toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleMarkAsRead(n._id, n.isRead)}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            n.isRead 
                                                                ? 'text-slate-300 hover:text-slate-600 hover:bg-slate-100' 
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
        </div>
    );
};

export default AdminNotifications;
