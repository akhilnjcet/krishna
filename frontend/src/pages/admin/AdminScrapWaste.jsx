import React, { useState, useEffect } from 'react';
import { 
    Trash2, Plus, Search, Filter, CheckCircle2, TrendingUp, DollarSign,
    RefreshCw, Layers, ShieldCheck, ArrowRightLeft, FileDown, AlertTriangle,
    Building2, Scale, Archive
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { generateScrapReportPDF } from '../../services/pdfService';

const MATERIAL_TYPES = [
    'All Materials',
    'Mild Steel (MS)',
    'Stainless Steel (SS)',
    'Galvanized Iron (GI)',
    'Aluminium',
    'Copper / Brass',
    'Cast Iron',
    'Structural Pipes / Channels',
    'Plates & Flats Offcuts',
    'Consumables & Wire',
    'Other Scrap'
];

const WASTAGE_REASONS = [
    'Offcuts / Trimming',
    'Dimension Error / Cutting Scrap',
    'Punching / CNC Kerf Waste',
    'Welding Defect Cutout',
    'Material Handling Damage',
    'Over-Ordering Scrap',
    'Obsolete Engineering Offcuts',
    'Other Waste'
];

export default function AdminScrapWaste() {
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({});
    const [materialBreakdown, setMaterialBreakdown] = useState({});
    const [projects, setProjects] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedMaterialType, setSelectedMaterialType] = useState('All Materials');
    const [selectedScrapType, setSelectedScrapType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedScrap, setSelectedScrap] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        projectId: '',
        jobOrderNumber: '',
        materialId: '',
        materialName: '',
        materialType: 'Mild Steel (MS)',
        grade: 'IS 2062',
        quantity: '',
        unit: 'kg',
        estimatedUnitValue: '35',
        wastageReason: 'Offcuts / Trimming',
        scrapType: 'Reusable Offcut',
        storageLocation: 'Yard Scrap Bay 1',
        notes: ''
    });

    const [returnFormData, setReturnFormData] = useState({
        targetInventoryItemId: '',
        returnQuantity: '',
        notes: ''
    });

    const [saleFormData, setSaleFormData] = useState({
        buyerName: '',
        buyerPhone: '',
        buyerGst: '',
        salePricePerUnit: '',
        paymentMethod: 'cash',
        invoiceNumber: '',
        saleNotes: ''
    });

    const [verifyFormData, setVerifyFormData] = useState({
        verifiedQuantity: '',
        storageLocation: '',
        scrapType: '',
        notes: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchScrapRecords();
        fetchAnalytics();
        fetchProjectsAndInventory();
    }, [search, selectedMaterialType, selectedScrapType, selectedStatus, pagination.page]);

    const fetchProjectsAndInventory = async () => {
        try {
            const [pRes, iRes] = await Promise.all([
                api.get('/projects'),
                api.get('/inventory')
            ]);
            setProjects(pRes.data.projects || pRes.data || []);
            setInventoryItems(iRes.data.items || iRes.data || []);
        } catch (e) {
            console.error('Error fetching supporting lists:', e);
        }
    };

    const fetchScrapRecords = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: 20,
                search: search.trim(),
                materialType: selectedMaterialType === 'All Materials' ? 'all' : selectedMaterialType,
                scrapType: selectedScrapType,
                status: selectedStatus
            };
            const res = await api.get('/scrap', { params });
            if (res.data && res.data.success) {
                setRecords(res.data.records || []);
                setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
            }
        } catch (err) {
            console.error('Error fetching scrap records:', err);
            setActionMsg({ type: 'error', text: 'Failed to fetch scrap records.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/scrap/analytics');
            if (res.data && res.data.success) {
                setSummary(res.data.summary || {});
                setMaterialBreakdown(res.data.materialBreakdown || {});
            }
        } catch (e) {
            console.error('Error fetching scrap analytics:', e);
        }
    };

    const handleCreateScrap = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.post('/scrap', formData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowCreateModal(false);
                setFormData({
                    projectId: '',
                    jobOrderNumber: '',
                    materialId: '',
                    materialName: '',
                    materialType: 'Mild Steel (MS)',
                    grade: 'IS 2062',
                    quantity: '',
                    unit: 'kg',
                    estimatedUnitValue: '35',
                    wastageReason: 'Offcuts / Trimming',
                    scrapType: 'Reusable Offcut',
                    storageLocation: 'Yard Scrap Bay 1',
                    notes: ''
                });
                fetchScrapRecords();
                fetchAnalytics();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error recording scrap.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyScrap = async (e) => {
        e.preventDefault();
        if (!selectedScrap) return;
        setSubmitting(true);
        try {
            const res = await api.patch(`/scrap/${selectedScrap._id}/verify`, verifyFormData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowVerifyModal(false);
                fetchScrapRecords();
                fetchAnalytics();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error verifying scrap.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturnToStock = async (e) => {
        e.preventDefault();
        if (!selectedScrap) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/scrap/${selectedScrap._id}/return-to-stock`, returnFormData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowReturnModal(false);
                fetchScrapRecords();
                fetchAnalytics();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error returning scrap to stock.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRecordSale = async (e) => {
        e.preventDefault();
        if (!selectedScrap) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/scrap/${selectedScrap._id}/sale`, saleFormData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowSaleModal(false);
                fetchScrapRecords();
                fetchAnalytics();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error recording scrap sale.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportPDF = () => {
        generateScrapReportPDF(records, summary);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            Shopfloor Resource Optimization
                        </span>
                        <span className="text-xs text-slate-400">• Zero-Waste Material Accounting</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Material Scrap & Production Wastage Hub
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Track fabrication offcuts, approve reusable returns into stock, and log external scrap sales with direct financial ledger sync.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase transition-colors"
                    >
                        <FileDown className="w-4 h-4 text-rose-600" /> Export PDF Report
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Record Scrap Lot
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionMsg.text && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
                    actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                    <span>{actionMsg.text}</span>
                    <button onClick={() => setActionMsg({ type: '', text: '' })} className="font-bold underline ml-4">Dismiss</button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Scrap Weight</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{(summary.totalScrapQtyKg || 0).toLocaleString()} kg</p>
                    <span className="text-[10px] text-slate-400">{summary.totalLots || 0} active lots logged</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Reusable Offcuts</p>
                    <p className="text-xl font-black text-emerald-600 mt-1">{(summary.reusableOffcutQtyKg || 0).toLocaleString()} kg</p>
                    <span className="text-[10px] text-emerald-500 font-bold">{summary.reusableRecoveryPercentage || 0}% recovery rate</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Non-Reusable Waste</p>
                    <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{(summary.nonReusableQtyKg || 0).toLocaleString()} kg</p>
                    <span className="text-[10px] text-slate-400">Kerf / punching / turnings</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Returned to Stock</p>
                    <p className="text-xl font-black text-indigo-600 mt-1">{(summary.returnedToStockQtyKg || 0).toLocaleString()} kg</p>
                    <span className="text-[10px] text-indigo-500 font-bold">Credited to inventory</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">External Sales</p>
                    <p className="text-xl font-black text-blue-600 mt-1">₹{(summary.totalSoldValue || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-blue-500 font-bold">Posted to finance income</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Est. Yard Asset Value</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">₹{(summary.totalEstimatedValue || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400">Estimated value in yard</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Search by scrap lot code, material name, project, or buyer..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={selectedMaterialType}
                        onChange={e => setSelectedMaterialType(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                        {MATERIAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select
                        value={selectedScrapType}
                        onChange={e => setSelectedScrapType(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                        <option value="all">All Scrap Types</option>
                        <option value="Reusable Offcut">Reusable Offcut</option>
                        <option value="Non-Reusable Waste">Non-Reusable Waste</option>
                    </select>

                    <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Recorded">Recorded</option>
                        <option value="Verified">Verified in Yard</option>
                        <option value="Returned to Stock">Returned to Stock</option>
                        <option value="Sold">Sold</option>
                    </select>
                </div>
            </div>

            {/* Scrap Lots Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                                <th className="p-3.5">Lot Code</th>
                                <th className="p-3.5">Material & Grade</th>
                                <th className="p-3.5 text-right">Quantity</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5">Reason</th>
                                <th className="p-3.5">Location</th>
                                <th className="p-3.5">Project</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                                        Loading scrap records...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-400 font-medium">
                                        No scrap records found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                records.map(r => (
                                    <tr key={r._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                                            {r.scrapCode}
                                        </td>
                                        <td className="p-3.5">
                                            <p className="font-bold text-slate-900 dark:text-white">{r.materialName}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{r.materialType} • {r.grade}</p>
                                        </td>
                                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                                            {r.quantity} {r.unit}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                r.scrapType === 'Reusable Offcut'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {r.scrapType}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                            {r.wastageReason}
                                        </td>
                                        <td className="p-3.5 text-slate-500 font-medium">
                                            {r.storageLocation}
                                        </td>
                                        <td className="p-3.5 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                            {r.projectTitle || 'General Shopfloor'}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                r.status === 'Returned to Stock'
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                                                    : r.status === 'Sold'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                                    : r.status === 'Verified'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {r.status === 'Recorded' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedScrap(r);
                                                            setVerifyFormData({
                                                                verifiedQuantity: r.quantity,
                                                                storageLocation: r.storageLocation,
                                                                scrapType: r.scrapType,
                                                                notes: ''
                                                            });
                                                            setShowVerifyModal(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors"
                                                    >
                                                        Verify
                                                    </button>
                                                )}

                                                {r.scrapType === 'Reusable Offcut' && r.status !== 'Returned to Stock' && r.status !== 'Sold' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedScrap(r);
                                                            setReturnFormData({
                                                                targetInventoryItemId: r.materialId || '',
                                                                returnQuantity: r.quantity,
                                                                notes: `Returned ${r.quantity} ${r.unit} reusable offcuts from lot ${r.scrapCode}.`
                                                            });
                                                            setShowReturnModal(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors"
                                                    >
                                                        Return to Stock
                                                    </button>
                                                )}

                                                {r.status !== 'Returned to Stock' && r.status !== 'Sold' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedScrap(r);
                                                            setSaleFormData({
                                                                buyerName: '',
                                                                buyerPhone: '',
                                                                buyerGst: '',
                                                                salePricePerUnit: r.estimatedUnitValue || 35,
                                                                paymentMethod: 'cash',
                                                                invoiceNumber: '',
                                                                saleNotes: ''
                                                            });
                                                            setShowSaleModal(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors"
                                                    >
                                                        Sell
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Record Scrap Lot */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8 text-xs"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-black text-slate-900 dark:text-white text-base">Record Fabrication Scrap Lot</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold">✕</button>
                            </div>

                            <form onSubmit={handleCreateScrap} className="space-y-3.5 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Related Project</label>
                                        <select
                                            value={formData.projectId}
                                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            <option value="">-- General Shopfloor --</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Job Work Order #</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. JWO-2026-081"
                                            value={formData.jobOrderNumber}
                                            onChange={e => setFormData({ ...formData, jobOrderNumber: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Material Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. MS Square Pipe 50x50x2mm Offcut"
                                            value={formData.materialName}
                                            onChange={e => setFormData({ ...formData, materialName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Material Category</label>
                                        <select
                                            value={formData.materialType}
                                            onChange={e => setFormData({ ...formData, materialType: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            {MATERIAL_TYPES.filter(m => m !== 'All Materials').map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Quantity *</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            placeholder="e.g. 24.5"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit</label>
                                        <select
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            <option value="kg">kg</option>
                                            <option value="tons">tons</option>
                                            <option value="pcs">pcs</option>
                                            <option value="meters">meters</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Est. Price/Unit (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.estimatedUnitValue}
                                            onChange={e => setFormData({ ...formData, estimatedUnitValue: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Scrap Classification</label>
                                        <select
                                            value={formData.scrapType}
                                            onChange={e => setFormData({ ...formData, scrapType: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-emerald-600"
                                        >
                                            <option value="Reusable Offcut">Reusable Offcut (Can re-enter stock)</option>
                                            <option value="Non-Reusable Waste">Non-Reusable Waste (Sellable)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason for Wastage</label>
                                        <select
                                            value={formData.wastageReason}
                                            onChange={e => setFormData({ ...formData, wastageReason: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            {WASTAGE_REASONS.map(w => (
                                                <option key={w} value={w}>{w}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Yard Storage Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Yard Scrap Bay 1, Offcut Rack B"
                                        value={formData.storageLocation}
                                        onChange={e => setFormData({ ...formData, storageLocation: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                                    >
                                        {submitting ? 'Recording...' : 'Save Scrap Lot'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Return Reusable Offcut to Stock */}
            <AnimatePresence>
                {showReturnModal && selectedScrap && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs"
                        >
                            <h3 className="font-black text-slate-900 dark:text-white text-base">
                                Return Reusable Scrap to Active Stock
                            </h3>
                            <p className="text-slate-400 mt-0.5">
                                Lot: {selectedScrap.scrapCode} • {selectedScrap.materialName} ({selectedScrap.quantity} {selectedScrap.unit})
                            </p>

                            <form onSubmit={handleReturnToStock} className="space-y-3.5 mt-4">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Inventory Item *</label>
                                    <select
                                        required
                                        value={returnFormData.targetInventoryItemId}
                                        onChange={e => setReturnFormData({ ...returnFormData, targetInventoryItemId: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    >
                                        <option value="">-- Select Inventory Item to Credit --</option>
                                        {inventoryItems.map(item => (
                                            <option key={item._id} value={item._id}>
                                                {item.name} (Current: {item.currentStock || 0} {item.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Return Quantity ({selectedScrap.unit})</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        max={selectedScrap.quantity}
                                        value={returnFormData.returnQuantity}
                                        onChange={e => setReturnFormData({ ...returnFormData, returnQuantity: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Stock Adjustment Remarks</label>
                                    <textarea
                                        rows={2}
                                        value={returnFormData.notes}
                                        onChange={e => setReturnFormData({ ...returnFormData, notes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowReturnModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                                    >
                                        {submitting ? 'Crediting...' : 'Approve & Credit Stock'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: External Scrap Sale */}
            <AnimatePresence>
                {showSaleModal && selectedScrap && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs"
                        >
                            <h3 className="font-black text-slate-900 dark:text-white text-base">Record External Scrap Sale</h3>
                            <p className="text-slate-400 mt-0.5">
                                Lot: {selectedScrap.scrapCode} • {selectedScrap.quantity} {selectedScrap.unit} of {selectedScrap.materialName}
                            </p>

                            <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-700 dark:text-blue-300 text-[11px]">
                                ℹ This sale will automatically record an Income entry under <strong>Financial Hub → Scrap Sale</strong> as a single source of truth.
                            </div>

                            <form onSubmit={handleRecordSale} className="space-y-3.5 mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Buyer / Scrap Trader Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Palakkad Metal Traders"
                                            value={saleFormData.buyerName}
                                            onChange={e => setSaleFormData({ ...saleFormData, buyerName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Buyer Phone</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +91 98470 12345"
                                            value={saleFormData.buyerPhone}
                                            onChange={e => setSaleFormData({ ...saleFormData, buyerPhone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sale Rate / {selectedScrap.unit} (₹) *</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            required
                                            value={saleFormData.salePricePerUnit}
                                            onChange={e => setSaleFormData({ ...saleFormData, salePricePerUnit: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Sale Amount</label>
                                        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-blue-600 text-sm">
                                            ₹{((Number(selectedScrap.quantity) || 0) * (Number(saleFormData.salePricePerUnit) || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
                                        <select
                                            value={saleFormData.paymentMethod}
                                            onChange={e => setSaleFormData({ ...saleFormData, paymentMethod: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            <option value="cash">Cash Settlement</option>
                                            <option value="bank_transfer">Direct Bank Transfer / NEFT</option>
                                            <option value="upi">UPI Remittance</option>
                                            <option value="cheque">Cheque</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Invoice / Receipt #</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SCR-INV-0042"
                                            value={saleFormData.invoiceNumber}
                                            onChange={e => setSaleFormData({ ...saleFormData, invoiceNumber: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowSaleModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                                    >
                                        {submitting ? 'Posting...' : 'Confirm Sale & Post Income'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Physical Verification */}
            <AnimatePresence>
                {showVerifyModal && selectedScrap && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs"
                        >
                            <h3 className="font-black text-slate-900 dark:text-white text-base">Verify Yard Scrap Lot</h3>
                            <p className="text-slate-400 mt-0.5">Physical check for lot {selectedScrap.scrapCode}</p>

                            <form onSubmit={handleVerifyScrap} className="space-y-3 mt-4">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Verified Quantity ({selectedScrap.unit})</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={verifyFormData.verifiedQuantity}
                                        onChange={e => setVerifyFormData({ ...verifyFormData, verifiedQuantity: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Yard Location</label>
                                    <input
                                        type="text"
                                        value={verifyFormData.storageLocation}
                                        onChange={e => setVerifyFormData({ ...verifyFormData, storageLocation: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Verification Remarks</label>
                                    <textarea
                                        rows={2}
                                        value={verifyFormData.notes}
                                        onChange={e => setVerifyFormData({ ...verifyFormData, notes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowVerifyModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                                    >
                                        {submitting ? 'Verifying...' : 'Mark Verified'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
