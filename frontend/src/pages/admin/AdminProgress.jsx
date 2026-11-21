import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { 
    Filter, Search, Calendar, User, Clock, CheckCircle2, 
    AlertCircle, FileText, ChevronDown, ChevronUp,
    Image as ImageIcon, Trash2, Eye, Download, MapPin,
    RefreshCw, Check, AlertTriangle, Layers, X, Printer,
    Activity, ShieldCheck, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminProgress = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get('/progress/all');
            setReports(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching progress:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleDelete = async (id, projectTitle) => {
        if (!window.confirm(`Are you sure you want to permanently delete the progress log for "${projectTitle || 'this project'}"?`)) return;
        try {
            await api.delete(`/progress/delete/${id}`);
            setReports(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            console.error('Delete Job Error:', error);
            alert('Failed to delete report. Please try again.');
        }
    };

    const handleToggleApproval = async (report) => {
        setActionLoadingId(report._id);
        const nextState = !report.isApproved;
        try {
            await api.put(`/progress/update/${report._id}`, { isApproved: nextState });
            setReports(prev => prev.map(r => r._id === report._id ? { ...r, isApproved: nextState } : r));
        } catch (err) {
            console.error('Failed to update approval status:', err);
            alert('Failed to update approval status.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filter and search logic
    const filteredReports = useMemo(() => {
        let list = [...reports];

        // Status filter
        if (filter !== 'all') {
            if (filter === 'pending') {
                list = list.filter(r => !r.isApproved);
            } else {
                list = list.filter(r => (r.status || '').toLowerCase() === filter.toLowerCase());
            }
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(r => {
                const project = (r.projectId?.title || '').toLowerCase();
                const location = (r.projectId?.location || '').toLowerCase();
                const staff = (r.staffId?.name || '').toLowerCase();
                const title = (r.title || '').toLowerCase();
                const desc = (r.description || '').toLowerCase();
                const logId = (r._id || '').toLowerCase();
                const materials = (r.materialsUsed || '').toLowerCase();
                const issues = (r.issues || '').toLowerCase();

                return project.includes(q) || 
                       location.includes(q) || 
                       staff.includes(q) || 
                       title.includes(q) || 
                       desc.includes(q) || 
                       logId.includes(q) ||
                       materials.includes(q) ||
                       issues.includes(q);
            });
        }

        return list;
    }, [reports, filter, searchQuery]);

    // Metric counters
    const stats = useMemo(() => {
        const total = reports.length;
        const inProgress = reports.filter(r => (r.status || '').toLowerCase() === 'in progress').length;
        const completed = reports.filter(r => (r.status || '').toLowerCase() === 'completed').length;
        const pending = reports.filter(r => !r.isApproved).length;
        return { total, inProgress, completed, pending };
    }, [reports]);

    return (
        <div className="p-4 md:p-8 space-y-6 bg-slate-50/70 dark:bg-slate-950 min-h-screen font-sans text-slate-800 dark:text-slate-100 transition-colors">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Operational Intelligence
                        </span>
                        <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Field Site Reporting</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        Project Progress & Timeline
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        Track live operational logs, material deployment, delay reasons, and photographic field milestones across all active client jobs.
                    </p>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => fetchReports(true)}
                        disabled={refreshing}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200/80 dark:border-slate-700 shadow-sm active:scale-95"
                        title="Reload latest site logs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>{refreshing ? 'Syncing...' : 'Sync Logs'}</span>
                    </button>
                </div>
            </div>

            {/* Metric KPI Widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                    onClick={() => setFilter('all')}
                    className={`cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all shadow-sm ${
                        filter === 'all' 
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10' 
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Logs</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</span>
                        <span className="text-[11px] font-semibold text-slate-400">Records</span>
                    </div>
                </div>

                <div 
                    onClick={() => setFilter('in progress')}
                    className={`cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all shadow-sm ${
                        filter === 'in progress' 
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10' 
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">In Progress</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400">{stats.inProgress}</span>
                        <span className="text-[11px] font-semibold text-blue-500/70">Active work</span>
                    </div>
                </div>

                <div 
                    onClick={() => setFilter('completed')}
                    className={`cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all shadow-sm ${
                        filter === 'completed' 
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10' 
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Completed</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
                        <span className="text-[11px] font-semibold text-emerald-500/70">Finished</span>
                    </div>
                </div>

                <div 
                    onClick={() => setFilter('pending')}
                    className={`cursor-pointer bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all shadow-sm ${
                        filter === 'pending' 
                            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/10' 
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pending Review</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">{stats.pending}</span>
                        <span className="text-[11px] font-semibold text-amber-500/70">Requires check</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search logs by project, staff, materials, issues..."
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {[
                        { id: 'all', label: 'All Logs', count: stats.total },
                        { id: 'in progress', label: 'In Progress', count: stats.inProgress },
                        { id: 'completed', label: 'Completed', count: stats.completed },
                        { id: 'not started', label: 'Not Started' },
                        { id: 'pending', label: 'Pending Review', count: stats.pending }
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filter === f.id
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <span>{f.label}</span>
                            {f.count !== undefined && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    filter === f.id 
                                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' 
                                        : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {f.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">Loading site operational logs...</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-3">
                        <FileText className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No operational logs match your filter</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                        {searchQuery ? `No records found matching "${searchQuery}".` : 'No logs recorded under this status category yet.'}
                    </p>
                    {(searchQuery || filter !== 'all') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setFilter('all');
                            }}
                            className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition border border-blue-200/50 dark:border-blue-800/50"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report, idx) => {
                        const isExpanded = expandedId === report._id;
                        const statusLower = (report.status || '').toLowerCase();
                        const isCompleted = statusLower === 'completed';
                        const isInProgress = statusLower === 'in progress';
                        const percent = Math.min(100, Math.max(0, Number(report.progressPercentage) || 0));

                        return (
                            <motion.div 
                                key={report._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Card Body */}
                                <div className="p-5 md:p-6">
                                    {/* Top Metadata Row */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Status Pill */}
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                                                    isCompleted
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                                        : isInProgress
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                                                    }`} />
                                                    {report.status || 'In Progress'}
                                                </span>

                                                {/* Approval Verification Badge */}
                                                {report.isApproved ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                        Verified by Admin
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                        Pending Review
                                                    </span>
                                                )}

                                                {/* Log Reference Code */}
                                                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                    #{report._id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Project Title */}
                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                                <span>{report.projectId?.title || 'General Engineering Work'}</span>
                                            </h3>

                                            {/* Sub Meta Info */}
                                            <div className="flex flex-wrap items-center gap-3 md:gap-5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                                                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                    {report.staffId?.name || 'Staff Member'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {report.projectId?.location || 'Site Location'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(report.date || Date.now()).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar & Right Actions */}
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            {/* Progress Gauge */}
                                            <div className="text-right min-w-[130px]">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                    <span>Completion</span>
                                                    <span className="text-slate-900 dark:text-white font-extrabold text-sm">{percent}%</span>
                                                </div>
                                                <div className="w-32 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            isCompleted 
                                                                ? 'bg-emerald-500' 
                                                                : percent > 50 
                                                                ? 'bg-blue-600' 
                                                                : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Expand/Collapse and Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setExpandedId(isExpanded ? null : report._id)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                                                        isExpanded 
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20' 
                                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>

                                                <button 
                                                    type="button"
                                                    onClick={() => handleDelete(report._id, report.projectId?.title)}
                                                    title="Delete this progress log"
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brief Summary Box */}
                                    <div className="mt-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        {report.title && (
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                                                {report.title}
                                            </h4>
                                        )}
                                        <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                            {report.description || 'No detailed operational notes recorded for this milestone.'}
                                        </p>
                                    </div>

                                    {/* Expanded Operational Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden border-t border-slate-100 dark:border-slate-800 mt-5 pt-5"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* Materials Box */}
                                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                            Materials Deployed
                                                        </span>
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                            {report.materialsUsed || 'No specific materials recorded for this shift.'}
                                                        </p>
                                                    </div>

                                                    {/* Blockers & Issues Box */}
                                                    <div className={`p-4 rounded-xl border space-y-1.5 ${
                                                        report.issues 
                                                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200' 
                                                            : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                                                    }`}>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                            {report.issues ? (
                                                                <>
                                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                                                    Site Issues & Blockers
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    No Active Blockers
                                                                </>
                                                            )}
                                                        </span>
                                                        <p className="text-xs font-semibold leading-relaxed">
                                                            {report.issues || 'Site operations executed without reported impediments.'}
                                                        </p>
                                                    </div>

                                                    {/* Next Phase Intent */}
                                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                            Next Phase Intent
                                                        </span>
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                            {report.nextPlan || 'Awaiting supervisor allocation for subsequent shift.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Photographic Site Evidence */}
                                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <ImageIcon className="w-4 h-4 text-blue-600" />
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                Site Evidence Photos ({report.photos?.length || 0})
                                                            </span>
                                                        </div>

                                                        {report.photos && report.photos.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2.5">
                                                                {report.photos.map((photo, pIdx) => (
                                                                    <div 
                                                                        key={pIdx} 
                                                                        onClick={() => setPreviewPhoto(photo.url)}
                                                                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-zoom-in relative group hover:border-blue-500 transition-all shadow-sm"
                                                                    >
                                                                        <img 
                                                                            src={getDirectImageUrl(photo.url)} 
                                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                                                                            alt="Site proof" 
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                            <Eye className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic">No field evidence photographs attached to this log entry.</p>
                                                        )}
                                                    </div>

                                                    {/* Admin Verification & Export Actions */}
                                                    <div className="flex items-center gap-2 pt-2 md:pt-0 self-end">
                                                        <button
                                                            type="button"
                                                            disabled={actionLoadingId === report._id}
                                                            onClick={() => handleToggleApproval(report)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                                                                report.isApproved
                                                                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                                            }`}
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>
                                                                {actionLoadingId === report._id 
                                                                    ? 'Updating...' 
                                                                    : report.isApproved 
                                                                    ? 'Revoke Verification' 
                                                                    : 'Approve & Verify'}
                                                            </span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => window.print()}
                                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                                                            title="Print this log report"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                            <span>Print</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Photo Lightbox Modal */}
            <AnimatePresence>
                {previewPhoto && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setPreviewPhoto(null)}
                    >
                        <div 
                            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setPreviewPhoto(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition shadow-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <img 
                                src={getDirectImageUrl(previewPhoto)} 
                                alt="Site Evidence Full"
                                className="max-w-full max-h-[82vh] object-contain rounded-xl"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminProgress;
