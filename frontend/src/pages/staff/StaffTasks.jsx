import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getSocket } from '../../utils/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckSquare, Clock, AlertTriangle, ChevronRight, Briefcase, Filter,
    Play, Send, CheckCircle2, RefreshCw, Paperclip, Camera, Calendar,
    User, AlertCircle, X, Info, Image, MessageSquare, ChevronDown, ChevronUp,
    FileUp, Check, Trash2
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const StaffTasks = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Drafts for inline update pane
    // Key: taskId, Value: { progressPercentage, note, photos: [] }
    const [drafts, setDrafts] = useState({});

    // Delay modal state
    const [delayModal, setDelayModal] = useState({
        show: false,
        task: null,
        reason: '',
        remarks: ''
    });

    useEffect(() => {
        fetchTasks();

        // Socket.IO listeners
        const socket = getSocket();
        socket.connect();

        const handleTaskUpdate = (updatedTask) => {
            console.log("📡 Socket.IO: Task Updated", updatedTask);
            setTasks(prevTasks => {
                const idx = prevTasks.findIndex(t => t._id === updatedTask._id);
                if (idx !== -1) {
                    const newTasks = [...prevTasks];
                    newTasks[idx] = updatedTask;
                    return newTasks;
                }
                // If it is assigned to this user and not in list, append it
                const isAssigned = updatedTask.assignedStaff?.some(s => {
                    const sId = s._id || s;
                    return sId === user?._id || sId === user?.id;
                });
                if (isAssigned) {
                    return [updatedTask, ...prevTasks];
                }
                return prevTasks;
            });
        };

        const handleTaskDelete = (deletedId) => {
            console.log("📡 Socket.IO: Task Deleted", deletedId);
            setTasks(prevTasks => prevTasks.filter(t => t._id !== deletedId));
        };

        socket.on('task-updated', handleTaskUpdate);
        socket.on('task-deleted', handleTaskDelete);
        socket.on('new-task-assigned', handleTaskUpdate);

        return () => {
            socket.off('task-updated', handleTaskUpdate);
            socket.off('task-deleted', handleTaskDelete);
            socket.off('new-task-assigned', handleTaskUpdate);
        };
    }, [user]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tasks');
            setTasks(res.data || []);
        } catch (err) {
            console.error("Error fetching staff tasks:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptTask = async (taskId) => {
        try {
            const res = await api.put(`/tasks/${taskId}/status`, { status: 'In Progress' });
            if (res.data.success) {
                // Initialize draft progress for this task
                setDrafts(prev => ({
                    ...prev,
                    [taskId]: {
                        progressPercentage: 0,
                        note: '',
                        photos: []
                    }
                }));
                setExpandedTaskId(taskId);
                fetchTasks();
            }
        } catch (err) {
            console.error(err);
            alert("Administrative Error: Failed to accept task.");
        }
    };

    const handlePhotoUpload = async (e, taskId) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploadedUrl = res.data.fileUrl;
            
            setDrafts(prev => {
                const currentDraft = prev[taskId] || { progressPercentage: 0, note: '', photos: [] };
                return {
                    ...prev,
                    [taskId]: {
                        ...currentDraft,
                        photos: [...(currentDraft.photos || []), uploadedUrl]
                    }
                };
            });
        } catch (err) {
            console.error("Photo upload failed:", err);
            alert("File Upload Error: Failed to upload progress photo.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveDraftPhoto = (taskId, photoIdx) => {
        setDrafts(prev => {
            const currentDraft = prev[taskId];
            if (!currentDraft) return prev;
            return {
                ...prev,
                [taskId]: {
                    ...currentDraft,
                    photos: currentDraft.photos.filter((_, i) => i !== photoIdx)
                }
            };
        });
    };

    const handleProgressUpdate = async (taskId) => {
        const draft = drafts[taskId];
        if (!draft) return;

        setSubmitting(true);
        try {
            await api.put(`/tasks/${taskId}/progress`, {
                progressPercentage: draft.progressPercentage,
                note: draft.note,
                workPhotos: draft.photos
            });
            
            // Reset fields but preserve current progress percentage
            setDrafts(prev => ({
                ...prev,
                [taskId]: {
                    ...prev[taskId],
                    note: '',
                    photos: []
                }
            }));
            
            alert("Task progress logged successfully!");
            fetchTasks();
        } catch (err) {
            console.error(err);
            alert("Failed to update task progress.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuickComplete = async (taskId) => {
        if (!window.confirm("Mark this task as Completed? This sets progress to 100% and marks status as Completed.")) return;
        
        setSubmitting(true);
        try {
            await api.put(`/tasks/${taskId}/progress`, {
                progressPercentage: 100,
                note: "Operational Note: Task completed by operator."
            });
            fetchTasks();
        } catch (err) {
            console.error(err);
            alert("Failed to complete task.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelaySubmit = async (e) => {
        e.preventDefault();
        const { task, reason, remarks } = delayModal;
        if (!task || !reason) return;

        try {
            await api.put(`/tasks/${task._id}/delay`, {
                delayReason: reason,
                delayRemarks: remarks
            });
            setDelayModal({ show: false, task: null, reason: '', remarks: '' });
            fetchTasks();
        } catch (err) {
            console.error(err);
            alert("Failed to log delay.");
        }
    };

    const toggleExpand = (task) => {
        if (expandedTaskId === task._id) {
            setExpandedTaskId(null);
        } else {
            setExpandedTaskId(task._id);
            // Initialize draft for this task if it doesn't exist
            if (!drafts[task._id]) {
                setDrafts(prev => ({
                    ...prev,
                    [task._id]: {
                        progressPercentage: task.progressPercentage || 0,
                        note: '',
                        photos: []
                    }
                }));
            }
        }
    };

    // Style Helpers
    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'Critical': return { border: 'border-l-rose-600', text: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20' };
            case 'High': return { border: 'border-l-orange-500', text: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20' };
            case 'Medium': return { border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' };
            case 'Low':
            default: return { border: 'border-l-blue-500', text: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' };
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Pending': return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-dark-bg dark:text-slate-300 dark:border-dark-border';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950/50';
            case 'Delayed': return 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950/50';
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/50';
            case 'Cancelled': return 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/50';
            default: return 'bg-slate-100 text-slate-700 border border-slate-200';
        }
    };

    // Counts for stats
    const totalCount = tasks.length;
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
    const delayedCount = tasks.filter(t => t.status === 'Delayed').length;
    const completedCount = tasks.filter(t => t.status === 'Completed').length;

    // Filtered list
    const filteredTasks = tasks.filter(t => {
        if (activeTab === 'All') return true;
        return t.status === activeTab;
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-24">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-dark-border">
                <div>
                    <h1 className="text-4xl font-bold text-[#111827] dark:text-dark-text tracking-tight font-poppins">
                        Operational <span className="text-[#2563EB]">Task Board</span>
                    </h1>
                    <p className="text-sm text-[#6B7280] dark:text-dark-muted mt-2">
                        View operational task assignments, submit progress percentage, attach photos, and log delay reports in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchTasks}
                        className="p-3 bg-white border border-[#E2E8F0] dark:border-dark-border dark:bg-dark-surface rounded-xl text-slate-600 dark:text-dark-text hover:bg-slate-50 dark:hover:bg-dark-bg transition-all shadow-sm"
                        title="Sync Board"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-slate-50 dark:bg-dark-surface/40 p-4 border border-slate-200/60 dark:border-dark-border rounded-2xl">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Assigned</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalCount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-dark-surface/40 p-4 border border-slate-200/60 dark:border-dark-border rounded-2xl">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{pendingCount}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-100 dark:border-blue-950/50 rounded-2xl">
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-wider">In Progress</p>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">{inProgressCount}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-100 dark:border-amber-950/50 rounded-2xl">
                    <p className="text-amber-500 text-[10px] font-black uppercase tracking-wider">Delayed</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{delayedCount}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-100 dark:border-emerald-950/50 rounded-2xl">
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{completedCount}</p>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Sidebar Filter Tabs */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border p-6 rounded-3xl shadow-sm">
                        <h3 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs mb-4 flex items-center gap-2 border-b dark:border-dark-border pb-3">
                            <Filter className="w-4 h-4 text-[#2563EB]" /> Filtering System
                        </h3>
                        {/* Desktop vertical sidebar / Mobile horizontal strip */}
                        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
                            {[
                                { name: 'All', count: totalCount },
                                { name: 'Pending', count: pendingCount },
                                { name: 'In Progress', count: inProgressCount },
                                { name: 'Delayed', count: delayedCount },
                                { name: 'Completed', count: completedCount }
                            ].map(tab => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap lg:w-full ${
                                        activeTab === tab.name
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-slate-50 dark:bg-dark-bg/60 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-transparent'
                                    }`}
                                >
                                    <span>{tab.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        activeTab === tab.name
                                            ? 'bg-white text-blue-600'
                                            : 'bg-slate-200/80 dark:bg-dark-border text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="lg:col-span-9 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-40">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Syncing assignments...</span>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border p-16 text-center rounded-[2.5rem] shadow-sm">
                            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">No Operational Assignments</h3>
                            <p className="text-slate-400 font-bold text-xs uppercase mt-2">There are no tasks matching the "{activeTab}" filter.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence mode="popLayout">
                                {filteredTasks.map((task) => {
                                    const isExpanded = expandedTaskId === task._id;
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                    const draft = drafts[task._id] || { progressPercentage: task.progressPercentage || 0, note: '', photos: [] };
                                    
                                    return (
                                        <motion.div 
                                            layout
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            key={task._id} 
                                            className={`bg-white dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all border-l-8 ${getPriorityStyles(task.priority).border}`}
                                        >
                                            {/* Upper Block */}
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${getStatusStyles(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${getPriorityStyles(task.priority).bg} ${getPriorityStyles(task.priority).text}`}>
                                                            {task.priority} Priority
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2.5 py-0.5 rounded-full animate-pulse border border-rose-200">
                                                                Overdue
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            Project: {task.projectName || 'General Work'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white font-poppins">{task.title}</h3>
                                                </div>

                                                {/* Desktop/Mobile Status triggers */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {task.status === 'Pending' && (
                                                        <button 
                                                            onClick={() => handleAcceptTask(task._id)}
                                                            className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                                        >
                                                            <Play className="w-3.5 h-3.5 fill-current" /> Accept Assignment
                                                        </button>
                                                    )}
                                                    
                                                    {task.status !== 'Pending' && task.status !== 'Completed' && task.status !== 'Cancelled' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleQuickComplete(task._id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" /> Quick Complete
                                                            </button>
                                                            <button 
                                                                onClick={() => setDelayModal({ show: true, task, reason: '', remarks: '' })}
                                                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                                                            >
                                                                <AlertTriangle className="w-4 h-4" /> Report Delay
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm font-medium text-slate-600 dark:text-dark-muted leading-relaxed mb-6">
                                                {task.description}
                                            </p>

                                            {/* Meta data row */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-5 border-t border-b border-slate-50 dark:border-dark-border/40 text-xs font-bold text-slate-500 mb-6">
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">Start Date</span>
                                                    <span className="text-slate-700 dark:text-white flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'ASAP'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">Due Date</span>
                                                    <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                                                        <Calendar className="w-4 h-4" />
                                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'ASAP'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">Estimated Hours</span>
                                                    <span className="text-slate-700 dark:text-white flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        {task.estimatedHours ? `${task.estimatedHours} hrs` : 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">Assigned By</span>
                                                    <span className="text-slate-700 dark:text-white flex items-center gap-1.5">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                        {task.assignedBy?.name || 'Administrator'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Strip */}
                                            <div className="space-y-2 mb-6">
                                                <div className="flex justify-between text-xs font-extrabold">
                                                    <span className="text-slate-400 uppercase tracking-wider text-[10px]">Work Completion Progress</span>
                                                    <span className="text-blue-600 dark:text-blue-400">{task.progressPercentage}%</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 dark:bg-dark-bg w-full rounded-full overflow-hidden border border-slate-200/50 dark:border-transparent">
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${
                                                            task.status === 'Delayed' ? 'bg-amber-500' :
                                                            task.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600'
                                                        }`} 
                                                        style={{ width: `${task.progressPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* File attachments from Admin */}
                                            {task.attachments && task.attachments.length > 0 && (
                                                <div className="mb-6 bg-slate-50 dark:bg-dark-bg/40 p-4 rounded-2xl border border-slate-100 dark:border-dark-border/40">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Paperclip className="w-3.5 h-3.5" /> Reference Attachments ({task.attachments.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {task.attachments.map((url, idx) => (
                                                            <a 
                                                                key={idx} 
                                                                href={url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-surface border dark:border-dark-border rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
                                                            >
                                                                <FileUp className="w-3.5 h-3.5 text-blue-500" /> Reference File #{idx + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Uploaded Progress Photos */}
                                            {task.workPhotos && task.workPhotos.length > 0 && (
                                                <div className="mb-6">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Image className="w-3.5 h-3.5" /> Uploaded Progress Photos ({task.workPhotos.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {task.workPhotos.map((url, idx) => (
                                                            <a 
                                                                key={idx} 
                                                                href={url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="relative group border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex-shrink-0"
                                                            >
                                                                <img 
                                                                    src={url} 
                                                                    alt="progress report" 
                                                                    className="w-16 h-16 object-cover hover:scale-110 transition-transform duration-300" 
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Expand updates toggle button */}
                                            <div className="flex justify-between items-center mt-2">
                                                <button
                                                    onClick={() => toggleExpand(task)}
                                                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-dark-bg/60 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    {isExpanded ? 'Hide Task Timeline & Forms' : 'Show Task Timeline & Log Updates'}
                                                </button>
                                                
                                                {task.remarks && (
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight bg-amber-50 px-3 py-1 rounded-xl">
                                                        Remarks logged
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expandable updates panel */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden mt-6 pt-6 border-t border-slate-100 dark:border-dark-border/60 space-y-6"
                                                    >
                                                        {/* Work Notes Timeline */}
                                                        <div className="space-y-3">
                                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                                                <MessageSquare className="w-3.5 h-3.5" /> Logged Notes Timeline ({task.workNotes?.length || 0})
                                                            </h4>
                                                            {task.workNotes && task.workNotes.length > 0 ? (
                                                                <div className="relative pl-4 border-l border-slate-100 dark:border-dark-border space-y-4">
                                                                    {task.workNotes.map((note, idx) => (
                                                                        <div key={note._id || idx} className="relative space-y-1">
                                                                            {/* Dot */}
                                                                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-dark-surface"></span>
                                                                            
                                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                                                                <span>{note.staffName || 'Operator'}</span>
                                                                                <span>•</span>
                                                                                <span>{new Date(note.createdAt).toLocaleString()}</span>
                                                                            </div>
                                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-dark-bg/30 p-3 rounded-2xl border border-slate-100/50 dark:border-transparent inline-block">
                                                                                {note.note}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs font-bold text-slate-400 italic">No notes or status updates logged yet.</p>
                                                            )}
                                                        </div>

                                                        {/* Log new update section (only if editable status) */}
                                                        {task.status !== 'Completed' && task.status !== 'Cancelled' && task.status !== 'Pending' && (
                                                            <div className="bg-slate-50 dark:bg-dark-bg/20 p-6 rounded-3xl border border-slate-100 dark:border-dark-border/40 space-y-6">
                                                                <div className="flex items-center gap-2 border-b dark:border-dark-border pb-3">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                                                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">Log Real-Time Work Progress</h4>
                                                                </div>

                                                                {/* Progress slider */}
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Progress Slider</label>
                                                                        <span className="text-blue-600 dark:text-blue-400 font-black">{draft.progressPercentage}% Completed</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <input 
                                                                            type="range" 
                                                                            min="0" 
                                                                            max="95" 
                                                                            step="5"
                                                                            value={draft.progressPercentage}
                                                                            onChange={(e) => {
                                                                                const val = Number(e.target.value);
                                                                                setDrafts(prev => ({
                                                                                    ...prev,
                                                                                    [task._id]: {
                                                                                        ...draft,
                                                                                        progressPercentage: val
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="flex-1 h-2 bg-slate-200 dark:bg-dark-bg rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                                                                        />
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">(Use "Quick Complete" for 100%)</span>
                                                                    </div>
                                                                </div>

                                                                {/* Note input */}
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Append Text Note</label>
                                                                    <textarea
                                                                        rows="2"
                                                                        placeholder="What specific tasks did you work on? (e.g. Completed initial roofing setup)"
                                                                        value={draft.note}
                                                                        onChange={(e) => setDrafts(prev => ({
                                                                            ...prev,
                                                                            [task._id]: {
                                                                                ...draft,
                                                                                note: e.target.value
                                                                            }
                                                                        }))}
                                                                        className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl text-xs font-semibold outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                                                                    />
                                                                </div>

                                                                {/* Upload area */}
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Attach Progress Photos</label>
                                                                    
                                                                    <div className="flex flex-wrap items-center gap-3">
                                                                        {/* Upload Button */}
                                                                        <label className="cursor-pointer bg-white dark:bg-dark-surface border-2 border-dashed border-slate-200 dark:border-dark-border hover:border-blue-500 dark:hover:border-blue-500 w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-slate-400 transition-colors">
                                                                            <Camera className="w-5 h-5" />
                                                                            <span className="text-[8px] font-black mt-1 uppercase">Upload</span>
                                                                            <input 
                                                                                type="file" 
                                                                                accept="image/*"
                                                                                className="hidden" 
                                                                                disabled={uploading}
                                                                                onChange={(e) => handlePhotoUpload(e, task._id)}
                                                                            />
                                                                        </label>

                                                                        {/* Uploading Spinner */}
                                                                        {uploading && (
                                                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                                                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                                                                            </div>
                                                                        )}

                                                                        {/* Draft Upload Previews */}
                                                                        {draft.photos && draft.photos.map((photoUrl, pIdx) => (
                                                                            <div key={pIdx} className="relative w-16 h-16 rounded-2xl border overflow-hidden group shadow-sm bg-white">
                                                                                <img src={photoUrl} alt="draft progress upload" className="w-full h-full object-cover" />
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveDraftPhoto(task._id, pIdx)}
                                                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4 hover:text-red-400" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Submit trigger */}
                                                                <div className="flex justify-end gap-3 pt-2 border-t dark:border-dark-border">
                                                                    <button
                                                                        type="button"
                                                                        disabled={submitting || uploading}
                                                                        onClick={() => handleSubmitProgress(task._id)}
                                                                        className="bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-50"
                                                                    >
                                                                        <Send className="w-3.5 h-3.5" /> Submit Progress Update
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

            </div>

            {/* Delay Reporting Modal */}
            <AnimatePresence>
                {delayModal.show && delayModal.task && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDelayModal({ show: false, task: null, reason: '', remarks: '' })}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 border border-slate-100 dark:border-dark-border overflow-hidden"
                        >
                            <div className="bg-amber-500 p-8 text-white flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-2xl text-white">
                                    <AlertTriangle className="w-6 h-6 animate-bounce" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold font-poppins mb-1">Report Operational Delay</h3>
                                    <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">Log delay incident details</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleDelaySubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Primary Reason for Delay</label>
                                    <select 
                                        required
                                        className="bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-4 py-3 w-full outline-none text-slate-700 dark:text-white font-bold text-xs"
                                        value={delayModal.reason}
                                        onChange={(e) => setDelayModal({...delayModal, reason: e.target.value})}
                                    >
                                        <option value="">Select Reason...</option>
                                        <option value="Machine Breakdown">Machine Breakdown / Equipment Failure</option>
                                        <option value="Material Shortage">Material Shortage / Logistics Issue</option>
                                        <option value="Weather Conditions">Severe Weather Conditions</option>
                                        <option value="Client Request">Client Request / Specification Change</option>
                                        <option value="Power Failure">Power Failure / Utility Interruption</option>
                                        <option value="Safety Incident">Safety Incident / Emergency Event</option>
                                        <option value="Emergency Issue">Critical Operational Emergency</option>
                                        <option value="Other">Other / Administrative Interruption</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Delay Remarks / Explanatory Notes</label>
                                    <textarea 
                                        required
                                        rows="4" 
                                        placeholder="Briefly describe the root cause of the delay and estimated resolution duration..." 
                                        className="bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-4 py-3 w-full outline-none text-slate-700 dark:text-white font-medium text-xs focus:ring-2 focus:ring-amber-100 transition-all"
                                        value={delayModal.remarks}
                                        onChange={(e) => setDelayModal({...delayModal, remarks: e.target.value})}
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setDelayModal({ show: false, task: null, reason: '', remarks: '' })}
                                        className="flex-1 py-3.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
                                    >
                                        Submit Incident Report
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffTasks;
