import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    AlertTriangle, CheckCircle2, Clock, Wrench, ShieldAlert, 
    Plus, Search, RefreshCw, X, Filter, User, Layers, Hammer, FileText, ArrowRight
} from 'lucide-react';

const DEFECT_CATEGORIES = [
    'Welding defects',
    'Incorrect measurements',
    'Cutting errors',
    'Alignment problems',
    'Surface finishing defects',
    'Painting defects',
    'Material defects',
    'Installation defects',
    'Other defects'
];

const SEVERITY_COLORS = {
    Minor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200',
    Moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200',
    Critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200'
};

const AdminDefectsRework = () => {
    const [defects, setDefects] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [projects, setProjects] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSeverity, setSelectedSeverity] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showReinspectModal, setShowReinspectModal] = useState(false);
    const [selectedDefect, setSelectedDefect] = useState(null);

    // Form states
    const [createForm, setCreateForm] = useState({
        projectId: '',
        jobOrderNumber: '',
        productItem: '',
        defectCategory: 'Welding defects',
        description: '',
        responsibleDepartment: 'Fabrication',
        severity: 'Moderate',
        photos: ''
    });

    const [assignForm, setAssignForm] = useState({
        assignedEmployeeId: '',
        reworkInstructions: '',
        hourlyRate: 150
    });

    const [completeForm, setCompleteForm] = useState({
        labourHours: 2,
        selectedItemId: '',
        materialQty: 1,
        materialsList: []
    });

    const [reinspectForm, setReinspectForm] = useState({
        decision: 'Passed',
        notes: ''
    });

    useEffect(() => {
        fetchDefects();
        fetchAnalytics();
        fetchProjects();
        fetchMaterials();
        fetchStaff();
    }, []);

    const fetchDefects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/defects');
            if (res.data.success) {
                setDefects(res.data.defects);
            }
        } catch (err) {
            console.error('Error fetching defects:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/defects/analytics/summary');
            if (res.data.success) {
                setAnalytics(res.data.analytics);
            }
        } catch (err) {
            console.error('Error fetching defect analytics:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(Array.isArray(res.data) ? res.data : (res.data.projects || []));
        } catch (_) {}
    };

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/inventory/items', { params: { type: 'material' } });
            if (res.data.success) {
                setMaterials(res.data.items || []);
            }
        } catch (_) {}
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaffList(res.data || []);
        } catch (_) {}
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...createForm,
                photos: createForm.photos ? createForm.photos.split(',').map(p => p.trim()) : []
            };
            const res = await api.post('/defects', payload);
            if (res.data.success) {
                setShowCreateModal(false);
                fetchDefects();
                fetchAnalytics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating defect report');
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            const staff = staffList.find(s => s._id === assignForm.assignedEmployeeId);
            const payload = {
                assignedEmployeeId: assignForm.assignedEmployeeId,
                assignedEmployeeName: staff ? staff.name : 'Workshop Tech',
                reworkInstructions: assignForm.reworkInstructions,
                hourlyRate: Number(assignForm.hourlyRate) || 0
            };
            const res = await api.put(`/defects/${selectedDefect._id}/assign-rework`, payload);
            if (res.data.success) {
                setShowAssignModal(false);
                fetchDefects();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error assigning rework');
        }
    };

    const handleAddMaterialToComplete = () => {
        const mat = materials.find(m => m._id === completeForm.selectedItemId);
        if (!mat) return;
        const newEntry = {
            inventoryItemId: mat._id,
            materialName: mat.name,
            quantity: Number(completeForm.materialQty) || 1,
            unit: mat.unit || 'Pcs',
            unitCost: mat.unitPrice || 0,
            totalCost: (Number(completeForm.materialQty) || 1) * (mat.unitPrice || 0)
        };
        setCompleteForm({
            ...completeForm,
            materialsList: [...completeForm.materialsList, newEntry],
            selectedItemId: '',
            materialQty: 1
        });
    };

    const handleCompleteSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                labourHours: Number(completeForm.labourHours) || 0,
                additionalMaterials: completeForm.materialsList,
                status: 'Reinspection'
            };
            const res = await api.put(`/defects/${selectedDefect._id}/complete-rework`, payload);
            if (res.data.success) {
                setShowCompleteModal(false);
                fetchDefects();
                fetchAnalytics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error completing rework');
        }
    };

    const handleReinspectSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/defects/${selectedDefect._id}/reinspect`, reinspectForm);
            if (res.data.success) {
                setShowReinspectModal(false);
                fetchDefects();
                fetchAnalytics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error recording reinspection');
        }
    };

    const handleCloseDefect = async (id) => {
        if (!window.confirm('Mark this defect ticket as fully closed and resolved?')) return;
        try {
            await api.put(`/defects/${id}/close`);
            fetchDefects();
            fetchAnalytics();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close defect');
        }
    };

    // Filtered list
    const filteredDefects = defects.filter(d => {
        if (selectedCategory !== 'All' && d.defectCategory !== selectedCategory) return false;
        if (selectedSeverity !== 'All' && d.severity !== selectedSeverity) return false;
        if (selectedStatus !== 'All' && d.status !== selectedStatus) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                d.defectNumber.toLowerCase().includes(q) ||
                d.projectTitle.toLowerCase().includes(q) ||
                d.productItem.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Quality Control & Job Work Integrity
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Rework & Defect Management
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Track fabrication non-conformances, rework labour, materials, and repeat defect root-causes.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchDefects}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            setCreateForm({
                                projectId: projects[0]?._id || '',
                                jobOrderNumber: '',
                                productItem: '',
                                defectCategory: 'Welding defects',
                                description: '',
                                responsibleDepartment: 'Fabrication',
                                severity: 'Moderate',
                                photos: ''
                            });
                            setShowCreateModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/20 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Log New Defect
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            {analytics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Defects Logged</span>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{analytics.totalDefects}</p>
                        <p className="text-[10px] text-rose-500 mt-0.5">{analytics.repeatDefectsCount} repeat occurrences</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Rework Spend</span>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{analytics.totalReworkCost.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Labour + Added Material</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Rejection Rate</span>
                        <p className="text-2xl font-black text-rose-600">{analytics.rejectionRate}%</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{analytics.rejectionCount} QC rejections</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Critical Severity</span>
                        <p className="text-2xl font-black text-amber-600">{analytics.severityCounts?.Critical || 0}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Urgent workshop resolution</p>
                    </div>
                </div>
            )}

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search defects by ticket, project, item or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    >
                        <option value="All">All Categories</option>
                        {DEFECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    >
                        <option value="All">All Severity</option>
                        <option value="Minor">Minor</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Critical">Critical</option>
                    </select>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Defect Reported">Defect Reported</option>
                        <option value="Rework Assigned">Rework Assigned</option>
                        <option value="Reinspection">Reinspection</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Defects Queue */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading defect records...</div>
                ) : filteredDefects.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">No defect records found matching current criteria.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredDefects.map(d => (
                            <div key={d._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 transition bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{d.defectNumber}</span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[d.severity] || ''}`}>
                                            {d.severity} Severity
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            {d.status}
                                        </span>
                                        {d.isRepeatDefect && (
                                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                                Repeat Defect
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons based on status */}
                                    <div className="flex items-center gap-2 text-xs">
                                        {d.status === 'Defect Reported' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedDefect(d);
                                                    setAssignForm({
                                                        assignedEmployeeId: staffList[0]?._id || '',
                                                        reworkInstructions: '',
                                                        hourlyRate: 150
                                                    });
                                                    setShowAssignModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <Hammer className="w-3.5 h-3.5" /> Assign Rework
                                            </button>
                                        )}
                                        {d.status === 'Rework Assigned' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedDefect(d);
                                                    setCompleteForm({
                                                        labourHours: 2,
                                                        selectedItemId: materials[0]?._id || '',
                                                        materialQty: 1,
                                                        materialsList: []
                                                    });
                                                    setShowCompleteModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <Clock className="w-3.5 h-3.5" /> Record Rework Completion
                                            </button>
                                        )}
                                        {d.status === 'Reinspection' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedDefect(d);
                                                    setReinspectForm({ decision: 'Passed', notes: '' });
                                                    setShowReinspectModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> QC Reinspection
                                            </button>
                                        )}
                                        {['Approved', 'Rejected'].includes(d.status) && (
                                            <button
                                                onClick={() => handleCloseDefect(d._id)}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs"
                                            >
                                                Close Ticket
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex flex-wrap items-center gap-4 text-slate-500">
                                        <span>Project: <strong className="text-slate-800 dark:text-slate-200">{d.projectTitle}</strong></span>
                                        <span>Item: <strong className="text-slate-800 dark:text-slate-200">{d.productItem}</strong></span>
                                        <span>Category: <strong className="text-indigo-600 dark:text-indigo-400">{d.defectCategory}</strong></span>
                                        <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{d.responsibleDepartment}</strong></span>
                                    </div>

                                    <p className="text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        "{d.description}"
                                    </p>

                                    {d.assignedEmployeeName && (
                                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                                            <span>Assigned: <strong>{d.assignedEmployeeName}</strong></span>
                                            <span>Labour: <strong>{d.labourHours} hrs (₹{d.labourCost})</strong></span>
                                            <span>Material Rework Cost: <strong>₹{d.materialCost}</strong></span>
                                            <span>Total Cost: <strong className="text-indigo-600">₹{d.totalReworkCost}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Log Defect */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Log Defect / Non-Conformance</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Related Project *</label>
                                <select
                                    required
                                    value={createForm.projectId}
                                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                >
                                    <option value="">Select Project...</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Product / Fabricated Item *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Base Plate 12mm / Truss 4"
                                        value={createForm.productItem}
                                        onChange={(e) => setCreateForm({ ...createForm, productItem: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Job Work Order No</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. JWO-4412"
                                        value={createForm.jobOrderNumber}
                                        onChange={(e) => setCreateForm({ ...createForm, jobOrderNumber: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Defect Category *</label>
                                    <select
                                        value={createForm.defectCategory}
                                        onChange={(e) => setCreateForm({ ...createForm, defectCategory: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    >
                                        {DEFECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Severity</label>
                                    <select
                                        value={createForm.severity}
                                        onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    >
                                        <option value="Minor">Minor</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Defect Description *</label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Detailed description of defect, deviation from drawing, dimensions..."
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Photo URLs (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="https://cloudinary.com/photo1, https://..."
                                    value={createForm.photos}
                                    onChange={(e) => setCreateForm({ ...createForm, photos: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md">Submit Defect</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Assign Rework */}
            {showAssignModal && selectedDefect && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Assign Rework Job</h2>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assign to Fitter / Welder *</label>
                                <select
                                    required
                                    value={assignForm.assignedEmployeeId}
                                    onChange={(e) => setAssignForm({ ...assignForm, assignedEmployeeId: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                >
                                    <option value="">Select Staff...</option>
                                    {staffList.map(s => <option key={s._id} value={s._id}>{s.name} ({s.phone || 'Staff'})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Rework Instructions</label>
                                <textarea
                                    rows="3"
                                    placeholder="Grind weld and reweld with 7018 rod, re-check diagonal tolerance..."
                                    value={assignForm.reworkInstructions}
                                    onChange={(e) => setAssignForm({ ...assignForm, reworkInstructions: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Labour Rate (₹/hr)</label>
                                <input
                                    type="number"
                                    value={assignForm.hourlyRate}
                                    onChange={(e) => setAssignForm({ ...assignForm, hourlyRate: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md">Confirm Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Complete Rework */}
            {showCompleteModal && selectedDefect && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Record Rework Work & Costs</h2>
                            <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Labour Hours Spent *</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    required
                                    value={completeForm.labourHours}
                                    onChange={(e) => setCompleteForm({ ...completeForm, labourHours: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                />
                            </div>

                            {/* Additional Materials Consumed */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500">Additional Materials Used for Rework</label>
                                <div className="flex gap-2">
                                    <select
                                        value={completeForm.selectedItemId}
                                        onChange={(e) => setCompleteForm({ ...completeForm, selectedItemId: e.target.value })}
                                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Material...</option>
                                        {materials.map(m => <option key={m._id} value={m._id}>{m.name} (₹{m.unitPrice}/{m.unit})</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Qty"
                                        value={completeForm.materialQty}
                                        onChange={(e) => setCompleteForm({ ...completeForm, materialQty: e.target.value })}
                                        className="w-20 p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMaterialToComplete}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                                    >
                                        Add
                                    </button>
                                </div>

                                {completeForm.materialsList.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        {completeForm.materialsList.map((m, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                                <span>{m.materialName} ({m.quantity} {m.unit})</span>
                                                <span className="font-bold text-indigo-600">₹{m.totalCost}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md">Submit for Reinspection</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: QC Reinspection */}
            {showReinspectModal && selectedDefect && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">QC Reinspection Decision</h2>
                            <button onClick={() => setShowReinspectModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleReinspectSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReinspectForm({ ...reinspectForm, decision: 'Passed' })}
                                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                                        reinspectForm.decision === 'Passed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Passed (Approve)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReinspectForm({ ...reinspectForm, decision: 'Failed' })}
                                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                                        reinspectForm.decision === 'Failed' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800'
                                    }`}
                                >
                                    <AlertTriangle className="w-4 h-4" /> Failed (Reject)
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Inspector Notes</label>
                                <textarea
                                    rows="3"
                                    placeholder="Visual inspection result, dimensional check measurements..."
                                    value={reinspectForm.notes}
                                    onChange={(e) => setReinspectForm({ ...reinspectForm, notes: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowReinspectModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md">Confirm Decision</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDefectsRework;
