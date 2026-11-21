import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import { 
    ArrowLeft, Upload, Loader2, CheckCircle, 
    AlertCircle, Image as ImageIcon, Plus, Trash2, X,
    ChevronRight, ClipboardList, PenTool, BarChart3, MapPin,
    Calendar, Clock, Send, AlertTriangle, Play, CheckCircle2,
    Search, RotateCcw, Activity, Layers, Sparkles, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffProgress = () => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Forms
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        projectId: '',
        title: '',
        description: '',
        progressPercentage: 0,
        status: 'In Progress',
        materialsUsed: '',
        issues: '',
        nextPlan: '',
        notes: ''
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    // Status / Delay Form
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [selectedStatusProject, setSelectedStatusProject] = useState(null);
    const [statusForm, setStatusForm] = useState({
        status: 'In Progress',
        reason: 'Tool Maintenance',
        customReason: '',
        remarks: '',
        expectedResumeDate: ''
    });

    // Timeline Form
    const [showTimelineForm, setShowTimelineForm] = useState(false);
    const [selectedTimelineProject, setSelectedTimelineProject] = useState(null);
    const [timelineDraft, setTimelineDraft] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('action') === 'status' && projects.length > 0) {
            setSelectedStatusProject(null);
            setStatusForm({
                status: 'Delayed',
                reason: 'Tool Maintenance',
                customReason: '',
                remarks: '',
                expectedResumeDate: ''
            });
            setShowStatusForm(true);
            navigate('/staff/progress', { replace: true });
        }
    }, [location.search, projects, navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects');
            setProjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 5) {
            alert('Maximum 5 photos allowed per update');
            return;
        }

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews([...previews, ...newPreviews]);
        setSelectedFiles([...selectedFiles, ...files]);
    };

    const removeFile = (index) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...previews];
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.projectId) return alert('Please select a project');
        
        setSubmitting(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        selectedFiles.forEach(file => data.append('photos', file));

        try {
            await api.post('/progress/create', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Progress report submitted successfully!');
            setShowForm(false);
            setFormData({
                projectId: '',
                title: '',
                description: '',
                progressPercentage: 0,
                status: 'In Progress',
                materialsUsed: '',
                issues: '',
                nextPlan: '',
                notes: ''
            });
            setSelectedFiles([]);
            setPreviews([]);
            fetchData();
        } catch (err) {
            alert('Failed to submit progress update');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestartProject = async (projectId) => {
        if (!window.confirm("Are you sure you want to restart work on this project?")) return;
        setSubmitting(true);
        try {
            await api.put(`/projects/${projectId}/status`, { status: 'Restarted' });
            alert("Project restarted successfully! Admin has been notified.");
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to restart project.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStatusProject) return;

        setSubmitting(true);
        const finalReason = statusForm.reason === 'Other (Custom Reason)' ? statusForm.customReason : statusForm.reason;

        try {
            await api.put(`/projects/${selectedStatusProject._id}/status`, {
                status: statusForm.status,
                reason: ['Delayed', 'Stopped'].includes(statusForm.status) ? finalReason : undefined,
                remarks: ['Delayed', 'Stopped'].includes(statusForm.status) ? statusForm.remarks : undefined,
                expectedResumeDate: ['Delayed', 'Stopped'].includes(statusForm.status) && statusForm.expectedResumeDate ? statusForm.expectedResumeDate : undefined
            });
            alert("Project status updated successfully!");
            setShowStatusForm(false);
            setSelectedStatusProject(null);
            setStatusForm({
                status: 'In Progress',
                reason: 'Tool Maintenance',
                customReason: '',
                remarks: '',
                expectedResumeDate: ''
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to update project status.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenTimelineModal = (project) => {
        setSelectedTimelineProject(project);
        const initialTimeline = project.timeline ? project.timeline.map(m => ({
            title: m.title || '',
            description: m.description || '',
            date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
            status: m.status || 'Pending'
        })) : [];
        setTimelineDraft(initialTimeline);
        setShowTimelineForm(true);
    };

    const handleAddMilestone = () => {
        setTimelineDraft([...timelineDraft, { title: '', description: '', date: '', status: 'Pending' }]);
    };

    const handleRemoveMilestone = (idx) => {
        setTimelineDraft(timelineDraft.filter((_, i) => i !== idx));
    };

    const handleMilestoneChange = (idx, field, value) => {
        const updated = [...timelineDraft];
        updated[idx][field] = value;
        setTimelineDraft(updated);
    };

    const handleSubmitTimeline = async (e) => {
        e.preventDefault();
        if (timelineDraft.length === 0) return alert("Please add at least one milestone to the timeline.");
        
        const isValid = timelineDraft.every(m => m.title.trim() !== '' && m.date !== '');
        if (!isValid) return alert("All milestones must have a title and a date.");

        setSubmitting(true);
        try {
            await api.put(`/projects/${selectedTimelineProject._id}/propose-timeline`, {
                timeline: timelineDraft
            });
            alert("Timeline proposed successfully! Submitted to Admin for review.");
            setShowTimelineForm(false);
            setSelectedTimelineProject(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to submit timeline proposal.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter & Search
    const filteredProjects = useMemo(() => {
        let list = [...projects];

        if (statusFilter !== 'all') {
            list = list.filter(p => (p.status || '').toLowerCase() === statusFilter.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(p => {
                const title = (p.title || '').toLowerCase();
                const loc = (p.location || '').toLowerCase();
                const service = (p.serviceType || '').toLowerCase();
                const status = (p.status || '').toLowerCase();
                return title.includes(q) || loc.includes(q) || service.includes(q) || status.includes(q);
            });
        }

        return list;
    }, [projects, statusFilter, searchQuery]);

    const stats = useMemo(() => {
        const total = projects.length;
        const inProgress = projects.filter(p => ['in progress', 'active'].includes((p.status || '').toLowerCase())).length;
        const delayedOrStopped = projects.filter(p => ['delayed', 'stopped'].includes((p.status || '').toLowerCase())).length;
        const completed = projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
        return { total, inProgress, delayedOrStopped, completed };
    }, [projects]);

    if (!isAuthenticated || user?.role !== 'staff') {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen py-6 md:py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 dark:text-slate-100 transition-colors">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Back Link */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/staff')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Staff Dashboard</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full text-[11px] font-semibold text-slate-500 dark:text-slate-400 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Field Logistics Portal</span>
                    </div>
                </div>

                {/* Hero Header Card */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800"
                >
                    {/* Decorative ambient background glows */}
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2 max-w-xl">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                                <Activity className="w-3 h-3 text-blue-400" />
                                Operational Reporting v2.0
                            </span>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                                Project Status & Delay Management
                            </h1>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
                                Submit live work progress, log equipment breakdowns or material stops, and propose milestones to Admin in real time.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setSelectedStatusProject(null);
                                    setStatusForm({
                                        status: 'Delayed',
                                        reason: 'Tool Maintenance',
                                        customReason: '',
                                        remarks: '',
                                        expectedResumeDate: ''
                                    });
                                    setShowStatusForm(true);
                                }}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 border border-rose-500/30 transition-all"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                <span>Report Delay / Stop</span>
                            </motion.button>

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowForm(true)}
                                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 border border-blue-400/30 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Post Progress Log</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* KPI Metrics Widgets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div 
                        onClick={() => setStatusFilter('all')}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm ${
                            statusFilter === 'all' 
                                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span>Assigned Projects</span>
                            <Layers className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{stats.total}</p>
                        <span className="text-[10px] font-bold text-slate-400">Total in queue</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('in progress')}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm ${
                            statusFilter === 'in progress' 
                                ? 'border-blue-500 ring-2 ring-blue-500/20' 
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <span>In Progress</span>
                            <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{stats.inProgress}</p>
                        <span className="text-[10px] font-bold text-blue-500/70">Actively worked on</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('delayed')}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm ${
                            statusFilter === 'delayed' 
                                ? 'border-rose-500 ring-2 ring-rose-500/20' 
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <span>Delayed / Stopped</span>
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">{stats.delayedOrStopped}</p>
                        <span className="text-[10px] font-bold text-rose-500/70">Impediment reported</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('completed')}
                        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all cursor-pointer shadow-sm ${
                            statusFilter === 'completed' 
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span>Completed</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{stats.completed}</p>
                        <span className="text-[10px] font-bold text-emerald-500/70">Finished jobs</span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by project name, location, or service..."
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

                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'in progress', label: 'In Progress' },
                            { id: 'delayed', label: 'Delayed' },
                            { id: 'stopped', label: 'Stopped' },
                            { id: 'completed', label: 'Completed' }
                        ].map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setStatusFilter(f.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    statusFilter === f.id
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Project List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">Loading assigned projects...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-3">
                            <ClipboardList className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No projects found</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {searchQuery ? `No matching project found for "${searchQuery}".` : 'No projects found under this filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredProjects.map((project, idx) => {
                            const statusLower = (project.status || '').toLowerCase();
                            const isDelayed = statusLower === 'delayed';
                            const isStopped = statusLower === 'stopped';
                            const isCompleted = statusLower === 'completed';
                            const isInProgress = !isDelayed && !isStopped && !isCompleted;
                            const progressNum = Math.min(100, Math.max(0, Number(project.progress) || 0));

                            return (
                                <motion.div 
                                    key={project._id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm hover:shadow-md hover:border-blue-400/40 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
                                >
                                    {/* Left: Project Details */}
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Status Pill */}
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                                                isCompleted
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                                    : isStopped
                                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                                    : isDelayed
                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    isCompleted ? 'bg-emerald-500' : isStopped ? 'bg-rose-500' : isDelayed ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'
                                                }`} />
                                                {project.status || 'Active'}
                                            </span>

                                            {project.serviceType && (
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                    {project.serviceType}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                            {project.title}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {project.location || 'Site Location N/A'}
                                            </span>
                                            {project.updateNotes && (
                                                <span className="truncate max-w-xs text-slate-400 italic">
                                                    "{project.updateNotes}"
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Progress Gauge */}
                                    <div className="w-full lg:w-56 space-y-1.5">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-slate-500 dark:text-slate-400">Milestone Progress</span>
                                            <span className="text-slate-900 dark:text-white font-extrabold">{progressNum}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    isCompleted 
                                                        ? 'bg-emerald-500' 
                                                        : isStopped 
                                                        ? 'bg-rose-500' 
                                                        : isDelayed 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                }`}
                                                style={{ width: `${progressNum}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                                        {(isDelayed || isStopped) && (
                                            <motion.button 
                                                whileTap={{ scale: 0.95 }}
                                                disabled={submitting}
                                                onClick={() => handleRestartProject(project._id)}
                                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                <span>Restart Work</span>
                                            </motion.button>
                                        )}

                                        <button 
                                            type="button"
                                            onClick={() => handleOpenTimelineModal(project)}
                                            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60"
                                        >
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Timeline</span>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setSelectedStatusProject(project);
                                                setStatusForm({
                                                    status: project.status === 'In Progress' ? 'In Progress' : (project.status || 'In Progress'),
                                                    reason: 'Tool Maintenance',
                                                    customReason: '',
                                                    remarks: '',
                                                    expectedResumeDate: ''
                                                });
                                                setShowStatusForm(true);
                                            }}
                                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                                        >
                                            <Sliders className="w-3.5 h-3.5" />
                                            <span>Status</span>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData, 
                                                    projectId: project._id, 
                                                    progressPercentage: project.progress || 0
                                                });
                                                setShowForm(true);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Update</span>
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Report Data Entry */}
            <AnimatePresence>
                {showForm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 md:p-8 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <PenTool className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Post Progress Report</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Record milestone completion & field evidence</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowForm(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assigned Project *</label>
                                        <select 
                                            required
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.projectId}
                                            onChange={e => setFormData({...formData, projectId: e.target.value})}
                                        >
                                            <option value="">Select Project...</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title} - {p.location}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Progress Title *</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="e.g. Frame Welding Phase 1"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Work Description *</label>
                                        <textarea 
                                            required
                                            rows="3"
                                            placeholder="Detailed account of work completed today..."
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Completion %</label>
                                            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{formData.progressPercentage}%</span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0"
                                            max="100"
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            value={formData.progressPercentage}
                                            onChange={e => setFormData({...formData, progressPercentage: Number(e.target.value)})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Operational Status</label>
                                        <select 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.status}
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Not Started">Not Started</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Materials Deployed</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. 50kg welding rods, 4 steel plates"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.materialsUsed}
                                            onChange={e => setFormData({...formData, materialsUsed: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Blockers / Site Issues</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Power trip in afternoon"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.issues}
                                            onChange={e => setFormData({...formData, issues: e.target.value})}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Next Phase Plan</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Surface grinding & anti-rust primer application"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            value={formData.nextPlan}
                                            onChange={e => setFormData({...formData, nextPlan: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {/* Photo Upload Section */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Site Documentation Photos (Max 5)
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-slate-400 hover:text-blue-600">
                                            <Upload className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold">Add Photo</span>
                                            <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>

                                        {previews.map((preview, idx) => (
                                            <div key={idx} className="w-24 h-24 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-sm">
                                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-500/25 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                        ) : (
                                            'Transmit Site Report'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: Update Project Status / Delay */}
            <AnimatePresence>
                {showStatusForm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => {
                            setShowStatusForm(false);
                            setSelectedStatusProject(null);
                        }}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 md:p-8 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report Delay / Status</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Notify Admin of operational impediments</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowStatusForm(false);
                                        setSelectedStatusProject(null);
                                    }}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleStatusSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Project *</label>
                                    {selectedStatusProject && selectedStatusProject._id ? (
                                        <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                                            {selectedStatusProject.title} ({selectedStatusProject.location || 'Site'})
                                        </div>
                                    ) : (
                                        <select 
                                            required
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                            value={statusForm.projectId || ''}
                                            onChange={e => {
                                                const proj = projects.find(p => p._id === e.target.value);
                                                setSelectedStatusProject(proj);
                                                setStatusForm({...statusForm, projectId: e.target.value});
                                            }}
                                        >
                                            <option value="">Select Project...</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title} - {p.location}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Operational Status *</label>
                                    <select 
                                        required
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                        value={statusForm.status}
                                        onChange={e => setStatusForm({...statusForm, status: e.target.value})}
                                    >
                                        <option value="In Progress">In Progress (Active)</option>
                                        <option value="Delayed">Delayed (Impediment)</option>
                                        <option value="Stopped">Stopped (Full Site Halt)</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>

                                {['Delayed', 'Stopped'].includes(statusForm.status) && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Primary Reason *</label>
                                            <select 
                                                required
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                                value={statusForm.reason}
                                                onChange={e => setStatusForm({...statusForm, reason: e.target.value})}
                                            >
                                                <option value="Tool Maintenance">Tool Maintenance</option>
                                                <option value="Power Failure">Power Failure</option>
                                                <option value="Machine Breakdown">Machine Breakdown</option>
                                                <option value="Material Shortage">Material Shortage</option>
                                                <option value="Labour Shortage">Labour Shortage</option>
                                                <option value="Safety Incident">Safety Incident</option>
                                                <option value="Emergency Issue">Emergency Issue</option>
                                                <option value="Weather Conditions">Weather Conditions</option>
                                                <option value="Transportation Issue">Transportation Issue</option>
                                                <option value="Client Request">Client Request</option>
                                                <option value="Other (Custom Reason)">Other (Custom Reason)</option>
                                            </select>
                                        </div>

                                        {statusForm.reason === 'Other (Custom Reason)' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Custom Reason *</label>
                                                <input 
                                                    required
                                                    type="text"
                                                    placeholder="Specify custom impediment reason..."
                                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                                    value={statusForm.customReason}
                                                    onChange={e => setStatusForm({...statusForm, customReason: e.target.value})}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Detailed Remarks *</label>
                                            <textarea 
                                                required
                                                rows="3"
                                                placeholder="Provide details about the issue and what is needed to resume..."
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                                value={statusForm.remarks}
                                                onChange={e => setStatusForm({...statusForm, remarks: e.target.value})}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Expected Resume Date (Optional)</label>
                                            <input 
                                                type="date"
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                                value={statusForm.expectedResumeDate}
                                                onChange={e => setStatusForm({...statusForm, expectedResumeDate: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setShowStatusForm(false);
                                            setSelectedStatusProject(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-amber-500/25 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Transmitting...</>
                                        ) : (
                                            'Transmit Status Change'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: Propose Project Timeline */}
            <AnimatePresence>
                {showTimelineForm && selectedTimelineProject && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => {
                            setShowTimelineForm(false);
                            setSelectedTimelineProject(null);
                        }}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 md:p-8 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Propose Project Timeline</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            For: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedTimelineProject.title}</span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowTimelineForm(false);
                                        setSelectedTimelineProject(null);
                                    }}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitTimeline} className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Milestone Targets</span>
                                    <button
                                        type="button"
                                        onClick={handleAddMilestone}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Milestone</span>
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                    {timelineDraft.length === 0 ? (
                                        <div className="p-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                                            <p className="text-xs text-slate-400">No milestones yet. Click "+ Add Milestone" to start drafting.</p>
                                        </div>
                                    ) : (
                                        timelineDraft.map((milestone, idx) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3 relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMilestone(idx)}
                                                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Milestone #{idx + 1} *</label>
                                                        <input 
                                                            required
                                                            type="text"
                                                            placeholder="e.g. Steel Cutting & Edge Prep"
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                                                            value={milestone.title}
                                                            onChange={e => handleMilestoneChange(idx, 'title', e.target.value)}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Target Date *</label>
                                                        <input 
                                                            required
                                                            type="date"
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500"
                                                            value={milestone.date}
                                                            onChange={e => handleMilestoneChange(idx, 'date', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Scope / Description</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="Scope of work details..."
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal outline-none focus:border-indigo-500"
                                                        value={milestone.description}
                                                        onChange={e => handleMilestoneChange(idx, 'description', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setShowTimelineForm(false);
                                            setSelectedTimelineProject(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting || timelineDraft.length === 0}
                                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-500/25 disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Plan...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Submit to Admin</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffProgress;
