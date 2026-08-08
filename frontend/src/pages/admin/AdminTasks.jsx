import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getSocket } from '../../utils/socket';
import { 
    CheckSquare, Plus, Edit, Trash2, Calendar, User, Clock, 
    Briefcase, AlertTriangle, CheckCircle2, FileText, BarChart3, 
    Filter, X, PlusCircle, Paperclip, ChevronRight, Check, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board'); // 'board' or 'reports'
    const [reportType, setReportType] = useState('productivity'); // 'productivity', 'staff', 'project', 'delayed'
    
    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        delayed: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0
    });

    // Query Filters
    const [filters, setFilters] = useState({
        projectId: '',
        staffId: '',
        priority: ''
    });

    // Modal states
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState({ show: false, task: null });
    const [detailsModal, setDetailsModal] = useState({ show: false, task: null });
    const [reassignModal, setReassignModal] = useState({ show: false, task: null, assignedStaff: [] });
    const [extendModal, setExtendModal] = useState({ show: false, task: null, dueDate: '' });

    // File Upload States
    const [uploading, setUploading] = useState(false);

    // Form inputs
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        projectId: '',
        priority: 'Medium',
        assignedStaff: [],
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        remarks: '',
        attachments: []
    });

    useEffect(() => {
        fetchMetadata();
        fetchTasks();
        fetchStats();

        // Connect to Socket.IO and listen for updates
        const socket = getSocket();
        socket.connect();
        socket.emit('join-room', 'admin');

        socket.on('admin-task-update', (updatedTask) => {
            console.log("📡 Socket.IO: Task Updated", updatedTask);
            setTasks(prevTasks => {
                const index = prevTasks.findIndex(t => t._id === updatedTask._id);
                if (index !== -1) {
                    const newTasks = [...prevTasks];
                    newTasks[index] = updatedTask;
                    return newTasks;
                } else {
                    return [updatedTask, ...prevTasks];
                }
            });
            fetchStats();
        });

        socket.on('admin-task-deleted', (deletedId) => {
            console.log("📡 Socket.IO: Task Deleted", deletedId);
            setTasks(prevTasks => prevTasks.filter(t => t._id !== deletedId));
            fetchStats();
        });

        return () => {
            socket.off('admin-task-update');
            socket.off('admin-task-deleted');
            socket.disconnect();
        };
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

    const fetchTasks = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {};
            if (currentFilters.projectId) params.projectId = currentFilters.projectId;
            if (currentFilters.priority) params.priority = currentFilters.priority;
            if (currentFilters.staffId) params.staffId = currentFilters.staffId;

            const res = await api.get('/tasks', { params });
            setTasks(res.data || []);
        } catch (err) {
            console.error("Error fetching tasks:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/tasks/stats');
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        fetchTasks(newFilters);
    };

    const handleClearFilters = () => {
        const cleared = { projectId: '', staffId: '', priority: '' };
        setFilters(cleared);
        fetchTasks(cleared);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks', formData);
            setCreateModal(false);
            setFormData({
                title: '',
                description: '',
                projectId: '',
                priority: 'Medium',
                assignedStaff: [],
                startDate: '',
                dueDate: '',
                estimatedHours: '',
                remarks: '',
                attachments: []
            });
            fetchTasks();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create task.");
        }
    };

    const handleEditTask = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/tasks/${editModal.task._id}/admin`, formData);
            setEditModal({ show: false, task: null });
            fetchTasks();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update task.");
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            setDetailsModal({ show: false, task: null });
            fetchTasks();
            fetchStats();
        } catch (err) {
            alert("Failed to delete task.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/uploads', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, res.data.fileUrl]
            }));
            alert("File attached successfully!");
        } catch (err) {
            console.error("Upload failed:", err);
            alert("File upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAttachment = (idx) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== idx)
        }));
    };

    // Drag & Drop Handlers
    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        try {
            await api.put(`/tasks/${taskId}/status`, { status: targetStatus });
            fetchTasks();
            fetchStats();
        } catch (err) {
            console.error("Status update on drop failed:", err);
        }
    };

    const handleQuickMarkCompleted = async (taskId) => {
        try {
            await api.put(`/tasks/${taskId}/status`, { status: 'Completed' });
            fetchTasks();
            fetchStats();
            if (detailsModal.show && detailsModal.task?._id === taskId) {
                setDetailsModal(prev => ({ ...prev, task: { ...prev.task, status: 'Completed', progressPercentage: 100 } }));
            }
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    const handleReassignSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/tasks/${reassignModal.task._id}/admin`, {
                assignedStaff: reassignModal.assignedStaff
            });
            setReassignModal({ show: false, task: null, assignedStaff: [] });
            fetchTasks();
            fetchStats();
        } catch (err) {
            alert("Failed to reassign staff.");
        }
    };

    const handleExtendSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/tasks/${extendModal.task._id}/admin`, {
                dueDate: extendModal.dueDate
            });
            setExtendModal({ show: false, task: null, dueDate: '' });
            fetchTasks();
            fetchStats();
        } catch (err) {
            alert("Failed to extend deadline.");
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Critical': return 'border-l-red-600 text-red-600 bg-red-50';
            case 'High': return 'border-l-orange-500 text-orange-500 bg-orange-50';
            case 'Medium': return 'border-l-yellow-500 text-yellow-600 bg-yellow-50';
            case 'Low':
            default: return 'border-l-blue-500 text-blue-600 bg-blue-50';
        }
    };

    const getStatusIndicator = (status) => {
        switch (status) {
            case 'Pending': return 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'Delayed': return 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse';
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            case 'Cancelled': return 'bg-rose-100 text-rose-700 border border-rose-200';
            default: return 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        }
    };

    const openEditModal = (task) => {
        setEditModal({ show: true, task });
        setFormData({
            title: task.title,
            description: task.description,
            projectId: task.projectId?._id || task.projectId || '',
            priority: task.priority || 'Medium',
            assignedStaff: task.assignedStaff ? task.assignedStaff.map(s => s._id || s) : [],
            startDate: task.startDate ? task.startDate.split('T')[0] : '',
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            estimatedHours: task.estimatedHours || '',
            remarks: task.remarks || '',
            attachments: task.attachments || []
        });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 dark:border-dark-border">
                <div>
                    <h1 className="text-4xl font-bold text-[#111827] dark:text-dark-text tracking-tight font-poppins">
                        Task Assignment <span className="text-[#2563EB]">Hub</span>
                    </h1>
                    <p className="text-sm text-[#6B7280] dark:text-dark-muted mt-2">
                        Create, assign, schedule, and live-monitor operational workflows across engineering teams.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => {
                            setActiveTab(activeTab === 'board' ? 'reports' : 'board');
                        }}
                        className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-dark-border dark:bg-dark-surface rounded-xl text-sm font-bold text-[#111827] dark:text-dark-text hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-dark-bg transition-all flex items-center gap-2 shadow-sm"
                    >
                        {activeTab === 'board' ? <BarChart3 className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                        {activeTab === 'board' ? 'View Productivity Reports' : 'View Kanban Task Board'}
                    </button>
                    <button 
                        onClick={() => setCreateModal(true)} 
                        className="px-5 py-2.5 bg-[#2563EB] rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" /> Create Task
                    </button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 dark:bg-dark-surface/40 p-4 border border-slate-200/60/60 dark:border-slate-700/60 dark:border-dark-border rounded-2xl">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Tasks</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 dark:bg-dark-surface/40 p-4 border border-slate-200/60/60 dark:border-slate-700/60 dark:border-dark-border rounded-2xl">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{stats.pending}</p>
                </div>
                <div className="bg-blue-50/20 dark:bg-blue-950/20 p-4 border border-blue-100/50 dark:border-blue-950/50 rounded-2xl">
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-wider">In Progress</p>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">{stats.inProgress}</p>
                </div>
                <div className="bg-amber-50/20 dark:bg-amber-950/20 p-4 border border-amber-100/50 dark:border-amber-950/50 rounded-2xl">
                    <p className="text-amber-500 text-[10px] font-black uppercase tracking-wider">Delayed</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{stats.delayed}</p>
                </div>
                <div className="bg-emerald-50/20 dark:bg-emerald-950/20 p-4 border border-emerald-100/50 dark:border-emerald-950/50 rounded-2xl">
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{stats.completed}</p>
                </div>
                <div className="bg-rose-50/20 dark:bg-rose-950/20 p-4 border border-rose-100/50 dark:border-rose-950/50 rounded-2xl">
                    <p className="text-rose-500 text-[10px] font-black uppercase tracking-wider">Overdue</p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">{stats.overdue}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 dark:bg-dark-surface/40 p-4 border border-slate-200/60/60 dark:border-slate-700/60 dark:border-dark-border rounded-2xl col-span-2 sm:col-span-1">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Cancelled</p>
                    <p className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-1">{stats.cancelled}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface p-6 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-wider">Filter Task Board</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow max-w-3xl justify-end">
                    <select 
                        name="projectId"
                        value={filters.projectId}
                        onChange={handleFilterChange}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                            <option key={p._id} value={p._id}>{p.title}</option>
                        ))}
                    </select>

                    <select 
                        name="staffId"
                        value={filters.staffId}
                        onChange={handleFilterChange}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                    >
                        <option value="">All Staff</option>
                        {staffList.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>

                    <select 
                        name="priority"
                        value={filters.priority}
                        onChange={handleFilterChange}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                    >
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>
                {Object.values(filters).some(Boolean) && (
                    <button 
                        onClick={handleClearFilters}
                        className="text-xs font-bold text-rose-600 hover:underline uppercase tracking-wider shrink-0"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Main Tabs Panel */}
            {activeTab === 'board' ? (
                /* Kanban Board View */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {['Pending', 'In Progress', 'Delayed', 'Completed'].map(colStatus => {
                        const statusTasks = tasks.filter(t => t.status === colStatus);
                        return (
                            <div 
                                key={colStatus}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, colStatus)}
                                className="bg-slate-100/60/80 dark:bg-slate-800/80 dark:bg-dark-surface/10 rounded-3xl p-5 border border-slate-200/50/50 dark:border-slate-700/50 dark:border-dark-border/40 flex flex-col min-h-[500px]"
                            >
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 dark:border-dark-border">
                                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            colStatus === 'Pending' ? 'bg-slate-400' :
                                            colStatus === 'In Progress' ? 'bg-blue-600' :
                                            colStatus === 'Delayed' ? 'bg-amber-500 animate-ping' :
                                            'bg-emerald-500'
                                        }`}></span>
                                        {colStatus}
                                    </h3>
                                    <span className="bg-white dark:bg-slate-900 dark:bg-dark-surface px-2.5 py-0.5 rounded-full text-xs font-extrabold text-slate-500 dark:text-slate-400">
                                        {statusTasks.length}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-4 overflow-y-auto">
                                    {statusTasks.map(task => {
                                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                        return (
                                            <div 
                                                key={task._id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task._id)}
                                                onClick={() => setDetailsModal({ show: true, task })}
                                                className={`bg-white dark:bg-slate-900 dark:bg-dark-surface p-5 rounded-2xl shadow-sm border-l-4 ${getPriorityColor(task.priority)} cursor-grab hover:shadow-md hover:-translate-y-0.5 transition-all group relative`}
                                            >
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                        {task.projectName || 'General'}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                                                            OVERDUE
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                    {task.title}
                                                </h4>

                                                {/* Assigned Staff Mini Avatars */}
                                                <div className="flex -space-x-2 overflow-hidden my-4">
                                                    {task.assignedStaff && task.assignedStaff.map((staff, idx) => (
                                                        <div 
                                                            key={staff._id || idx} 
                                                            className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-white dark:ring-dark-surface bg-blue-600 text-white font-black text-[9px] flex items-center justify-center uppercase"
                                                            title={staff.name}
                                                        >
                                                            {staff.name?.charAt(0)}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800/40 dark:border-dark-border/40 pt-3">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'ASAP'}
                                                    </span>
                                                    <span className="font-extrabold text-slate-800 dark:text-slate-200 dark:text-white">
                                                        {task.progressPercentage}%
                                                    </span>
                                                </div>

                                                {/* Quick Progress Bar */}
                                                <div className="h-1 bg-slate-100/80 dark:bg-slate-800/80 dark:bg-dark-bg w-full mt-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${
                                                            task.status === 'Delayed' ? 'bg-amber-500' :
                                                            task.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600'
                                                        }`} 
                                                        style={{ width: `${task.progressPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Task Reports Section */
                <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border p-6 shadow-sm">
                    {/* Report Navigation tabs */}
                    <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-800 dark:border-dark-border pb-4 gap-3 mb-6">
                        {['productivity', 'staff', 'project', 'delayed'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setReportType(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    reportType === type 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'
                                }`}
                            >
                                {type === 'productivity' && 'Productivity Analysis'}
                                {type === 'staff' && 'Staff Task Report'}
                                {type === 'project' && 'Project Task Report'}
                                {type === 'delayed' && 'Delayed Tasks Log'}
                            </button>
                        ))}
                    </div>

                    {reportType === 'productivity' && (
                        <div className="space-y-6">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-tight">Team Productivity Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                                            <th className="p-4">Staff Member</th>
                                            <th className="p-4">Assigned Tasks</th>
                                            <th className="p-4">Completed</th>
                                            <th className="p-4">In Progress / Pending</th>
                                            <th className="p-4">Delays Reported</th>
                                            <th className="p-4">Average Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium text-slate-700 dark:text-slate-300 dark:text-dark-text">
                                        {staffList.map(s => {
                                            const staffTasks = tasks.filter(t => t.assignedStaff.some(id => (id._id || id) === s._id));
                                            const completed = staffTasks.filter(t => t.status === 'Completed').length;
                                            const progress = staffTasks.filter(t => ['In Progress', 'Pending'].includes(t.status)).length;
                                            const delayed = staffTasks.filter(t => t.status === 'Delayed').length;
                                            const avgProgress = staffTasks.length 
                                                ? Math.round(staffTasks.reduce((acc, t) => acc + (t.progressPercentage || 0), 0) / staffTasks.length)
                                                : 0;

                                            return (
                                                <tr key={s._id} className="hover:bg-slate-50/50/50 dark:bg-slate-800/50">
                                                    <td className="p-4 font-bold">{s.name}</td>
                                                    <td className="p-4">{staffTasks.length}</td>
                                                    <td className="p-4 text-emerald-600 font-bold">{completed}</td>
                                                    <td className="p-4">{progress}</td>
                                                    <td className="p-4 text-amber-600 font-bold">{delayed}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-slate-100/80 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-600" style={{ width: `${avgProgress}%` }}></div>
                                                            </div>
                                                            <span>{avgProgress}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {reportType === 'staff' && (
                        <div className="space-y-6">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-tight">Staff Assignment Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                                            <th className="p-4">Task Name</th>
                                            <th className="p-4">Assigned To</th>
                                            <th className="p-4">Project</th>
                                            <th className="p-4">Due Date</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium text-slate-700 dark:text-slate-300 dark:text-dark-text">
                                        {tasks.map(t => (
                                            <tr key={t._id} className="hover:bg-slate-50/50/50 dark:bg-slate-800/50">
                                                <td className="p-4 font-bold">{t.title}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {t.assignedStaff.map(s => (
                                                            <span key={s._id} className="bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-bold">{s.name}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400 font-bold">{t.projectName || 'General'}</td>
                                                <td className="p-4 text-xs font-bold">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded ${getStatusIndicator(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold">{t.progressPercentage}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {reportType === 'project' && (
                        <div className="space-y-6">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-tight">Project Workflow Breakdown</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                                            <th className="p-4">Project</th>
                                            <th className="p-4">Total Tasks</th>
                                            <th className="p-4">Completed</th>
                                            <th className="p-4">Delayed</th>
                                            <th className="p-4">Completion %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium text-slate-700 dark:text-slate-300 dark:text-dark-text">
                                        {projects.map(p => {
                                            const projTasks = tasks.filter(t => t.projectId === p._id || t.projectId?._id === p._id);
                                            const completed = projTasks.filter(t => t.status === 'Completed').length;
                                            const delayed = projTasks.filter(t => t.status === 'Delayed').length;
                                            const completionPct = projTasks.length 
                                                ? Math.round((completed / projTasks.length) * 100) 
                                                : 0;

                                            return (
                                                <tr key={p._id} className="hover:bg-slate-50/50/50 dark:bg-slate-800/50">
                                                    <td className="p-4 font-bold">{p.title}</td>
                                                    <td className="p-4">{projTasks.length}</td>
                                                    <td className="p-4 text-emerald-600 font-bold">{completed}</td>
                                                    <td className="p-4 text-amber-600 font-bold">{delayed}</td>
                                                    <td className="p-4 font-bold">{completionPct}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {reportType === 'delayed' && (
                        <div className="space-y-6">
                            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-tight">Delayed Tasks Incident Log</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                                            <th className="p-4">Task Name</th>
                                            <th className="p-4">Project</th>
                                            <th className="p-4">Delay Reason</th>
                                            <th className="p-4">Staff Remarks</th>
                                            <th className="p-4">Due Date</th>
                                            <th className="p-4">Assigned Staff</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium text-slate-700 dark:text-slate-300 dark:text-dark-text">
                                        {tasks.filter(t => t.status === 'Delayed').map(t => (
                                            <tr key={t._id} className="hover:bg-slate-50/50/50 dark:bg-slate-800/50 bg-amber-50/20">
                                                <td className="p-4 font-bold text-amber-800 dark:text-amber-300">{t.title}</td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{t.projectName}</td>
                                                <td className="p-4 font-bold text-amber-700">{t.delayReason || 'Unspecified'}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400 italic">"{t.delayRemarks || '—'}"</td>
                                                <td className="p-4 text-xs font-bold">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="p-4 text-xs">
                                                    {t.assignedStaff.map(s => s.name).join(', ')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Task Modal Dialog */}
            <AnimatePresence>
                {createModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 dark:border-dark-border p-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5 text-blue-600" /> Create Operational Task
                                </h3>
                                <button 
                                    onClick={() => setCreateModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Title</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="e.g. Site Roofing Installation"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 dark:text-white"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Description</label>
                                        <textarea 
                                            required
                                            rows="3"
                                            placeholder="Provide specific technical instructions..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 dark:text-white"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Link</label>
                                        <select 
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                                            value={formData.projectId}
                                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                        >
                                            <option value="">Select Project...</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                                            value={formData.priority}
                                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>

                                    {/* Multi-Select Staff Checklist */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Assign Staff (Select one or multiple)</label>
                                        <div className="h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl p-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg grid grid-cols-2 gap-2">
                                            {staffList.map(s => {
                                                const checked = formData.assignedStaff.includes(s._id);
                                                return (
                                                    <label key={s._id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                                        <input 
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                if (checked) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        assignedStaff: prev.assignedStaff.filter(id => id !== s._id)
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        assignedStaff: [...prev.assignedStaff, s._id]
                                                                    }));
                                                                }
                                                            }}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        {s.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                                        <input 
                                            type="date"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
                                        <input 
                                            type="date"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                                            value={formData.dueDate}
                                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Hours</label>
                                        <input 
                                            type="number"
                                            placeholder="e.g. 12"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 dark:text-white"
                                            value={formData.estimatedHours}
                                            onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
                                        />
                                    </div>

                                    {/* Upload Attachments */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Attach Reference Files</label>
                                        <label className="flex items-center gap-2 justify-center px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-all">
                                            <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            {uploading ? 'Attaching file...' : 'Choose file...'}
                                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                        </label>
                                    </div>

                                    {formData.attachments.length > 0 && (
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attached Files List:</label>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.attachments.map((url, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 dark:bg-dark-bg px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                                                        <span className="truncate max-w-[150px]">File #{idx + 1}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveAttachment(idx)}
                                                            className="text-rose-600 hover:text-rose-700 font-extrabold"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Remarks</label>
                                        <input 
                                            type="text"
                                            placeholder="Supervisor directives or logistics remarks..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 dark:text-white"
                                            value={formData.remarks}
                                            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t">
                                    <button 
                                        type="button"
                                        onClick={() => setCreateModal(false)}
                                        className="px-5 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        Assign Task
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Task Details Dialog Modal */}
            <AnimatePresence>
                {detailsModal.show && detailsModal.task && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 dark:border-dark-border p-8 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-200"
                        >
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        detailsModal.task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                        detailsModal.task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                        detailsModal.task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {detailsModal.task.priority} Priority
                                    </span>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mt-1">{detailsModal.task.title}</h3>
                                </div>
                                <button 
                                    onClick={() => setDetailsModal({ show: false, task: null })}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-5 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-dark-border space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Project</span>
                                            <span className="text-slate-800 dark:text-slate-200 dark:text-white">{detailsModal.task.projectName || 'General'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Assigned By</span>
                                            <span className="text-slate-800 dark:text-slate-200 dark:text-white">{detailsModal.task.assignedBy?.name || 'Administrator'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Start Date</span>
                                            <span className="text-slate-800 dark:text-slate-200 dark:text-white">{detailsModal.task.startDate ? new Date(detailsModal.task.startDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Due Date</span>
                                            <span className="text-slate-800 dark:text-slate-200 dark:text-white">{detailsModal.task.dueDate ? new Date(detailsModal.task.dueDate).toLocaleDateString() : 'ASAP'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Estimated Hours</span>
                                            <span className="text-slate-800 dark:text-slate-200 dark:text-white">{detailsModal.task.estimatedHours || '—'} Hrs</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-0.5">Current Status</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ml-1 ${getStatusIndicator(detailsModal.task.status)}`}>
                                                {detailsModal.task.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Assigned To list */}
                                    <div className="border-t border-slate-200 dark:border-slate-700/40 dark:border-dark-border/40 pt-4">
                                        <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-2 font-bold">Assigned Staff List</span>
                                        <div className="flex flex-wrap gap-2">
                                            {detailsModal.task.assignedStaff && detailsModal.task.assignedStaff.map(s => (
                                                <div key={s._id} className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 dark:bg-dark-bg px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 ">
                                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[9px] uppercase">{s.name?.charAt(0)}</div>
                                                    {s.name} ({s.department || 'Staff'})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1 font-bold">Task Instructions</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg p-4 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-dark-border leading-relaxed whitespace-pre-line">
                                        {detailsModal.task.description}
                                    </p>
                                </div>

                                {detailsModal.task.remarks && (
                                    <div className="space-y-2">
                                        <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1 font-bold">Remarks / Internal directives</span>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                            "{detailsModal.task.remarks}"
                                        </p>
                                    </div>
                                )}

                                {/* Attachments Links */}
                                {detailsModal.task.attachments && detailsModal.task.attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1 font-bold">Attachments ({detailsModal.task.attachments.length})</span>
                                        <div className="flex flex-wrap gap-3">
                                            {detailsModal.task.attachments.map((url, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-extrabold transition-all border border-blue-100"
                                                >
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    View Attachment #{idx + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Work Photos (If uploaded by staff) */}
                                {detailsModal.task.workPhotos && detailsModal.task.workPhotos.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1 font-bold">Staff Uploaded Photos ({detailsModal.task.workPhotos.length})</span>
                                        <div className="grid grid-cols-3 gap-3">
                                            {detailsModal.task.workPhotos.map((url, idx) => (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-85 transition-opacity">
                                                    <img src={url} alt={`Work progress #${idx+1}`} className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Work Notes Timeline */}
                                {detailsModal.task.workNotes && detailsModal.task.workNotes.length > 0 && (
                                    <div className="space-y-3">
                                        <span className="text-slate-400 uppercase tracking-wider block text-[9px] mb-1 font-bold">Work Updates & Delay Reports</span>
                                        <div className="space-y-3 border-l-2 border-slate-100 dark:border-slate-800 dark:border-dark-border pl-4 max-h-48 overflow-y-auto">
                                            {detailsModal.task.workNotes.map((note, idx) => (
                                                <div key={idx} className="relative text-xs">
                                                    <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-blue-600"></div>
                                                    <div className="flex items-center justify-between font-bold">
                                                        <span className="text-slate-800 dark:text-slate-200 dark:text-white">{note.staffName || 'Staff'}</span>
                                                        <span className="text-[9px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 dark:text-dark-muted font-medium mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 dark:bg-dark-bg/40 p-2 rounded-lg">
                                                        {note.note}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 justify-end pt-6 border-t">
                                    <button 
                                        onClick={() => handleDeleteTask(detailsModal.task._id)}
                                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-100 flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Task
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setReassignModal({ show: true, task: detailsModal.task, assignedStaff: detailsModal.task.assignedStaff.map(s => s._id || s) });
                                        }}
                                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-xs font-bold transition-all border border-amber-100 flex items-center gap-1.5"
                                    >
                                        <User className="w-4 h-4" /> Reassign
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setExtendModal({ show: true, task: detailsModal.task, dueDate: detailsModal.task.dueDate ? detailsModal.task.dueDate.split('T')[0] : '' });
                                        }}
                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all border border-indigo-100 flex items-center gap-1.5"
                                    >
                                        <Clock className="w-4 h-4" /> Extend Deadline
                                    </button>
                                    {detailsModal.task.status !== 'Completed' && (
                                        <button 
                                            onClick={() => handleQuickMarkCompleted(detailsModal.task._id)}
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                                        >
                                            <Check className="w-4 h-4" /> Mark Completed
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reassign Staff Dialog */}
            <AnimatePresence>
                {reassignModal.show && reassignModal.task && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 dark:border-dark-border text-slate-800 dark:text-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-white mb-4">Reassign Task Staff</h3>
                            <form onSubmit={handleReassignSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assign Staff (Select one or multiple)</label>
                                    <div className="h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl p-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg grid grid-cols-1 gap-2">
                                        {staffList.map(s => {
                                            const checked = reassignModal.assignedStaff.includes(s._id);
                                            return (
                                                <label key={s._id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input 
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            if (checked) {
                                                                setReassignModal(prev => ({
                                                                    ...prev,
                                                                    assignedStaff: prev.assignedStaff.filter(id => id !== s._id)
                                                                }));
                                                            } else {
                                                                setReassignModal(prev => ({
                                                                    ...prev,
                                                                    assignedStaff: [...prev.assignedStaff, s._id]
                                                                }));
                                                            }
                                                        }}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    {s.name} ({s.department || 'Staff'})
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setReassignModal({ show: false, task: null, assignedStaff: [] })}
                                        className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Extend Deadline Dialog */}
            <AnimatePresence>
                {extendModal.show && extendModal.task && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 dark:border-dark-border text-slate-800 dark:text-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-white mb-4">Extend Task Deadline</h3>
                            <form onSubmit={handleExtendSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">New Due Date</label>
                                    <input 
                                        required
                                        type="date"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border rounded-xl text-xs font-bold outline-none text-slate-700 dark:text-slate-300 dark:text-white"
                                        value={extendModal.dueDate}
                                        onChange={e => setExtendModal({ ...extendModal, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setExtendModal({ show: false, task: null, dueDate: '' })}
                                        className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        Update Deadline
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminTasks;
