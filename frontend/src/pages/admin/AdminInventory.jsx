import React, { useState, useEffect } from 'react';
import { 
    Wrench, Package, AlertTriangle, CheckCircle2, Clock, User, Plus, 
    Search, Filter, RotateCcw, ArrowRightLeft, DollarSign, ShieldAlert, 
    X, Check, Hammer, Tag, Calendar, ChevronRight, History, Layers
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrencyINR } from '../../utils/pdfHelpers';

const AdminInventory = () => {
    const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'materials' | 'repairs'
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Items and Repairs Data
    const [tools, setTools] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [repairs, setRepairs] = useState([]);
    const [staffList, setStaffList] = useState([]);

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [toolStatusFilter, setToolStatusFilter] = useState('All'); // All, Available, Assigned, In Repair, Total Loss
    const [materialCategoryFilter, setMaterialCategoryFilter] = useState('All');
    const [repairOutcomeFilter, setRepairOutcomeFilter] = useState('All');

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [modalItemType, setModalItemType] = useState('tool');
    const [editingItem, setEditingItem] = useState(null);

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedToolForAssign, setSelectedToolForAssign] = useState(null);

    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedToolForReturn, setSelectedToolForReturn] = useState(null);

    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedMaterialForStock, setSelectedMaterialForStock] = useState(null);

    const [showRepairModal, setShowRepairModal] = useState(false);
    const [selectedToolForRepair, setSelectedToolForRepair] = useState(null);

    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedRepairToResolve, setSelectedRepairToResolve] = useState(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyItem, setHistoryItem] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '', code: '', category: 'General', location: 'Main Workshop Store', notes: '',
        brand: '', modelNumber: '', serialNumber: '', purchaseCost: 0, purchaseDate: '', condition: 'Good',
        quantity: 0, unit: 'Pcs', unitPrice: 0, minThreshold: 5
    });

    const [assignForm, setAssignForm] = useState({
        staffId: '', staffName: '', returnByDate: '', purpose: 'Site Project Duty'
    });

    const [returnForm, setReturnForm] = useState({
        returnCondition: 'Good', returnNotes: '', sendToRepair: false, repairVendor: 'In-House Workshop'
    });

    const [stockForm, setStockForm] = useState({
        type: 'IN', quantity: '', reason: 'Supplier Delivery Intake', reference: ''
    });

    const [repairForm, setRepairForm] = useState({
        issueDescription: '', repairVendor: 'In-House Workshop', repairCost: 0
    });

    const [resolveForm, setResolveForm] = useState({
        status: 'Repaired', outcome: 'Repaired', repairCost: 0, resolutionNotes: '', repairVendor: ''
    });

    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
    };

    // Load initial data
    useEffect(() => {
        fetchStats();
        fetchStaff();
    }, []);

    useEffect(() => {
        if (activeTab === 'tools') fetchTools();
        if (activeTab === 'materials') fetchMaterials();
        if (activeTab === 'repairs') fetchRepairs();
    }, [activeTab, toolStatusFilter, materialCategoryFilter, repairOutcomeFilter]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/inventory/stats');
            if (res.data.success) setStats(res.data.stats);
        } catch (err) {
            console.error('Stats fetch error:', err);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/auth/admin/users');
            if (Array.isArray(res.data)) {
                // Filter staff or active team members
                const staff = res.data.filter(u => u.role === 'staff' || u.role === 'admin');
                setStaffList(staff);
            }
        } catch (err) {
            console.warn('Failed to load staff list:', err);
        }
    };

    const fetchTools = async () => {
        setLoading(true);
        try {
            const params = { type: 'tool' };
            if (toolStatusFilter !== 'All') params.status = toolStatusFilter;
            if (toolStatusFilter === 'Total Loss') params.includeTotalLoss = 'true';
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await api.get('/inventory/items', { params });
            if (res.data.success) setTools(res.data.items);
        } catch (err) {
            showToast('Failed to load tools');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const params = { type: 'material' };
            if (materialCategoryFilter !== 'All') params.category = materialCategoryFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await api.get('/inventory/items', { params });
            if (res.data.success) setMaterials(res.data.items);
        } catch (err) {
            showToast('Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    const fetchRepairs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (repairOutcomeFilter !== 'All') params.outcome = repairOutcomeFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await api.get('/inventory/repairs', { params });
            if (res.data.success) setRepairs(res.data.repairs);
        } catch (err) {
            showToast('Failed to load repair records');
        } finally {
            setLoading(false);
        }
    };

    // Open Add Item Modal
    const handleOpenCreateItem = (type) => {
        setModalItemType(type);
        setEditingItem(null);
        setFormData({
            name: '',
            code: '',
            category: type === 'tool' ? 'Power Tools' : 'Raw Materials',
            location: 'Main Workshop Store',
            notes: '',
            brand: '',
            modelNumber: '',
            serialNumber: '',
            purchaseCost: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            condition: 'Good',
            quantity: 1,
            unit: type === 'tool' ? 'Pcs' : 'Kg',
            unitPrice: 0,
            minThreshold: 5
        });
        setShowItemModal(true);
    };

    // Submit Create / Edit Item
    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/inventory/items/${editingItem._id}`, formData);
                showToast(`✓ Updated ${formData.name}`);
            } else {
                await api.post('/inventory/items', { ...formData, type: modalItemType });
                showToast(`✓ Added ${formData.name}`);
            }
            setShowItemModal(false);
            fetchStats();
            if (modalItemType === 'tool') fetchTools();
            else fetchMaterials();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving item');
        }
    };

    // Delete Item
    const handleDeleteItem = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
        try {
            await api.delete(`/inventory/items/${id}`);
            showToast(`Deleted ${name}`);
            fetchStats();
            if (activeTab === 'tools') fetchTools();
            else fetchMaterials();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    // Assign Tool Modal
    const handleOpenAssign = (tool) => {
        setSelectedToolForAssign(tool);
        // Default return-by: 7 days from now
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        setAssignForm({
            staffId: staffList[0]?._id || '',
            staffName: staffList[0]?.name || '',
            returnByDate: nextWeek,
            purpose: 'Site Engineering Duty'
        });
        setShowAssignModal(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            const selectedStaff = staffList.find(s => s._id === assignForm.staffId);
            const payload = {
                staffId: assignForm.staffId,
                staffName: selectedStaff ? selectedStaff.name : assignForm.staffName,
                returnByDate: assignForm.returnByDate,
                purpose: assignForm.purpose
            };

            await api.post(`/inventory/tools/${selectedToolForAssign._id}/assign`, payload);
            showToast(`✓ Tool assigned to ${payload.staffName}`);
            setShowAssignModal(false);
            fetchStats();
            fetchTools();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign tool');
        }
    };

    // Return Tool Modal
    const handleOpenReturn = (tool) => {
        setSelectedToolForReturn(tool);
        setReturnForm({
            returnCondition: 'Good',
            returnNotes: 'Returned in good operating condition',
            sendToRepair: false,
            repairVendor: 'In-House Workshop'
        });
        setShowReturnModal(true);
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/inventory/tools/${selectedToolForReturn._id}/return`, returnForm);
            showToast(res.data.message || 'Tool returned successfully');
            setShowReturnModal(false);
            fetchStats();
            fetchTools();
            if (returnForm.sendToRepair || returnForm.returnCondition === 'Needs Repair' || returnForm.returnCondition === 'Damaged') {
                fetchRepairs();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record return');
        }
    };

    // Adjust Stock Modal
    const handleOpenStock = (material) => {
        setSelectedMaterialForStock(material);
        setStockForm({
            type: 'IN',
            quantity: '',
            reason: 'Supplier Delivery Intake',
            reference: ''
        });
        setShowStockModal(true);
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/inventory/materials/${selectedMaterialForStock._id}/stock`, stockForm);
            showToast('✓ Stock quantity updated');
            setShowStockModal(false);
            fetchStats();
            fetchMaterials();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update stock');
        }
    };

    // Send Tool to Repair Manually
    const handleOpenRepair = (tool) => {
        setSelectedToolForRepair(tool);
        setRepairForm({
            issueDescription: 'Motor overheating / blade arbor alignment needed',
            repairVendor: 'In-House Workshop',
            repairCost: 0
        });
        setShowRepairModal(true);
    };

    const handleRepairSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/inventory/repairs', {
                toolId: selectedToolForRepair._id,
                ...repairForm
            });
            showToast(`✓ "${selectedToolForRepair.name}" sent to repairs`);
            setShowRepairModal(false);
            fetchStats();
            fetchTools();
            fetchRepairs();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initiate repair');
        }
    };

    // Resolve Repair Modal (Repaired vs Total loss)
    const handleOpenResolve = (repair) => {
        setSelectedRepairToResolve(repair);
        setResolveForm({
            status: 'Repaired',
            outcome: 'Repaired',
            repairCost: repair.repairCost || 0,
            resolutionNotes: 'Tested and certified ready for workshop service',
            repairVendor: repair.repairVendor || 'In-House Workshop'
        });
        setShowResolveModal(true);
    };

    const handleResolveSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/inventory/repairs/${selectedRepairToResolve._id}`, resolveForm);
            showToast(
                resolveForm.outcome === 'Repaired' 
                    ? `✓ Tool repaired and restored to Available inventory` 
                    : `✓ Tool decommissioned as Total Loss (history preserved)`
            );
            setShowResolveModal(false);
            fetchStats();
            fetchRepairs();
            fetchTools();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to resolve repair');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200">
            {/* Toast Notice */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-bounce">
                    <CheckCircle2 className="w-4 h-4" /> {toastMessage}
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                        <Package className="w-4 h-4" /> Plant Asset & Stock Control
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Inventory & Tool Management
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Track tools custody, returns, maintenance repairs, and materials inventory without AI credit consumption.
                    </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => handleOpenCreateItem('tool')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add New Tool
                    </button>
                    <button
                        onClick={() => handleOpenCreateItem('material')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Material / Product
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Available Tools</span>
                            <Wrench className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.tools.available}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {stats.tools.assigned} on loan · {stats.tools.inRepair} in repair
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Active Repairs</span>
                            <Hammer className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.repairs.active}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            Total Spend: {formatCurrencyINR(stats.repairs.totalSpend)}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Materials / Products</span>
                            <Layers className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.materials.total}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            Categories & Stock lines
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Low Stock Items</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.materials.lowStock}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Below reorder threshold</p>
                    </div>
                </div>
            )}

            {/* Navigation Tab Bar */}
            <div className="flex items-center gap-2 mb-6 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-fit">
                <button
                    onClick={() => { setActiveTab('tools'); setSearchQuery(''); }}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
                        activeTab === 'tools'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Wrench className="w-4 h-4" /> Tools Inventory ({tools.length})
                </button>
                <button
                    onClick={() => { setActiveTab('materials'); setSearchQuery(''); }}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
                        activeTab === 'materials'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Package className="w-4 h-4" /> Materials / Products ({materials.length})
                </button>
                <button
                    onClick={() => { setActiveTab('repairs'); setSearchQuery(''); }}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
                        activeTab === 'repairs'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Hammer className="w-4 h-4" /> Tool Repairs ({repairs.length})
                </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'tools' 
                                    ? "Search tools by name, code, brand, serial..." 
                                    : activeTab === 'materials'
                                    ? "Search materials by name, SKU, location..."
                                    : "Search repairs by tool name, issue, vendor..."
                            }
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (activeTab === 'tools') fetchTools();
                                    else if (activeTab === 'materials') fetchMaterials();
                                    else fetchRepairs();
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'tools') fetchTools();
                            else if (activeTab === 'materials') fetchMaterials();
                            else fetchRepairs();
                        }}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold"
                    >
                        Search
                    </button>
                </div>

                {/* Sub-Filters per tab */}
                <div className="flex items-center gap-2">
                    {activeTab === 'tools' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                            <span className="text-slate-400 text-[10px] uppercase font-black">Status:</span>
                            {['All', 'Available', 'Assigned', 'In Repair', 'Total Loss'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setToolStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-xl transition ${
                                        toolStatusFilter === st
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'repairs' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                            <span className="text-slate-400 text-[10px] uppercase font-black">Outcome:</span>
                            {['All', 'Pending', 'Repaired', 'Total loss'].map(ot => (
                                <button
                                    key={ot}
                                    onClick={() => setRepairOutcomeFilter(ot)}
                                    className={`px-3 py-1.5 rounded-xl transition ${
                                        repairOutcomeFilter === ot
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {ot}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════ TAB 1: TOOLS SECTION ══════════════ */}
            {activeTab === 'tools' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="p-4">Tool & Code</th>
                                    <th className="p-4">Brand / Model</th>
                                    <th className="p-4">Condition</th>
                                    <th className="p-4">Status & Custody</th>
                                    <th className="p-4">Return-By Date</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {tools.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                            No tools found matching your current filter. Click "+ Add New Tool" to register machinery.
                                        </td>
                                    </tr>
                                ) : (
                                    tools.map(tool => {
                                        const isOverdue = tool.status === 'Assigned' && tool.currentAssignment?.returnByDate && (new Date(tool.currentAssignment.returnByDate) < new Date());

                                        return (
                                            <tr key={tool._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 dark:text-white text-sm">{tool.name}</div>
                                                    <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">{tool.code}</div>
                                                    <div className="text-[10px] text-slate-400">{tool.location}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300">{tool.brand || '—'}</div>
                                                    <div className="text-[10px] text-slate-400">{tool.modelNumber ? `Mod: ${tool.modelNumber}` : ''} {tool.serialNumber ? `SN: ${tool.serialNumber}` : ''}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                        tool.condition === 'New' || tool.condition === 'Good'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : tool.condition === 'Needs Repair'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                    }`}>
                                                        {tool.condition}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            tool.status === 'Available' ? 'bg-emerald-500' : tool.status === 'Assigned' ? 'bg-indigo-500 animate-pulse' : tool.status === 'In Repair' ? 'bg-amber-500' : 'bg-slate-400'
                                                        }`}></span>
                                                        <span className="font-black text-xs uppercase">{tool.status}</span>
                                                    </div>
                                                    {tool.status === 'Assigned' && tool.currentAssignment && (
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                                                            <User className="w-3 h-3 text-indigo-500" />
                                                            {tool.currentAssignment.staffName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {tool.status === 'Assigned' && tool.currentAssignment?.returnByDate ? (
                                                        <div>
                                                            <div className={`font-bold ${isOverdue ? 'text-rose-600 font-black animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {new Date(tool.currentAssignment.returnByDate).toLocaleDateString()}
                                                            </div>
                                                            {isOverdue && (
                                                                <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200">
                                                                    Overdue Return
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                        {tool.status === 'Available' && (
                                                            <button
                                                                onClick={() => handleOpenAssign(tool)}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow"
                                                                title="Assign to staff member"
                                                            >
                                                                Assign
                                                            </button>
                                                        )}

                                                        {tool.status === 'Assigned' && (
                                                            <button
                                                                onClick={() => handleOpenReturn(tool)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow"
                                                                title="Record return and inspect condition"
                                                            >
                                                                Record Return
                                                            </button>
                                                        )}

                                                        {tool.status !== 'In Repair' && tool.status !== 'Total Loss' && (
                                                            <button
                                                                onClick={() => handleOpenRepair(tool)}
                                                                className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 rounded-xl font-bold text-xs"
                                                                title="Send to repair workshop"
                                                            >
                                                                <Hammer className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => { setHistoryItem(tool); setShowHistoryModal(true); }}
                                                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-xs"
                                                            title="Assignment & Maintenance History"
                                                        >
                                                            <History className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteItem(tool._id, tool.name)}
                                                            className="text-slate-400 hover:text-rose-600 p-1.5 transition"
                                                            title="Delete tool"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB 2: MATERIALS / PRODUCTS SECTION ══════════════ */}
            {activeTab === 'materials' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="p-4">Material / Product</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">In-Stock Quantity</th>
                                    <th className="p-4">Min Reorder Level</th>
                                    <th className="p-4">Unit Rate</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {materials.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                            No materials or fabricated products registered yet. Click "+ Add Material / Product" above.
                                        </td>
                                    </tr>
                                ) : (
                                    materials.map(mat => {
                                        const isLowStock = (mat.quantity || 0) <= (mat.minThreshold || 0);

                                        return (
                                            <tr key={mat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 dark:text-white text-sm">{mat.name}</div>
                                                    <div className="font-mono text-[11px] text-slate-400 font-bold">{mat.code}</div>
                                                    <div className="text-[10px] text-slate-400">{mat.location}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                                        {mat.category}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`text-base font-black ${isLowStock ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                                                        {mat.quantity} <span className="text-xs font-normal text-slate-500">{mat.unit}</span>
                                                    </div>
                                                    {isLowStock && (
                                                        <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200">
                                                            Low Stock Warning
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-bold text-slate-500">
                                                    {mat.minThreshold} {mat.unit}
                                                </td>
                                                <td className="p-4 font-bold text-slate-900 dark:text-white">
                                                    {formatCurrencyINR(mat.unitPrice)} / {mat.unit}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenStock(mat)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow"
                                                        >
                                                            <ArrowRightLeft className="w-3.5 h-3.5" /> Adjust Stock
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(mat._id, mat.name)}
                                                            className="text-slate-400 hover:text-rose-600 p-1.5 transition"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════ TAB 3: TOOL REPAIRS SECTION ══════════════ */}
            {activeTab === 'repairs' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="p-4">Tool / Asset</th>
                                    <th className="p-4">Reported Issue & Date</th>
                                    <th className="p-4">Repair Workshop</th>
                                    <th className="p-4">Status & Cost</th>
                                    <th className="p-4">Final Outcome</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {repairs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                            No repair tickets logged. When tools are damaged or sent to service, they appear here.
                                        </td>
                                    </tr>
                                ) : (
                                    repairs.map(rep => {
                                        return (
                                            <tr key={rep._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 dark:text-white text-sm">{rep.toolName}</div>
                                                    <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">{rep.toolCode || '—'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-slate-800 dark:text-slate-200 font-bold">{rep.issueDescription}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        Reported: {new Date(rep.reportedDate).toLocaleDateString()} by {rep.reportedBy}
                                                    </p>
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                                    {rep.repairVendor || 'In-House Workshop'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 dark:text-white">
                                                        {formatCurrencyINR(rep.repairCost || 0)}
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-block mt-0.5 ${
                                                        rep.status === 'Repaired' 
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                                            : rep.status === 'Total loss'
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    }`}>
                                                        {rep.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {rep.outcome === 'Repaired' ? (
                                                        <span className="text-emerald-600 font-black text-xs flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Repaired & Available
                                                        </span>
                                                    ) : rep.outcome === 'Total loss' ? (
                                                        <span className="text-rose-600 font-black text-xs flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Total Loss (Archived)
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 font-bold text-xs">
                                                            Under Evaluation
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {rep.outcome === 'Pending' ? (
                                                        <button
                                                            onClick={() => handleOpenResolve(rep)}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow"
                                                        >
                                                            Update / Finalize Outcome
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenResolve(rep)}
                                                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl font-bold text-xs"
                                                        >
                                                            Edit Record
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADD / EDIT ITEM ══════════════ */}
            {showItemModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                {editingItem ? 'Edit Item' : modalItemType === 'tool' ? 'Register New Tool' : 'Add Material / Product'}
                            </h2>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-1">Item Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={modalItemType === 'tool' ? "e.g. Bosch Heavy Rotary Hammer 26mm" : "e.g. ISMB 150 Structural Steel I-Beam"}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-500 mb-1">Tool Code / SKU</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="Auto-generated if empty"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Category</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder={modalItemType === 'tool' ? "Power Tools, Welding, Hand Tools" : "Raw Materials, Fasteners, Paints"}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            {modalItemType === 'tool' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-500 mb-1">Brand</label>
                                            <input
                                                type="text"
                                                value={formData.brand}
                                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                placeholder="Bosch, DeWalt, Makita"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1">Serial Number</label>
                                            <input
                                                type="text"
                                                value={formData.serialNumber}
                                                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                                placeholder="Serial no. on tool plate"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-500 mb-1">Purchase Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.purchaseCost}
                                                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1">Initial Condition</label>
                                            <select
                                                value={formData.condition}
                                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="New">New</option>
                                                <option value="Good">Good</option>
                                                <option value="Fair">Fair</option>
                                                <option value="Needs Repair">Needs Repair</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-slate-500 mb-1">Quantity *</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1">Unit</label>
                                            <input
                                                type="text"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                placeholder="Kg, Pcs, Meters, Bags"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1">Min Threshold</label>
                                            <input
                                                type="number"
                                                value={formData.minThreshold}
                                                onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 mb-1">Unit Price / Valuation (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.unitPrice}
                                            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-slate-500 mb-1">Storage Location / Rack</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Workshop Bay 2, Tool Rack B"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowItemModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow"
                                >
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ASSIGN TOOL TO STAFF ══════════════ */}
            {showAssignModal && selectedToolForAssign && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Assign Tool to Staff</h2>
                                <p className="text-xs text-indigo-600 font-bold">{selectedToolForAssign.name} ({selectedToolForAssign.code})</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-1">Staff Member *</label>
                                {staffList.length > 0 ? (
                                    <select
                                        required
                                        value={assignForm.staffId}
                                        onChange={(e) => {
                                            const st = staffList.find(s => s._id === e.target.value);
                                            setAssignForm({
                                                ...assignForm,
                                                staffId: e.target.value,
                                                staffName: st ? st.name : ''
                                            });
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">Select registered staff...</option>
                                        {staffList.map(st => (
                                            <option key={st._id} value={st._id}>
                                                {st.name} {st.staff_id ? `(${st.staff_id})` : ''} — {st.department || st.role}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        placeholder="Staff member full name"
                                        value={assignForm.staffName}
                                        onChange={(e) => setAssignForm({ ...assignForm, staffName: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Return-By Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={assignForm.returnByDate}
                                    onChange={(e) => setAssignForm({ ...assignForm, returnByDate: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Purpose / Work Site</label>
                                <input
                                    type="text"
                                    value={assignForm.purpose}
                                    onChange={(e) => setAssignForm({ ...assignForm, purpose: e.target.value })}
                                    placeholder="e.g. Aluva Site Truss Assembly"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow"
                                >
                                    Confirm Assignment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: RECORD RETURN ══════════════ */}
            {showReturnModal && selectedToolForReturn && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Record Tool Return</h2>
                                <p className="text-xs text-indigo-600 font-bold">
                                    {selectedToolForReturn.name} (Held by: {selectedToolForReturn.currentAssignment?.staffName})
                                </p>
                            </div>
                            <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-1">Return Condition *</label>
                                <select
                                    value={returnForm.returnCondition}
                                    onChange={(e) => {
                                        const cond = e.target.value;
                                        setReturnForm({
                                            ...returnForm,
                                            returnCondition: cond,
                                            sendToRepair: cond === 'Needs Repair' || cond === 'Damaged'
                                        });
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                >
                                    <option value="Good">Good (Ready for next use)</option>
                                    <option value="Normal Wear">Normal Wear (Clean)</option>
                                    <option value="Needs Repair">Needs Repair (Minor Fault / Service Needed)</option>
                                    <option value="Damaged">Damaged (Broken Part / Heavy Fault)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Return Inspection Notes</label>
                                <textarea
                                    rows={3}
                                    value={returnForm.returnNotes}
                                    onChange={(e) => setReturnForm({ ...returnForm, returnNotes: e.target.value })}
                                    placeholder="Detail any observations upon physical handover..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                                <label className="flex items-center gap-2 cursor-pointer text-amber-900 dark:text-amber-300">
                                    <input
                                        type="checkbox"
                                        checked={returnForm.sendToRepair}
                                        onChange={(e) => setReturnForm({ ...returnForm, sendToRepair: e.target.checked })}
                                        className="w-4 h-4 rounded text-amber-600"
                                    />
                                    Immediately log and send to Repairs section
                                </label>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReturnModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                                >
                                    Confirm Return
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: SEND TO REPAIR ══════════════ */}
            {showRepairModal && selectedToolForRepair && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Send Tool to Repair</h2>
                                <p className="text-xs text-amber-600 font-bold">{selectedToolForRepair.name} ({selectedToolForRepair.code})</p>
                            </div>
                            <button onClick={() => setShowRepairModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRepairSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-1">Issue / Damage Description *</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={repairForm.issueDescription}
                                    onChange={(e) => setRepairForm({ ...repairForm, issueDescription: e.target.value })}
                                    placeholder="Describe faults, symptoms, or broken components..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-500 mb-1">Workshop / Vendor</label>
                                    <input
                                        type="text"
                                        value={repairForm.repairVendor}
                                        onChange={(e) => setRepairForm({ ...repairForm, repairVendor: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Estimated Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={repairForm.repairCost}
                                        onChange={(e) => setRepairForm({ ...repairForm, repairCost: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRepairModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow"
                                >
                                    Dispatch to Repair
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: RESOLVE REPAIR (REPAIRED VS TOTAL LOSS) ══════════════ */}
            {showResolveModal && selectedRepairToResolve && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Finalize Repair Outcome</h2>
                                <p className="text-xs text-indigo-600 font-bold">{selectedRepairToResolve.toolName}</p>
                            </div>
                            <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-2">Final Outcome *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setResolveForm({ ...resolveForm, outcome: 'Repaired', status: 'Repaired' })}
                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                                            resolveForm.outcome === 'Repaired'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        <span className="font-black uppercase text-[11px]">Repaired</span>
                                        <span className="text-[9px] text-slate-400 text-center font-normal">Restores tool to Available inventory</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setResolveForm({ ...resolveForm, outcome: 'Total loss', status: 'Total loss' })}
                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                                            resolveForm.outcome === 'Total loss'
                                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 shadow-md ring-2 ring-rose-500'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                                        <span className="font-black uppercase text-[11px]">Total Loss</span>
                                        <span className="text-[9px] text-slate-400 text-center font-normal">Removes from available tools, preserves audit</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-500 mb-1">Final Repair Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={resolveForm.repairCost}
                                        onChange={(e) => setResolveForm({ ...resolveForm, repairCost: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1">Repair Workshop / Vendor</label>
                                    <input
                                        type="text"
                                        value={resolveForm.repairVendor}
                                        onChange={(e) => setResolveForm({ ...resolveForm, repairVendor: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Resolution Notes / Reason</label>
                                <textarea
                                    rows={3}
                                    value={resolveForm.resolutionNotes}
                                    onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                                    placeholder={resolveForm.outcome === 'Repaired' ? "Replaced armature & bearings, tested OK" : "Burned stator coil beyond economic repair"}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowResolveModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`px-5 py-2 text-white rounded-xl shadow ${
                                        resolveForm.outcome === 'Repaired' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                                    }`}
                                >
                                    Confirm & Save Outcome
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: ADJUST MATERIAL STOCK ══════════════ */}
            {showStockModal && selectedMaterialForStock && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Adjust Material Stock</h2>
                                <p className="text-xs text-emerald-600 font-bold">
                                    {selectedMaterialForStock.name} (Current: {selectedMaterialForStock.quantity} {selectedMaterialForStock.unit})
                                </p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleStockSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-500 mb-1">Adjustment Type *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStockForm({ ...stockForm, type: 'IN' })}
                                        className={`py-2 rounded-xl border text-center font-bold ${
                                            stockForm.type === 'IN'
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        + IN (Intake)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStockForm({ ...stockForm, type: 'OUT' })}
                                        className={`py-2 rounded-xl border text-center font-bold ${
                                            stockForm.type === 'OUT'
                                                ? 'bg-rose-600 text-white border-rose-600'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        - OUT (Issued)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStockForm({ ...stockForm, type: 'ADJUSTMENT' })}
                                        className={`py-2 rounded-xl border text-center font-bold ${
                                            stockForm.type === 'ADJUSTMENT'
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        = Set Total
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">
                                    Quantity ({selectedMaterialForStock.unit}) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.1"
                                    step="any"
                                    value={stockForm.quantity}
                                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 mb-1">Reason / Project Reference</label>
                                <input
                                    type="text"
                                    value={stockForm.reason}
                                    onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                                    placeholder="e.g. Dispatched to Site A / Physical inventory audit"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowStockModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
                                >
                                    Save Stock Movement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: TOOL ASSIGNMENT & RETURN AUDIT HISTORY ══════════════ */}
            {showHistoryModal && historyItem && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Audit & Assignment History</h2>
                                <p className="text-xs text-indigo-600 font-bold">{historyItem.name} ({historyItem.code})</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {historyItem.assignmentHistory?.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6 font-bold">
                                No previous assignment cycles recorded yet for this tool.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {historyItem.assignmentHistory.map((rec, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-indigo-500" /> {rec.staffName}
                                            </span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-black uppercase">
                                                {rec.returnCondition || 'Good'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            Assigned: {new Date(rec.assignedDate).toLocaleDateString()} · Returned: {rec.actualReturnDate ? new Date(rec.actualReturnDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                        {rec.returnNotes && (
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-100 dark:border-slate-700">
                                                "{rec.returnNotes}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                            >
                                Close History
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInventory;
