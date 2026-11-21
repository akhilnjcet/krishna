import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, CheckCircle, XCircle, Clock, Filter, 
    Search, Loader2, User, Landmark, Calendar,
    Banknote, Sparkle, BadgeCheck, AlertCircle,
    Check, ArrowRight, ShieldAlert, ShieldCheck, History,
    Edit3, ExternalLink, RefreshCw
} from 'lucide-react';

const AdminApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Standard Quick Remark Modal
    const [adminRemark, setAdminRemark] = useState('');
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    // Advanced Side-by-Side Review & Correction Modal
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [reconcileData, setReconcileData] = useState(null); // { application, comparisons: [...] }
    const [reconcileOverallStatus, setReconcileOverallStatus] = useState('approved');
    const [reconcileRemark, setReconcileRemark] = useState('');
    const [entryDecisions, setEntryDecisions] = useState([]);
    const [forceUnlockedApproval, setForceUnlockedApproval] = useState(false);
    const [reconcileSubmitting, setReconcileSubmitting] = useState(false);
    const [reconcileError, setReconcileError] = useState('');

    // Audit Trail Modal
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditApp, setAuditApp] = useState(null);

    const formatLabel = (val) => {
        if (!val || typeof val !== 'string') return 'General';
        return val.replace(/_/g, ' ');
    };

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/applications?status=${filterStatus}&type=${filterType}`);
            setApplications(Array.isArray(res.data) ? res.data : (res.data?.applications || []));
        } catch (err) {
            console.error("Failed to fetch applications:", err);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleUpdateStatus = async () => {
        if (!adminRemark && pendingAction === 'rejected') {
            return alert("Please provide a remark for rejection.");
        }
        try {
            await api.put(`/applications/${selectedApp._id}/status`, { 
                status: pendingAction, 
                adminRemark 
            });
            fetchApplications();
            setShowRemarkModal(false);
            setAdminRemark('');
            setSelectedApp(null);
            setPendingAction(null);
        } catch (err) {
            console.error("Status update error:", err);
            alert("Failed to update application status.");
        }
    };

    // Open Side-by-Side Review Modal
    const handleOpenReconcile = async (app) => {
        setSelectedApp(app);
        setShowReconcileModal(true);
        setReconcileLoading(true);
        setReconcileError('');
        setForceUnlockedApproval(false);
        setReconcileOverallStatus('approved');
        setReconcileRemark(app.adminRemark || '');

        try {
            const res = await api.get(`/applications/${app._id}/comparison`);
            setReconcileData(res.data);

            // Initialize entry decisions based on requested values
            const initialDecisions = (res.data?.comparisons || []).map((c, idx) => ({
                entryId: c?.entry?._id || `entry-${idx}`,
                date: c?.entry?.date || '',
                status: c?.entry?.status === 'rejected' ? 'rejected' : 'approved',
                approvedCheckIn: c?.entry?.approvedCheckIn || c?.entry?.requestedIn || '09:00',
                approvedCheckOut: c?.entry?.approvedCheckOut || c?.entry?.requestedOut || '18:00',
                approvedOvertimeHours: c?.entry?.approvedOvertimeHours !== undefined 
                    ? c?.entry?.approvedOvertimeHours 
                    : (c?.entry?.overtimeHours || 0),
                adminRemark: c?.entry?.adminRemark || ''
            }));
            setEntryDecisions(initialDecisions);
        } catch (err) {
            console.error("Failed to load comparison data:", err);
            setReconcileError("Could not retrieve ERP comparison data. Please try again.");
        } finally {
            setReconcileLoading(false);
        }
    };

    const handleEntryFieldChange = (index, field, value) => {
        setEntryDecisions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSetAllEntriesStatus = (status) => {
        setEntryDecisions(prev => prev.map(d => ({ ...d, status })));
        setReconcileOverallStatus(status);
    };

    const handleSubmitReconcile = async () => {
        setReconcileSubmitting(true);
        setReconcileError('');
        try {
            await api.put(`/applications/${selectedApp._id}/review`, {
                overallStatus: reconcileOverallStatus,
                adminRemark: reconcileRemark,
                entryDecisions,
                forceUnlockedApproval
            });
            await fetchApplications();
            setShowReconcileModal(false);
            setSelectedApp(null);
        } catch (err) {
            console.error("Failed to submit reconciliation decision:", err);
            setReconcileError(err.response?.data?.message || "Failed to process reconciliation. Please check inputs.");
        } finally {
            setReconcileSubmitting(false);
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'unlogged_overtime': return <Clock className="w-5 h-5 text-indigo-600" />;
            case 'attendance_issue': return <AlertCircle className="w-5 h-5 text-amber-600" />;
            case 'advance_salary': return <Banknote className="w-5 h-5 text-emerald-600" />;
            case 'leave': return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'emergency_leave': return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'salary_request': return <Landmark className="w-5 h-5 text-purple-600" />;
            default: return <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch((status || '').toLowerCase()) {
            case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'partially_approved': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
            case 'reviewed': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
            default: return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
        }
    };

    // Filter applications by search safely
    const filteredApplications = useMemo(() => {
        const list = Array.isArray(applications) ? applications : [];
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(app => {
            if (!app) return false;
            const staffName = (typeof app.staffId === 'object' ? app.staffId?.name : '') || app.senderName || '';
            const title = app.title || '';
            const description = app.description || '';
            const reason = app.reason || '';
            return staffName.toLowerCase().includes(q) ||
                   title.toLowerCase().includes(q) ||
                   description.toLowerCase().includes(q) ||
                   reason.toLowerCase().includes(q);
        });
    }, [applications, searchQuery]);

    // Check if any comparison item has a locked payroll month
    const anyLockedMonth = reconcileData?.comparisons?.some(c => c.payrollLocked);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
                <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Human Capital Registry</div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Staff Request Review Portal</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Review Unlogged Overtime, Attendance Disputes & Salary Advances</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchApplications}
                        className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 flex flex-wrap gap-2">
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 overflow-x-auto gap-1">
                        {[
                            { id: '', label: 'All Status' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'reviewed', label: 'Reviewed' },
                            { id: 'approved', label: 'Approved' },
                            { id: 'partially_approved', label: 'Partially Approved' },
                            { id: 'rejected', label: 'Rejected' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setFilterStatus(s.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterStatus === s.id ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by staff name or request..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold text-slate-800 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Request Type Pills */}
            <div className="flex bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
                {[
                    { id: '', label: 'All Types' },
                    { id: 'unlogged_overtime', label: '⏱️ Unlogged Overtime' },
                    { id: 'attendance_issue', label: '⚠️ Attendance Issues' },
                    { id: 'advance_salary', label: '💰 Advance Salary' },
                    { id: 'leave', label: '🏖️ Leave' },
                    { id: 'salary_request', label: '🏛️ Salary Request' }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setFilterType(t.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            filterType === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Main Content: Table & Mobile Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Mobile View */}
                <div className="block lg:hidden p-4 space-y-3">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">Synchronizing Requests...</p>
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold uppercase text-xs">
                            No matching applications found.
                        </div>
                    ) : (
                        filteredApplications.map((app) => {
                            const staffName = (typeof app.staffId === 'object' ? app.staffId?.name : '') || app.senderName || 'Staff Member';
                            const staffInitial = staffName.charAt(0).toUpperCase() || 'S';
                            const deptName = (typeof app.staffId === 'object' ? app.staffId?.department : '') || 'Staff Registry';
                            const entriesList = Array.isArray(app.entries) ? app.entries : [];
                            const totalOt = entriesList.reduce((acc, e) => acc + (Number(e?.overtimeHours) || 0), 0);

                            return (
                                <div key={`m-app-${app._id}`} className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl flex items-center justify-center font-black text-indigo-600 text-sm uppercase shrink-0">
                                                {staffInitial}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate">{staffName}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatLabel(app.type)}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 whitespace-nowrap ${getStatusColor(app.status)}`}>
                                            {formatLabel(app.status)}
                                        </span>
                                    </div>

                                    <div className="text-xs bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                        <p className="font-black text-slate-900 dark:text-white text-xs">{app.title || 'Untitled Request'}</p>
                                        {app.reason && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{app.reason}"</p>
                                        )}

                                        {entriesList.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                                    📅 {entriesList.length} Dates
                                                </span>
                                                {app.type === 'unlogged_overtime' && (
                                                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                                                        ⏱️ {totalOt} hrs OT
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {app.adminRemark && (
                                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                                                Remark: "{app.adminRemark}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                        {['unlogged_overtime', 'attendance_issue'].includes(app.type) || entriesList.length > 0 ? (
                                            <button
                                                onClick={() => handleOpenReconcile(app)}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-3 rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                                            >
                                                <Clock className="w-3.5 h-3.5" /> Side-by-Side Review ({entriesList.length || 1} Dates)
                                            </button>
                                        ) : (
                                            (app.status === 'pending' || app.status === 'reviewed') && (
                                                <>
                                                    <button 
                                                        onClick={() => { setSelectedApp(app); setPendingAction('approved'); setShowRemarkModal(true); }}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-2 rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        <BadgeCheck className="w-3.5 h-3.5" /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedApp(app); setPendingAction('rejected'); setShowRemarkModal(true); }}
                                                        className="flex-1 bg-slate-900 hover:bg-red-600 text-white py-2 px-2 rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="p-6">Staff & Identity</th>
                                <th className="p-6">Application Type</th>
                                <th className="p-6">Details & Requested Entries</th>
                                <th className="p-6">Status & Verdict</th>
                                <th className="p-6 text-right">Intervention / Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">Synchronizing Request Database...</p>
                                    </td>
                                </tr>
                            ) : filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-24 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                                        No authorized applications found in this sector.
                                    </td>
                                </tr>
                            ) : filteredApplications.map((app) => {
                                const staffName = (typeof app.staffId === 'object' ? app.staffId?.name : '') || app.senderName || 'Staff Member';
                                const staffInitial = staffName.charAt(0).toUpperCase() || 'S';
                                const deptName = (typeof app.staffId === 'object' ? app.staffId?.department : '') || 'Staff Registry';
                                const entriesList = Array.isArray(app.entries) ? app.entries : [];
                                const totalOt = entriesList.reduce((acc, e) => acc + (Number(e?.overtimeHours) || 0), 0);

                                return (
                                <tr key={app._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 dark:border-indigo-900 uppercase text-sm">
                                                {staffInitial}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white leading-tight text-sm uppercase tracking-tight">
                                                    {staffName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {deptName}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                                                {getTypeIcon(app.type)}
                                            </div>
                                            <span className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                                                {formatLabel(app.type)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="max-w-sm space-y-1">
                                            <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">{app.title || 'Untitled Request'}</p>
                                            {app.reason && (
                                                <p className="text-[11px] font-medium text-slate-400 italic line-clamp-1">"{app.reason}"</p>
                                            )}
                                            
                                            {/* Multi-date rows indicator */}
                                            {entriesList.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                                        📅 {entriesList.length} Date{entriesList.length > 1 ? 's' : ''}
                                                    </span>
                                                    {app.type === 'unlogged_overtime' && (
                                                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                            ⏱️ {totalOt} hrs OT
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        ({entriesList.slice(0, 2).map(e => e?.date || 'N/A').join(', ')}{entriesList.length > 2 ? '...' : ''})
                                                    </span>
                                                </div>
                                            ) : app.amount > 0 ? (
                                                <span className="text-xs font-black text-emerald-600">₹{Number(app.amount).toLocaleString()}</span>
                                            ) : app.startDate ? (
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border w-fit ${getStatusColor(app.status)}`}>
                                                {formatLabel(app.status)}
                                            </span>
                                            {app.adminRemark && (
                                                <span className="text-[10px] font-medium text-slate-400 italic line-clamp-1">
                                                    "{app.adminRemark}"
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        {['unlogged_overtime', 'attendance_issue'].includes(app.type) || (app.entries && app.entries.length > 0) ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenReconcile(app)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                                >
                                                    <Clock className="w-3.5 h-3.5" /> Reconcile & Review
                                                </button>
                                                {app.auditTrail && app.auditTrail.length > 0 && (
                                                    <button
                                                        onClick={() => { setAuditApp(app); setShowAuditModal(true); }}
                                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                                                        title="View Audit Trail"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            (app.status === 'pending' || app.status === 'reviewed') ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => { setSelectedApp(app); setPendingAction('approved'); setShowRemarkModal(true); }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                                                    >
                                                        <BadgeCheck className="w-3.5 h-3.5" /> Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedApp(app); setPendingAction('rejected'); setShowRemarkModal(true); }}
                                                        className="bg-slate-900 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Settled</span>
                                            )
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SIDE-BY-SIDE RECONCILIATION & CORRECTION MODAL */}
            <AnimatePresence>
                {showReconcileModal && selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 my-6 max-h-[92vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                        <Clock className="w-3.5 h-3.5" /> Attendance & Overtime Reconciliation Engine
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {selectedApp.title || 'Staff Request'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        Staff: <span className="text-slate-800 dark:text-slate-200">{(typeof selectedApp.staffId === 'object' ? selectedApp.staffId?.name : '') || selectedApp.senderName || 'Staff Member'}</span> | Type: <span className="text-indigo-600">{formatLabel(selectedApp.type)}</span>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowReconcileModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition self-end sm:self-auto"
                                >
                                    ✕
                                </button>
                            </div>

                            {reconcileError && (
                                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {reconcileError}
                                </div>
                            )}

                            {reconcileLoading ? (
                                <div className="p-20 text-center">
                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        Fetching recorded logs, biometric timestamps & payroll cycle...
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-6">
                                    {/* Quick Global Action Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Fast Action:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleSetAllEntriesStatus('approved')}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                                            >
                                                Approve All Rows
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSetAllEntriesStatus('rejected')}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                                            >
                                                Reject All Rows
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-bold text-slate-400 uppercase text-[10px]">Overall Decision:</span>
                                            <select
                                                value={reconcileOverallStatus}
                                                onChange={(e) => setReconcileOverallStatus(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                            >
                                                <option value="approved">Approved</option>
                                                <option value="partially_approved">Partially Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Side-by-Side Comparison List */}
                                    <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                                        {(reconcileData?.comparisons || []).map((item, idx) => {
                                            const decision = entryDecisions[idx] || {};
                                            return (
                                                <div 
                                                    key={item?.entry?._id || idx}
                                                    className={`p-4 rounded-3xl border transition-all ${
                                                        decision.status === 'approved' 
                                                        ? 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/60 shadow-sm' 
                                                        : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
                                                    }`}
                                                >
                                                    {/* Header for this date row */}
                                                    <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-900 dark:text-white text-sm">
                                                                📅 {item?.entry?.date || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                                                                {formatLabel(item?.entry?.issueType)}
                                                            </span>
                                                            {item?.payrollLocked && (
                                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md flex items-center gap-1">
                                                                    <ShieldAlert className="w-3 h-3" /> Payroll Finalized (PAID)
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Status toggle for this row */}
                                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEntryFieldChange(idx, 'status', 'approved')}
                                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                                                                    decision.status === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                                                                }`}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEntryFieldChange(idx, 'status', 'rejected')}
                                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                                                                    decision.status === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
                                                                }`}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Three Column Comparison Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {/* Column 1: Staff Requested */}
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                                                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                                <User className="w-3 h-3" /> Staff Requested
                                                            </div>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                                In: <span className="font-mono text-indigo-600">{item?.entry?.requestedIn || '--'}</span> | Out: <span className="font-mono text-indigo-600">{item?.entry?.requestedOut || '--'}</span>
                                                            </div>
                                                            {Number(item?.entry?.overtimeHours) > 0 && (
                                                                <div className="font-black text-emerald-600">
                                                                    Claimed OT: {item?.entry?.overtimeHours} hrs
                                                                </div>
                                                            )}
                                                            {item?.entry?.explanation && (
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                                                    "{item?.entry?.explanation}"
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Column 2: Live ERP Recorded */}
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                                                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                                <Landmark className="w-3 h-3" /> Live Recorded in ERP
                                                            </div>
                                                            {item.recordedAttendance ? (
                                                                <div>
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                                        Daily: <span className="font-bold text-emerald-600">{item.recordedAttendance.status}</span>
                                                                        {item.recordedAttendance.checkIn && ` (${item.recordedAttendance.checkIn} - ${item.recordedAttendance.checkOut || 'Missing'})`}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400">
                                                                        Worked: {item.recordedAttendance.workedHours || 0} hrs | Shift: {item.recordedAttendance.shiftName || 'Standard'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-rose-500 font-bold">
                                                                    ❌ No Daily Attendance Record Logged
                                                                </div>
                                                            )}

                                                            {item.recordedOvertime ? (
                                                                <div className="text-[11px] font-bold text-indigo-600">
                                                                    Existing OT: {item.recordedOvertime.hours} hrs ({item.recordedOvertime.status})
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-slate-400">No OT Record</div>
                                                            )}

                                                            {item.rawPunchesCount > 0 && (
                                                                <div className="text-[10px] font-bold text-slate-500">
                                                                    Biometric raw punches: {item.rawPunchesCount}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Column 3: Admin Approved Values & Corrections */}
                                                        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-2 text-xs">
                                                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                                                <Edit3 className="w-3 h-3" /> Approved Values (Apply)
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[9px] font-black uppercase text-slate-400">Appr. In</label>
                                                                    <input 
                                                                        type="time"
                                                                        value={decision.approvedCheckIn || ''}
                                                                        onChange={(e) => handleEntryFieldChange(idx, 'approvedCheckIn', e.target.value)}
                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black uppercase text-slate-400">Appr. Out</label>
                                                                    <input 
                                                                        type="time"
                                                                        value={decision.approvedCheckOut || ''}
                                                                        onChange={(e) => handleEntryFieldChange(idx, 'approvedCheckOut', e.target.value)}
                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="text-[9px] font-black uppercase text-slate-400">Appr. OT Hours</label>
                                                                <input 
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    value={decision.approvedOvertimeHours !== undefined ? decision.approvedOvertimeHours : ''}
                                                                    onChange={(e) => handleEntryFieldChange(idx, 'approvedOvertimeHours', e.target.value)}
                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold"
                                                                />
                                                            </div>

                                                            <div>
                                                                <input 
                                                                    type="text"
                                                                    placeholder="Row remark (optional)..."
                                                                    value={decision.adminRemark || ''}
                                                                    onChange={(e) => handleEntryFieldChange(idx, 'adminRemark', e.target.value)}
                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Overall Remark */}
                                    <div>
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                            Admin Decision Feedback / Justification
                                        </label>
                                        <textarea
                                            rows="2"
                                            value={reconcileRemark}
                                            onChange={(e) => setReconcileRemark(e.target.value)}
                                            placeholder="Provide reason for this reconciliation decision..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-medium outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Locked Payroll Warning */}
                                    {anyLockedMonth && (
                                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                                Finalized Payroll Period Detected
                                            </div>
                                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                One or more dates in this request belong to a monthly cycle whose salary has already been paid out. Applying corrections will recalculate earned overtime and adjust balances for the next cycle.
                                            </p>
                                            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={forceUnlockedApproval}
                                                    onChange={(e) => setForceUnlockedApproval(e.target.checked)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    I confirm authorization to modify attendance in finalized payroll cycle
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowReconcileModal(false)}
                                            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-wider transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={reconcileSubmitting || (anyLockedMonth && !forceUnlockedApproval && reconcileOverallStatus !== 'rejected')}
                                            onClick={handleSubmitReconcile}
                                            className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {reconcileSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Applying Decisions...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" /> Apply Corrections & Save Decision
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QUICK REMARK MODAL (For simple Advance / Leave requests) */}
            <AnimatePresence>
                {showRemarkModal && selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl sm:rounded-[3rem] shadow-2xl p-5 sm:p-8 border-4 border-indigo-50 dark:border-indigo-950/60 max-h-[92dvh] overflow-y-auto"
                        >
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 italic">Official Decision</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-6">
                                Application: {selectedApp.title || 'Staff Request'} | Action: <span className={pendingAction === 'approved' ? 'text-emerald-500' : 'text-rose-500'}>{pendingAction}</span>
                            </p>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Admin Remarks</label>
                                    <textarea 
                                        rows="3"
                                        value={adminRemark}
                                        onChange={(e) => setAdminRemark(e.target.value)}
                                        placeholder="Enter justification or remarks..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 focus:border-indigo-600 outline-none text-xs font-medium text-slate-700 dark:text-slate-300"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => { setShowRemarkModal(false); setAdminRemark(''); }}
                                        className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUpdateStatus}
                                        className={`flex-[2] py-3 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition active:scale-95 ${
                                            pendingAction === 'approved' ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-rose-600'
                                        }`}
                                    >
                                        Confirm Decision
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AUDIT TRAIL MODAL */}
            <AnimatePresence>
                {showAuditModal && auditApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                                <h3 className="font-black text-slate-900 dark:text-white uppercase text-base flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-600" /> Immutable Audit Trail
                                </h3>
                                <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>

                            <div className="space-y-3">
                                {(auditApp.auditTrail || []).map((trail, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-slate-800 dark:text-slate-200 uppercase">{trail.action}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(trail.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400">
                                            By: <span className="font-bold">{trail.performedByName || 'Admin'}</span>
                                        </div>
                                        {trail.details && (
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{trail.details}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminApplications;
