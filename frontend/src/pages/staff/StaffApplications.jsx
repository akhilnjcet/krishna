import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, Clock, CheckCircle2, XCircle, 
    ChevronRight, Calendar, Wallet, History,
    Search, Filter, Plus, Info, AlertCircle,
    Trash2, Eye, ShieldCheck, ArrowRight, UserCheck, Sparkles, Check
} from 'lucide-react';

const StaffApplications = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAppForView, setSelectedAppForView] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Form state
    const [formType, setFormType] = useState('unlogged_overtime');
    const [formTitle, setFormTitle] = useState('');
    const [formReason, setFormReason] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');

    // Multi-date rows for unlogged_overtime & attendance_issue
    const [dateRows, setDateRows] = useState([
        {
            date: new Date().toISOString().split('T')[0],
            requestedIn: '09:00',
            requestedOut: '19:30',
            overtimeHours: 2,
            issueType: 'unlogged_overtime',
            explanation: ''
        }
    ]);

    // Check for query params (e.g. ?type=unlogged_overtime&action=new)
    useEffect(() => {
        const action = searchParams.get('action');
        const typeParam = searchParams.get('type');
        if (action === 'new') {
            if (typeParam && ['unlogged_overtime', 'attendance_issue', 'leave', 'advance_salary'].includes(typeParam)) {
                setFormType(typeParam);
                if (typeParam === 'attendance_issue') {
                    setDateRows([{
                        date: new Date().toISOString().split('T')[0],
                        requestedIn: '09:00',
                        requestedOut: '18:00',
                        overtimeHours: 0,
                        issueType: 'missing_punch_in',
                        explanation: ''
                    }]);
                }
            }
            setIsCreateModalOpen(true);
        }
        if (typeParam && !action) {
            setFilterType(typeParam);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const res = await api.get('/applications');
            setApplications(res.data);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyles = (status) => {
        switch(status?.toLowerCase()) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'partially_approved': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'reviewed': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'unlogged_overtime': return <Clock className="w-5 h-5 text-indigo-600" />;
            case 'attendance_issue': return <AlertCircle className="w-5 h-5 text-amber-600" />;
            case 'leave': return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'advance_salary': return <Wallet className="w-5 h-5 text-emerald-600" />;
            default: return <FileText className="w-5 h-5 text-slate-600" />;
        }
    };

    const handleAddDateRow = () => {
        setDateRows(prev => [
            ...prev,
            {
                date: new Date().toISOString().split('T')[0],
                requestedIn: formType === 'unlogged_overtime' ? '09:00' : '09:00',
                requestedOut: formType === 'unlogged_overtime' ? '20:00' : '18:00',
                overtimeHours: formType === 'unlogged_overtime' ? 2 : 0,
                issueType: formType === 'unlogged_overtime' ? 'unlogged_overtime' : 'missing_punch_in',
                explanation: ''
            }
        ]);
    };

    const handleRemoveDateRow = (index) => {
        if (dateRows.length <= 1) return;
        setDateRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleDateRowChange = (index, field, value) => {
        setDateRows(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // Pre-calculate summary of date rows
    const totalRequestedOtHours = dateRows.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0);
    const hasDuplicateDates = new Set(dateRows.map(r => r.date)).size !== dateRows.length;

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (['unlogged_overtime', 'attendance_issue'].includes(formType)) {
            if (dateRows.length === 0) {
                setErrorMsg('Please add at least one date row.');
                return;
            }
            if (hasDuplicateDates) {
                setErrorMsg('Duplicate dates detected! Please consolidate entries for the same date into one row.');
                return;
            }
            for (let i = 0; i < dateRows.length; i++) {
                const r = dateRows[i];
                if (!r.date) {
                    setErrorMsg(`Row ${i + 1} has an empty date.`);
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                type: formType,
                title: formTitle || (formType === 'unlogged_overtime' 
                    ? `Unlogged Overtime Claim (${dateRows.length} Dates)` 
                    : formType === 'attendance_issue' 
                    ? `Attendance Issue Correction (${dateRows.length} Dates)`
                    : formType === 'leave'
                    ? `Leave Request (${formStartDate} to ${formEndDate})`
                    : `Advance Salary Request: ₹${formAmount}`),
                reason: formReason,
                amount: formType === 'advance_salary' ? parseFloat(formAmount) || 0 : 0,
                startDate: formType === 'leave' ? formStartDate : undefined,
                endDate: formType === 'leave' ? formEndDate : undefined,
                entries: ['unlogged_overtime', 'attendance_issue'].includes(formType) ? dateRows : []
            };

            await api.post('/applications', payload);
            await fetchApplications();
            setIsCreateModalOpen(false);
            // Reset form
            setFormTitle('');
            setFormReason('');
            setFormAmount('');
            setFormStartDate('');
            setFormEndDate('');
            setDateRows([{
                date: new Date().toISOString().split('T')[0],
                requestedIn: '09:00',
                requestedOut: '19:30',
                overtimeHours: 2,
                issueType: 'unlogged_overtime',
                explanation: ''
            }]);
        } catch (err) {
            console.error('Submission failed:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to submit application. Please check all fields.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = applications.filter(app => {
        const matchesType = filterType === 'all' || app.type === filterType;
        const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (app.reason && app.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
                             (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesType && matchesSearch;
    });

    return (
        <div className="mobile-p-reset space-y-8 animate-in fade-in duration-500 force-full-width">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">
                        <Sparkles className="w-3.5 h-3.5" /> Staff Self-Service Protocol
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        My Applications & Requests
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Submit and track unlogged overtime, attendance dispute corrections, advance salary, and leave requests.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setErrorMsg('');
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    New Request
                </button>
            </header>

            {/* Application Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 flex flex-wrap gap-2">
                    {[
                        { id: 'all', label: 'All Requests' },
                        { id: 'unlogged_overtime', label: 'Unlogged Overtime' },
                        { id: 'attendance_issue', label: 'Attendance Issues' },
                        { id: 'advance_salary', label: 'Advance Salary' },
                        { id: 'leave', label: 'Leave' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterType(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                filterType === tab.id 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-200 dark:shadow-none' 
                                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="md:col-span-4 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search requests by title or notes..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-xs font-medium"
                    />
                </div>
            </div>

            {/* Application Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4 mobile-table-scroll">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 opacity-60">
                            <Clock className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Registry...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-slate-600 dark:text-slate-300 font-black text-sm uppercase">No requests found</p>
                            <p className="text-slate-400 text-xs mt-1">Submit a request to log unrecorded overtime or fix attendance timestamps.</p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
                            >
                                Submit First Request
                            </button>
                        </div>
                    ) : (
                        filtered.map((app, index) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                key={app._id}
                                onClick={() => setSelectedAppForView(app)}
                                className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0">
                                        {getTypeIcon(app.type)}
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm">
                                                {app.title}
                                            </h3>
                                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                #{app._id.slice(-6)}
                                            </span>
                                        </div>
                                        
                                        {app.reason && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                                {app.reason}
                                            </p>
                                        )}

                                        {/* Multi-date summary badges */}
                                        {app.entries && app.entries.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                                    📅 {app.entries.length} Date{app.entries.length > 1 ? 's' : ''}
                                                </span>
                                                {app.type === 'unlogged_overtime' && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                        ⏱️ {app.entries.reduce((acc, e) => acc + (e.overtimeHours || 0), 0)} hrs Total OT
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    ({app.entries.slice(0, 2).map(e => e.date).join(', ')}{app.entries.length > 2 ? '...' : ''})
                                                </span>
                                            </div>
                                        )}

                                        {app.amount > 0 && (
                                            <div className="text-xs font-black text-emerald-600">
                                                Requested: ₹{app.amount.toLocaleString()}
                                            </div>
                                        )}

                                        {app.adminRemark && (
                                            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 italic bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                                Admin Note: "{app.adminRemark}"
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <History className="w-3 h-3" /> Submitted: {new Date(app.createdAt).toLocaleDateString()}
                                            </span>
                                            {app.reviewedAt && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <ShieldCheck className="w-3 h-3" /> Reviewed: {new Date(app.reviewedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest ${getStatusStyles(app.status)}`}>
                                        {app.status.replace('_', ' ')}
                                    </span>
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-all">
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Right Info Section */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white relative overflow-hidden border border-slate-800 shadow-xl">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 filter blur-[80px] opacity-25"></div>
                        <h4 className="text-base font-black mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Info className="w-4 h-4 text-blue-400" /> How Requests Work
                        </h4>
                        <div className="space-y-4 relative z-10 text-xs">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <p className="font-black text-amber-400 uppercase text-[10px] tracking-wider mb-1">⏱️ Unlogged Overtime</p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    Did extra hours on site or factory not tracked automatically? Add multiple dates with your in/out times and claim overtime pay.
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <p className="font-black text-indigo-400 uppercase text-[10px] tracking-wider mb-1">⚠️ Attendance Issues</p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    Biometric scanner didn't read your face/finger? Missed check-out? Submit requested times for quick admin reconciliation.
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <p className="font-black text-emerald-400 uppercase text-[10px] tracking-wider mb-1">⚡ Automatic Synchronization</p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    Once approved by management, your timesheet, daily calendar, and salary calculations update instantly.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-slate-800/60 rounded-[2.5rem] p-6 border border-blue-100 dark:border-slate-700">
                        <h4 className="text-blue-900 dark:text-blue-300 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600" /> Operational Policy
                        </h4>
                        <p className="text-blue-800 dark:text-slate-300 text-xs leading-relaxed">
                            Requests are reconciled against factory biometric raw logs and project logs. For urgent concerns, contact the shift supervisor.
                        </p>
                    </div>
                </div>
            </div>

            {/* CREATE REQUEST MODAL */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 my-6 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">New Submission</span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Submit Staff Request
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleSubmitRequest} className="mt-5 space-y-5">
                                {/* Type Selector Pills */}
                                <div>
                                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                                        Select Request Type:
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { id: 'unlogged_overtime', label: 'Overtime Claim', icon: '⏱️' },
                                            { id: 'attendance_issue', label: 'Attendance Issue', icon: '⚠️' },
                                            { id: 'advance_salary', label: 'Advance Salary', icon: '💰' },
                                            { id: 'leave', label: 'Leave Request', icon: '🏖️' }
                                        ].map(t => (
                                            <button
                                                type="button"
                                                key={t.id}
                                                onClick={() => {
                                                    setFormType(t.id);
                                                    setErrorMsg('');
                                                }}
                                                className={`p-3 rounded-2xl border text-center transition-all ${
                                                    formType === t.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                }`}
                                            >
                                                <div className="text-lg mb-1">{t.icon}</div>
                                                <div className="text-[10px] font-black uppercase tracking-wider">{t.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Common Fields: Title & Reason */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                                            Request Heading / Title
                                        </label>
                                        <input 
                                            type="text"
                                            value={formTitle}
                                            onChange={(e) => setFormTitle(e.target.value)}
                                            placeholder={formType === 'unlogged_overtime' ? 'e.g. Fabrication Night Shift Overtime' : formType === 'attendance_issue' ? 'e.g. Biometric Scanner Machine Error' : 'Title'}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                                            Explanation / Note to Management
                                        </label>
                                        <textarea 
                                            rows="2"
                                            value={formReason}
                                            onChange={(e) => setFormReason(e.target.value)}
                                            placeholder="Provide context or explanation for this request..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* MULTI-DATE ROWS (FOR UNLOGGED OVERTIME & ATTENDANCE ISSUE) */}
                                {['unlogged_overtime', 'attendance_issue'].includes(formType) && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-indigo-600" />
                                                Dates & Requested Times ({dateRows.length})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleAddDateRow}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-100 transition"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Date
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                            {dateRows.map((row, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 relative"
                                                >
                                                    <div className="flex items-center justify-between text-[11px] font-black text-slate-500 pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
                                                        <span>Entry #{idx + 1}</span>
                                                        {dateRows.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveDateRow(idx)}
                                                                className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-slate-400">Date *</label>
                                                            <input 
                                                                type="date"
                                                                required
                                                                value={row.date}
                                                                onChange={(e) => handleDateRowChange(idx, 'date', e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-slate-400">Requested In Time</label>
                                                            <input 
                                                                type="time"
                                                                value={row.requestedIn}
                                                                onChange={(e) => handleDateRowChange(idx, 'requestedIn', e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-slate-400">Requested Out Time</label>
                                                            <input 
                                                                type="time"
                                                                value={row.requestedOut}
                                                                onChange={(e) => handleDateRowChange(idx, 'requestedOut', e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-slate-400">
                                                                {formType === 'unlogged_overtime' ? 'Claimed Overtime Hours *' : 'Extra Overtime (if any)'}
                                                            </label>
                                                            <input 
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                value={row.overtimeHours}
                                                                onChange={(e) => handleDateRowChange(idx, 'overtimeHours', e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase text-slate-400">Issue Category</label>
                                                            <select
                                                                value={row.issueType}
                                                                onChange={(e) => handleDateRowChange(idx, 'issueType', e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                                            >
                                                                <option value="unlogged_overtime">Unlogged Overtime</option>
                                                                <option value="missing_punch_in">Missing Punch In</option>
                                                                <option value="missing_punch_out">Missing Punch Out</option>
                                                                <option value="biometric_failure">Biometric Scanner Issue</option>
                                                                <option value="site_duty">Site / Field Duty</option>
                                                                <option value="shift_discrepancy">Shift Discrepancy</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <input 
                                                            type="text"
                                                            value={row.explanation}
                                                            onChange={(e) => handleDateRowChange(idx, 'explanation', e.target.value)}
                                                            placeholder="Specific note for this date (e.g. Worked at Client site until 9 PM)..."
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pre-submission Review Summary Card */}
                                        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                                            <div>
                                                <span className="font-black text-indigo-900 dark:text-indigo-300 uppercase text-[10px] tracking-wider block">
                                                    Submission Summary
                                                </span>
                                                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                                                    {dateRows.length} date entry/entries requested
                                                </span>
                                            </div>
                                            {formType === 'unlogged_overtime' && (
                                                <div className="text-right">
                                                    <span className="font-black text-indigo-900 dark:text-indigo-300 uppercase text-[10px] tracking-wider block">
                                                        Total Claimed OT
                                                    </span>
                                                    <span className="font-black text-indigo-600 text-sm">
                                                        {totalRequestedOtHours} Hours
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Specific fields for Leave */}
                                {formType === 'leave' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Start Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                value={formStartDate}
                                                onChange={(e) => setFormStartDate(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">End Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                value={formEndDate}
                                                onChange={(e) => setFormEndDate(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Specific fields for Advance Salary */}
                                {formType === 'advance_salary' && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Advance Amount (₹)</label>
                                        <input 
                                            type="number"
                                            required
                                            min="100"
                                            value={formAmount}
                                            onChange={(e) => setFormAmount(e.target.value)}
                                            placeholder="Enter requested amount..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting || hasDuplicateDates}
                                        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Clock className="w-4 h-4 animate-spin" /> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" /> Submit Request
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* VIEW APPLICATION DETAILS & AUDIT TRAIL MODAL */}
            <AnimatePresence>
                {selectedAppForView && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 my-6 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Application Details</span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {selectedAppForView.title}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedAppForView(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mt-5 space-y-4 text-xs">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Type</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedAppForView.type.replace('_', ' ')}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Status</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border inline-block ${getStatusStyles(selectedAppForView.status)}`}>
                                            {selectedAppForView.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Submitted On</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedAppForView.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Reviewed By</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAppForView.reviewedByName || selectedAppForView.reviewedBy?.name || 'Pending'}</span>
                                    </div>
                                </div>

                                {selectedAppForView.reason && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Staff Note</span>
                                        <p className="text-slate-700 dark:text-slate-300 font-medium">{selectedAppForView.reason}</p>
                                    </div>
                                )}

                                {selectedAppForView.adminRemark && (
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 block mb-1">Official Admin Verdict</span>
                                        <p className="text-indigo-900 dark:text-indigo-300 font-bold">{selectedAppForView.adminRemark}</p>
                                    </div>
                                )}

                                {/* Multi-date rows display */}
                                {selectedAppForView.entries && selectedAppForView.entries.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                            Detailed Dates Breakdown ({selectedAppForView.entries.length})
                                        </span>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {selectedAppForView.entries.map((entry, i) => (
                                                <div key={i} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-900 dark:text-white text-xs">{entry.date}</span>
                                                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                                                {entry.issueType?.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                            Req Times: <span className="font-bold">{entry.requestedIn || '--'} to {entry.requestedOut || '--'}</span>
                                                            {entry.overtimeHours > 0 && <span> | Req OT: <span className="font-black text-indigo-600">{entry.overtimeHours} hrs</span></span>}
                                                        </div>
                                                        {entry.explanation && (
                                                            <p className="text-[10px] text-slate-400 italic mt-0.5">"{entry.explanation}"</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                            entry.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            entry.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {entry.status}
                                                        </span>
                                                        {entry.approvedOvertimeHours !== undefined && (
                                                            <div className="text-[10px] font-black text-emerald-600 mt-1">
                                                                Approved OT: {entry.approvedOvertimeHours} hrs
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Audit Trail */}
                                {selectedAppForView.auditTrail && selectedAppForView.auditTrail.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                            Immutable Audit Trail ({selectedAppForView.auditTrail.length})
                                        </span>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                            {selectedAppForView.auditTrail.map((trail, idx) => (
                                                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[10px] flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{trail.action}</span>
                                                        <span className="text-slate-400 ml-2">by {trail.performedByName || 'Admin'}</span>
                                                        {trail.details && <p className="text-slate-500 italic mt-0.5">"{trail.details}"</p>}
                                                    </div>
                                                    <span className="text-slate-400 font-mono shrink-0 ml-2">
                                                        {new Date(trail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => setSelectedAppForView(null)}
                                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffApplications;
