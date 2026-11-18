import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Calendar, Clock, AlertTriangle, CheckCircle2, Plus, Search, Filter, 
    ChevronRight, RefreshCw, Wrench, Users, ArrowRight, BarChart3, 
    FileText, Layers, ShieldAlert, X, Eye, Edit3, RotateCcw, Loader2
} from 'lucide-react';

const STAGE_PRESETS = [
    'Material Cutting & Sizing',
    'Bending & Profiling',
    'Fit-Up & Tack Welding',
    'Final Structural Welding',
    'Grinding & Edge Finishing',
    'Shot Blasting & Surface Prep',
    'Painting & Primer Coating',
    'Quality Inspection (QC)',
    'Packaging & Dispatch'
];

const AdminProductionPlanning = () => {
    const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'calendar' | 'conflicts' | 'reports'
    const [plans, setPlans] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [projectsError, setProjectsError] = useState(null);
    const [machines, setMachines] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [delayOnly, setDelayOnly] = useState(false);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedStage, setSelectedStage] = useState(null);

    // Reports state
    const [reportsSummary, setReportsSummary] = useState(null);

    // Create Plan Form
    const [planForm, setPlanForm] = useState({
        title: '',
        projectId: '',
        jobOrderNumber: '',
        priority: 'Medium',
        totalPlannedQuantity: 1,
        unit: 'pcs',
        plannedStartDate: new Date().toISOString().split('T')[0],
        plannedCompletionDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        notes: '',
        stages: []
    });

    const isProjectCancelled = (p) => {
        const s = String(p.status || '').toLowerCase();
        return s === 'cancelled';
    };
    const eligibleProjects = projects.filter(p => !isProjectCancelled(p));
    const ineligibleProjects = projects.filter(p => isProjectCancelled(p));

    // Progress Update Form
    const [progressForm, setProgressForm] = useState({
        quantityProduced: '',
        hoursSpent: '',
        status: 'In Progress',
        qcStatus: 'Passed',
        delayReason: '',
        notes: ''
    });

    // Reschedule Form
    const [rescheduleForm, setRescheduleForm] = useState({
        newStartDate: '',
        newEndDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchPlans();
        fetchAuxiliaryData();
    }, [statusFilter, priorityFilter, delayOnly]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'All') params.status = statusFilter;
            if (priorityFilter !== 'All') params.priority = priorityFilter;
            if (delayOnly) params.delayOnly = 'true';
            if (searchQuery) params.search = searchQuery;

            const res = await api.get('/production-plans', { params });
            if (res.data?.plans) setPlans(res.data.plans);
        } catch (err) {
            console.error('Failed to load production plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        setLoadingProjects(true);
        setProjectsError(null);
        try {
            const res = await api.get('/projects');
            const list = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
            setProjects(list);
            return list;
        } catch (err) {
            console.error('Failed to load projects:', err);
            setProjectsError(err.response?.data?.message || err.message || 'Failed to load projects');
            return [];
        } finally {
            setLoadingProjects(false);
        }
    };

    const fetchAuxiliaryData = async () => {
        try {
            // Fetch projects independently
            await fetchProjects();

            // Fetch machinery/tools safely
            try {
                const invRes = await api.get('/inventory/items', { params: { type: 'tool' } })
                    .catch(() => api.get('/inventory?type=tool'))
                    .catch(() => ({ data: [] }));
                const list = Array.isArray(invRes.data) ? invRes.data : (invRes.data?.tools || invRes.data?.items || []);
                setMachines(list);
            } catch (_) {}

            // Fetch staff safely
            try {
                const staffRes = await api.get('/staff')
                    .catch(() => api.get('/auth/users?role=staff'))
                    .catch(() => ({ data: [] }));
                const sList = Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data?.staff || staffRes.data?.users || []);
                setStaffList(sList);
            } catch (_) {}

            // Fetch reports summary safely
            try {
                const repRes = await api.get('/production-plans/reports/summary').catch(() => ({ data: { summary: null } }));
                if (repRes.data?.summary) setReportsSummary(repRes.data.summary);
            } catch (_) {}
        } catch (err) {
            console.warn('Auxiliary data fetch error:', err);
        }
    };

    const handleAddStageToForm = () => {
        const nextSeq = planForm.stages.length + 1;
        const defaultName = STAGE_PRESETS[planForm.stages.length] || `Stage ${nextSeq}`;
        setPlanForm(prev => ({
            ...prev,
            stages: [
                ...prev.stages,
                {
                    stageName: defaultName,
                    sequence: nextSeq,
                    machineId: '',
                    machineName: '',
                    assignedStaff: [],
                    plannedQuantity: prev.totalPlannedQuantity || 1,
                    unit: prev.unit || 'pcs',
                    plannedStartDate: prev.plannedStartDate,
                    plannedEndDate: prev.plannedCompletionDate,
                    status: 'Pending'
                }
            ]
        }));
    };

    const handleStageFieldChange = (idx, field, value) => {
        const updated = [...planForm.stages];
        updated[idx][field] = value;
        if (field === 'machineId') {
            const foundMachine = machines.find(m => String(m._id) === String(value));
            updated[idx].machineName = foundMachine ? foundMachine.name : '';
            updated[idx].machineCode = foundMachine ? foundMachine.code : '';
        }
        setPlanForm(prev => ({ ...prev, stages: updated }));
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            await api.post('/production-plans', planForm);
            setShowCreateModal(false);
            setPlanForm({
                title: '',
                projectId: '',
                jobOrderNumber: '',
                priority: 'Medium',
                totalPlannedQuantity: 1,
                unit: 'pcs',
                plannedStartDate: new Date().toISOString().split('T')[0],
                plannedCompletionDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                notes: '',
                stages: []
            });
            fetchPlans();
            fetchAuxiliaryData();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to create production plan');
        }
    };

    const handleRecordProgress = async (e) => {
        e.preventDefault();
        if (!selectedPlan || !selectedStage) return;
        try {
            await api.post(`/production-plans/${selectedPlan._id}/stages/${selectedStage._id}/progress`, progressForm);
            setShowProgressModal(false);
            setSelectedStage(null);
            setProgressForm({
                quantityProduced: '',
                hoursSpent: '',
                status: 'In Progress',
                qcStatus: 'Passed',
                delayReason: '',
                notes: ''
            });
            fetchPlans();
            fetchAuxiliaryData();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to record stage progress');
        }
    };

    const handleReschedule = async (e) => {
        e.preventDefault();
        if (!selectedPlan) return;
        try {
            await api.patch(`/production-plans/${selectedPlan._id}/reschedule`, {
                stageId: selectedStage?._id || undefined,
                newStartDate: rescheduleForm.newStartDate,
                newEndDate: rescheduleForm.newEndDate,
                reason: rescheduleForm.reason
            });
            setShowRescheduleModal(false);
            setSelectedStage(null);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to reschedule');
        }
    };

    const filteredPlans = plans.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.planNumber?.toLowerCase().includes(q) ||
            p.title?.toLowerCase().includes(q) ||
            p.projectTitle?.toLowerCase().includes(q) ||
            p.customerName?.toLowerCase().includes(q)
        );
    });

    const conflictPlans = plans.filter(p => p.hasConflicts);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/30 border border-blue-400/40 uppercase tracking-wider">
                            Fabrication & Engineering Planning
                        </span>
                        {conflictPlans.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/30 border border-rose-400/40 flex items-center gap-1 text-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                {conflictPlans.length} Scheduling Conflict{conflictPlans.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">Production Planning & Scheduling</h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
                        Schedule Job Work Orders into sequenced fabrication stages, assign machines and technicians, detect scheduling conflicts, and track real-time completion.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            if (projects.length === 0) {
                                fetchProjects();
                            }
                            setShowCreateModal(true);
                            if (planForm.stages.length === 0) handleAddStageToForm();
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create Production Plan
                    </button>
                    <button
                        type="button"
                        onClick={fetchPlans}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {reportsSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Active Plans</span>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {reportsSummary.activePlans}
                        </p>
                        <span className="text-[10px] text-slate-500">In Workshop / Scheduled</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-amber-500 uppercase">Delayed Jobs</span>
                        <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                            {reportsSummary.delayedPlans}
                        </p>
                        <span className="text-[10px] text-rose-500 font-bold">Past target date</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-emerald-600 uppercase">Completed Quantity</span>
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                            {reportsSummary.totalCompletedQty} <span className="text-xs text-slate-400 font-normal">/ {reportsSummary.totalPlannedQty} units</span>
                        </p>
                        <span className="text-[10px] text-emerald-600 font-bold">{reportsSummary.throughputPercentage}% Throughput</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-indigo-500 uppercase">Completed Jobs</span>
                        <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                            {reportsSummary.completedPlans}
                        </p>
                        <span className="text-[10px] text-slate-400">Finished & QC passed</span>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
                <button
                    type="button"
                    onClick={() => setActiveTab('plans')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                        activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    Production Plans ({plans.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('conflicts')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                        activeTab === 'conflicts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Conflicts & Collisions ({conflictPlans.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                        activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Production Reports
                </button>
            </div>

            {/* Filter Bar */}
            {activeTab === 'plans' && (
                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by plan #, title, project, customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-900 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="In Production">In Production</option>
                            <option value="Completed">Completed</option>
                            <option value="Delayed">Delayed</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold"
                        >
                            <option value="All">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setDelayOnly(!delayOnly)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                delayOnly ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Overdue Only
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 1: PRODUCTION PLANS LIST */}
            {activeTab === 'plans' && (
                <div className="space-y-4">
                    {filteredPlans.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
                            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h3 className="font-bold text-slate-800 dark:text-white">No Production Plans Found</h3>
                            <p className="text-xs text-slate-500 mt-1">Create your first fabrication production plan or adjust search filters.</p>
                        </div>
                    ) : (
                        filteredPlans.map(plan => {
                            const completionPct = plan.totalPlannedQuantity > 0 
                                ? Math.min(100, Math.round((plan.totalCompletedQuantity / plan.totalPlannedQuantity) * 100))
                                : 0;

                            return (
                                <div
                                    key={plan._id}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4"
                                >
                                    {/* Top Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-black text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                                                {plan.planNumber}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                plan.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                                                plan.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {plan.priority} Priority
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                plan.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                plan.status === 'In Production' ? 'bg-indigo-100 text-indigo-700' :
                                                plan.isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {plan.isOverdue && plan.status !== 'Completed' ? 'OVERDUE' : plan.status}
                                            </span>
                                            {plan.hasConflicts && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Schedule Collision
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>
                                                {new Date(plan.plannedStartDate).toLocaleDateString()} &rarr;{' '}
                                                <strong className={plan.isOverdue ? 'text-rose-600' : ''}>
                                                    {new Date(plan.plannedCompletionDate).toLocaleDateString()}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">{plan.title}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Project: <strong className="text-slate-700 dark:text-slate-300">{plan.projectTitle}</strong> • Customer: {plan.customerName}
                                            </p>
                                        </div>
                                        <div className="text-right sm:min-w-[140px]">
                                            <span className="text-xs font-bold text-slate-400 block">Quantity Progress</span>
                                            <span className="text-sm font-black text-indigo-600 font-poppins">
                                                {plan.totalCompletedQuantity} / {plan.totalPlannedQuantity} {plan.unit}
                                            </span>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className={`h-full transition-all duration-300 ${completionPct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                    style={{ width: `${completionPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stages Stepper */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                            Fabrication Stages ({plan.stages?.length || 0})
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                            {(plan.stages || []).map((stage, sIdx) => (
                                                <div
                                                    key={stage._id || sIdx}
                                                    className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                                            {stage.sequence}. {stage.stageName}
                                                        </span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                                            stage.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            stage.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {stage.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 flex justify-between">
                                                        <span>Machine: {stage.machineName || 'Manual Work'}</span>
                                                        <span className="font-bold font-poppins text-indigo-600">
                                                            {stage.completedQuantity || 0} / {stage.plannedQuantity} {stage.unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                                                        <span className="text-slate-400">
                                                            {new Date(stage.plannedEndDate).toLocaleDateString()}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPlan(plan);
                                                                    setSelectedStage(stage);
                                                                    setProgressForm({
                                                                        quantityProduced: '',
                                                                        hoursSpent: '',
                                                                        status: stage.status || 'In Progress',
                                                                        qcStatus: stage.qcStatus || 'Passed',
                                                                        delayReason: '',
                                                                        notes: ''
                                                                    });
                                                                    setShowProgressModal(true);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 font-bold"
                                                            >
                                                                Log Progress
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-2 text-xs">
                                        <div className="text-slate-400 text-[11px]">
                                            Created by {plan.createdByName || 'Supervisor'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedPlan(plan);
                                                    setRescheduleForm({
                                                        newStartDate: new Date(plan.plannedStartDate).toISOString().split('T')[0],
                                                        newEndDate: new Date(plan.plannedCompletionDate).toISOString().split('T')[0],
                                                        reason: ''
                                                    });
                                                    setShowRescheduleModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1 transition"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Reschedule
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TAB 2: CONFLICT MATRIX */}
            {activeTab === 'conflicts' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        <h2 className="text-base font-black text-slate-900 dark:text-white">Machine & Employee Scheduling Collisions</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                        The scheduling engine continuously detects machine or staff double-bookings across all active production jobs in the fabrication facility.
                    </p>

                    {conflictPlans.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            ✅ No scheduling conflicts detected! All machines and employees have dedicated non-overlapping time slots.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {conflictPlans.map(plan => (
                                <div key={plan._id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-2">
                                    <div className="flex justify-between items-center font-bold text-rose-900 dark:text-rose-200">
                                        <span>Plan: {plan.planNumber} — {plan.title}</span>
                                        <span className="font-normal text-rose-600">{plan.conflictDetails?.length || 0} Conflict(s)</span>
                                    </div>
                                    <div className="space-y-1.5 pl-3 border-l-2 border-rose-400">
                                        {(plan.conflictDetails || []).map((c, cIdx) => (
                                            <div key={cIdx} className="text-slate-700 dark:text-slate-300">
                                                <strong>[{c.type === 'MACHINE_CONFLICT' ? 'Machine Collision' : 'Staff Overlap'}]:</strong> {c.entityName} is double-booked with order <strong>{c.conflictingPlanNumber}</strong>. Details: <em>{c.stageName}</em>.
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: PRODUCTION REPORTS */}
            {activeTab === 'reports' && reportsSummary && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">Fabrication Throughput & Delay Audit</h2>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >
                            Export Production Report
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <span className="text-xs text-slate-400 font-bold uppercase">Total Planned Units</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{reportsSummary.totalPlannedQty}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase">Completed Fabricated Units</span>
                            <p className="text-2xl font-black text-emerald-600 mt-1">{reportsSummary.totalCompletedQty}</p>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
                            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase">Throughput Efficiency</span>
                            <p className="text-2xl font-black text-indigo-600 mt-1">{reportsSummary.throughputPercentage}%</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-3">Stage Status Breakdown</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {Object.entries(reportsSummary.stageStatusCounts || {}).map(([st, cnt]) => (
                                <div key={st} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                                    <span className="text-slate-500 text-[11px] font-bold block">{st}</span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">{cnt}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: CREATE PRODUCTION PLAN ═══════════ */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Create Production Plan from Job Order</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Plan Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 50-Ton Heavy Truss Fabrication"
                                        value={planForm.title}
                                        onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">Linked Project *</label>
                                        <div className="flex items-center gap-2">
                                            {loadingProjects && (
                                                <span className="text-[10px] font-semibold text-emerald-600 animate-pulse flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                                                </span>
                                            )}
                                            {projectsError && (
                                                <button
                                                    type="button"
                                                    onClick={fetchProjects}
                                                    className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <select
                                        required
                                        value={planForm.projectId}
                                        disabled={loadingProjects}
                                        onChange={(e) => {
                                            const pId = e.target.value;
                                            const p = projects.find(x => String(x._id) === pId);
                                            setPlanForm(prev => ({
                                                ...prev,
                                                projectId: pId,
                                                jobOrderNumber: p ? (p.title || `JO-${p._id.slice(-6)}`) : '',
                                                title: (!prev.title || prev.title.startsWith('Production Plan -')) && p ? `Production Plan - ${p.title}` : prev.title
                                            }));
                                        }}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold disabled:opacity-50"
                                    >
                                        <option value="">
                                            {loadingProjects
                                                ? 'Loading projects...'
                                                : projectsError
                                                ? 'Error loading projects (Click Retry)'
                                                : projects.length === 0
                                                ? 'No projects found in database'
                                                : 'Select Project / Job Order...'}
                                        </option>
                                        {eligibleProjects.length > 0 && (
                                            <optgroup label={`Eligible Job Orders (${eligibleProjects.length})`}>
                                                {eligibleProjects.map(p => {
                                                    const client = p.customerId?.name || (typeof p.customerId === 'string' ? p.customerId : 'Client');
                                                    const statusText = p.status ? ` • ${p.status}` : '';
                                                    return (
                                                        <option key={p._id} value={p._id}>
                                                            {p.title} ({client}{statusText})
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>
                                        )}
                                        {ineligibleProjects.length > 0 && (
                                            <optgroup label="Cancelled / Ineligible Projects">
                                                {ineligibleProjects.map(p => (
                                                    <option key={p._id} value={p._id} disabled>
                                                        {p.title} (Cancelled - Ineligible)
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    {projectsError && (
                                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">{projectsError}</p>
                                    )}
                                    {!loadingProjects && !projectsError && eligibleProjects.length === 0 && projects.length > 0 && (
                                        <p className="text-[10px] text-amber-500 mt-1 font-semibold">
                                            All existing projects are marked as Cancelled. Reactivate or create an active project to schedule production.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Planned Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={planForm.totalPlannedQuantity}
                                        onChange={(e) => setPlanForm({ ...planForm, totalPlannedQuantity: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Unit</label>
                                    <input
                                        type="text"
                                        value={planForm.unit}
                                        onChange={(e) => setPlanForm({ ...planForm, unit: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={planForm.plannedStartDate}
                                        onChange={(e) => setPlanForm({ ...planForm, plannedStartDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Completion Target *</label>
                                    <input
                                        type="date"
                                        required
                                        value={planForm.plannedCompletionDate}
                                        onChange={(e) => setPlanForm({ ...planForm, plannedCompletionDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Stages Configuration */}
                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-slate-500">Production Stages & Machine Assignment</span>
                                    <button
                                        type="button"
                                        onClick={handleAddStageToForm}
                                        className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Stage
                                    </button>
                                </div>

                                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                    {planForm.stages.map((st, sIdx) => (
                                        <div key={sIdx} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                value={st.stageName}
                                                onChange={(e) => handleStageFieldChange(sIdx, 'stageName', e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                                                placeholder="Stage Name"
                                            />
                                            <select
                                                value={st.machineId}
                                                onChange={(e) => handleStageFieldChange(sIdx, 'machineId', e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                                            >
                                                <option value="">No Machine (Manual)</option>
                                                {machines.map(m => (
                                                    <option key={m._id} value={m._id}>{m.name} ({m.code || 'EQP'})</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={st.plannedEndDate ? new Date(st.plannedEndDate).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleStageFieldChange(sIdx, 'plannedEndDate', e.target.value)}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = planForm.stages.filter((_, i) => i !== sIdx);
                                                        setPlanForm({ ...planForm, stages: updated });
                                                    }}
                                                    className="text-rose-500 hover:text-rose-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Schedule Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: LOG STAGE PROGRESS & QC ═══════════ */}
            {showProgressModal && selectedPlan && selectedStage && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Stage Progress</h3>
                                <p className="text-xs text-slate-500">{selectedPlan.planNumber}: {selectedStage.stageName}</p>
                            </div>
                            <button onClick={() => setShowProgressModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordProgress} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Quantity Produced</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        placeholder={`in ${selectedStage.unit}`}
                                        value={progressForm.quantityProduced}
                                        onChange={(e) => setProgressForm({ ...progressForm, quantityProduced: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Labor Hours Spent</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        placeholder="Hours"
                                        value={progressForm.hoursSpent}
                                        onChange={(e) => setProgressForm({ ...progressForm, hoursSpent: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Stage Status</label>
                                    <select
                                        value={progressForm.status}
                                        onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Delayed">Delayed</option>
                                        <option value="Blocked">Blocked</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Quality (QC)</label>
                                    <select
                                        value={progressForm.qcStatus}
                                        onChange={(e) => setProgressForm({ ...progressForm, qcStatus: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="Passed">QC Passed</option>
                                        <option value="Rework Required">Rework Needed</option>
                                        <option value="Pending">Inspection Pending</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Notes / Inspection Comments</label>
                                <textarea
                                    rows="2"
                                    value={progressForm.notes}
                                    onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowProgressModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Save Progress
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: RESCHEDULE ═══════════ */}
            {showRescheduleModal && selectedPlan && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Reschedule Production Plan</h3>
                                <p className="text-xs text-slate-500">{selectedPlan.planNumber}</p>
                            </div>
                            <button onClick={() => setShowRescheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReschedule} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">New Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={rescheduleForm.newStartDate}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, newStartDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">New End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={rescheduleForm.newEndDate}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, newEndDate: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Reschedule Reason</label>
                                <textarea
                                    rows="2"
                                    required
                                    placeholder="e.g. Raw steel delivery delayed / Machine maintenance overhaul"
                                    value={rescheduleForm.reason}
                                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRescheduleModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Update Timeline
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProductionPlanning;
