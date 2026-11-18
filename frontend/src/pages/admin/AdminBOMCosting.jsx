import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { 
    Layers, Package, CheckCircle2, Clock, AlertTriangle, ArrowRight, 
    ArrowLeftRight, FileText, Download, Plus, Trash2, Edit, Search, 
    Filter, RefreshCw, IndianRupee, TrendingUp, TrendingDown, ShieldAlert, 
    Check, X, Eye, FileSpreadsheet, Percent, Wrench, Truck, Briefcase, 
    ChevronRight, User, Calendar, AlertCircle, Info, Sparkles, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateGeneralReportPDF } from '../../services/pdfService';
import { formatCurrencyINR } from '../../utils/pdfHelpers';

const FABRICATION_CATEGORIES = [
    'MS Pipes', 'Square Pipes', 'Rectangular Pipes', 'GI Sheets', 'MS Sheets', 
    'Steel Plates', 'Angles', 'Channels', 'Flats', 'Welding Electrodes', 
    'Paint', 'Fasteners', 'Hardware', 'Electrical', 'Raw Material', 'Other Accessories', 'Custom'
];

const STANDARD_UNITS = ['Pcs', 'Kg', 'Meters', 'Sheets', 'Lengths', 'Litres', 'Boxes', 'Pack', 'Bundles', 'Bags', 'Nos'];

export default function AdminBOMCosting() {
    const [activeTab, setActiveTab] = useState('bom'); // 'bom' | 'requests' | 'consumption' | 'costing' | 'wastage'
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Master Data
    const [projects, setProjects] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [boms, setBoms] = useState([]);
    const [materialRequests, setMaterialRequests] = useState([]);
    const [consumptionLogs, setConsumptionLogs] = useState([]);
    const [projectsCosting, setProjectsCosting] = useState([]);
    const [dashboardSummary, setDashboardSummary] = useState(null);
    const [wastageReports, setWastageReports] = useState([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Modals
    const [showBOMModal, setShowBOMModal] = useState(false);
    const [editingBOM, setEditingBOM] = useState(null);
    const [selectedBOMView, setSelectedBOMView] = useState(null);

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ action: 'APPROVE', rejectionReason: '', allowNegativeStock: false, approvedItems: [] });

    const [showConsumeModal, setShowConsumeModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedCostingProject, setSelectedCostingProject] = useState(null);

    // Form: Create/Edit BOM
    const [bomForm, setBomForm] = useState({
        projectId: '',
        jobOrderNumber: '',
        description: '',
        items: [],
        estimatedLabourHours: 0,
        estimatedLabourRate: 150,
        estimatedTransportCost: 0,
        estimatedOtherCost: 0,
        warningThresholdPercentage: 100,
        notes: ''
    });

    // Form: Material Request
    const [requestForm, setRequestForm] = useState({
        projectId: '',
        bomId: '',
        priority: 'Normal',
        items: [{ inventoryItemId: '', requestedQty: 1, specification: '', notes: '' }],
        notes: ''
    });

    // Form: Record Consumption
    const [consumeForm, setConsumeForm] = useState({
        projectId: '',
        materialRequestId: '',
        inventoryItemId: '',
        materialName: '',
        consumedQty: 0,
        wastageQty: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Form: Return Material
    const [returnForm, setReturnForm] = useState({
        projectId: '',
        materialRequestId: '',
        inventoryItemId: '',
        returnedQty: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const notify = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
    };

    // Load initial data
    const fetchMasterData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projRes, invRes] = await Promise.all([
                api.get('/projects'),
                api.get('/inventory/items')
            ]);
            setProjects(Array.isArray(projRes.data) ? projRes.data : (projRes.data?.projects || []));
            const items = invRes.data?.items || invRes.data || [];
            setInventoryItems(items.filter(i => i.type === 'material'));
        } catch (err) {
            console.error('Error loading master data:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load master projects & inventory.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load BOM list
    const fetchBOMs = useCallback(async () => {
        try {
            const res = await api.get('/bom');
            if (res.data?.success) {
                setBoms(res.data.boms || []);
            }
        } catch (err) {
            console.error('Error fetching BOMs:', err);
        }
    }, []);

    // Load Material Requests
    const fetchMaterialRequests = useCallback(async () => {
        try {
            const res = await api.get('/material-requests');
            if (res.data?.success) {
                setMaterialRequests(res.data.requests || []);
            }
        } catch (err) {
            console.error('Error fetching material requests:', err);
        }
    }, []);

    // Load Consumption History
    const fetchConsumptionHistory = useCallback(async () => {
        try {
            const res = await api.get('/material-consumption/history');
            if (res.data?.success) {
                setConsumptionLogs(res.data.history || []);
            }
        } catch (err) {
            console.error('Error fetching consumption history:', err);
        }
    }, []);

    // Load Project Costing & Dashboard Summary
    const fetchCostingData = useCallback(async () => {
        try {
            const [costingRes, summaryRes] = await Promise.all([
                api.get('/project-costing'),
                api.get('/project-costing/dashboard/summary')
            ]);
            if (costingRes.data?.success) {
                setProjectsCosting(costingRes.data.projectsCosting || []);
            }
            if (summaryRes.data?.success) {
                setDashboardSummary(summaryRes.data.summary || null);
            }
        } catch (err) {
            console.error('Error fetching project costing:', err);
        }
    }, []);

    // Load Wastage Reports
    const fetchWastageReports = useCallback(async () => {
        try {
            const res = await api.get(`/project-costing/reports/wastage?month=${selectedMonth}`);
            if (res.data?.success) {
                setWastageReports(res.data.reports || []);
            }
        } catch (err) {
            console.error('Error fetching wastage reports:', err);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        if (activeTab === 'bom') fetchBOMs();
        else if (activeTab === 'requests') fetchMaterialRequests();
        else if (activeTab === 'consumption') fetchConsumptionHistory();
        else if (activeTab === 'costing') fetchCostingData();
        else if (activeTab === 'wastage') fetchWastageReports();
    }, [activeTab, fetchBOMs, fetchMaterialRequests, fetchConsumptionHistory, fetchCostingData, fetchWastageReports]);

    // ─── BOM ACTIONS ───
    const handleOpenCreateBOM = () => {
        setEditingBOM(null);
        setBomForm({
            projectId: projects[0]?._id || '',
            jobOrderNumber: '',
            description: '',
            items: [{
                inventoryItemId: '',
                materialName: 'MS Square Pipe 50x50x2mm',
                category: 'Square Pipes',
                specification: '50x50x2mm, 6m Length, Grade IS 4923',
                requiredQty: 10,
                unit: 'Lengths',
                estimatedUnitPrice: 850,
                estimatedTotalCost: 8500,
                notes: ''
            }],
            estimatedLabourHours: 40,
            estimatedLabourRate: 150,
            estimatedTransportCost: 1500,
            estimatedOtherCost: 1000,
            warningThresholdPercentage: 100,
            notes: ''
        });
        setShowBOMModal(true);
    };

    const handleAddBOMItemRow = () => {
        setBomForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    inventoryItemId: '',
                    materialName: '',
                    category: 'Raw Material',
                    specification: '',
                    requiredQty: 1,
                    unit: 'Pcs',
                    estimatedUnitPrice: 0,
                    estimatedTotalCost: 0,
                    notes: ''
                }
            ]
        }));
    };

    const handleRemoveBOMItemRow = (idx) => {
        setBomForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const handleBOMItemChange = (idx, field, value) => {
        setBomForm(prev => {
            const newItems = [...prev.items];
            const item = { ...newItems[idx], [field]: value };

            // If choosing an existing inventory material, auto populate details
            if (field === 'inventoryItemId' && value) {
                const found = inventoryItems.find(i => i._id === value);
                if (found) {
                    item.materialName = found.name;
                    item.category = found.category || 'Raw Material';
                    item.unit = found.unit || 'Pcs';
                    item.estimatedUnitPrice = found.unitPrice || 0;
                    item.specification = found.notes || '';
                }
            }

            if (field === 'requiredQty' || field === 'estimatedUnitPrice') {
                const q = field === 'requiredQty' ? Number(value) : Number(item.requiredQty);
                const p = field === 'estimatedUnitPrice' ? Number(value) : Number(item.estimatedUnitPrice);
                item.estimatedTotalCost = parseFloat((q * p).toFixed(2));
            }

            newItems[idx] = item;
            return { ...prev, items: newItems };
        });
    };

    const handleSaveBOM = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (editingBOM) {
                await api.put(`/bom/${editingBOM._id}`, bomForm);
                notify(`BOM ${editingBOM.bomNumber} updated successfully.`);
            } else {
                const res = await api.post('/bom', bomForm);
                notify(`New Bill of Materials ${res.data?.bom?.bomNumber || ''} created.`);
            }
            setShowBOMModal(false);
            fetchBOMs();
        } catch (err) {
            console.error('Error saving BOM:', err);
            setError(err.response?.data?.message || 'Failed to save Bill of Materials.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveBOM = async (bomId) => {
        setActionLoading(true);
        try {
            await api.patch(`/bom/${bomId}/status`, { status: 'Approved' });
            notify('BOM marked as Approved and active for production.');
            fetchBOMs();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve BOM.');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── MATERIAL REQUEST ACTIONS ───
    const handleOpenCreateRequest = () => {
        setRequestForm({
            projectId: projects[0]?._id || '',
            bomId: '',
            priority: 'Normal',
            items: [{
                inventoryItemId: inventoryItems[0]?._id || '',
                materialName: inventoryItems[0]?.name || '',
                category: inventoryItems[0]?.category || 'Raw Material',
                specification: '',
                unit: inventoryItems[0]?.unit || 'Pcs',
                requestedQty: 5,
                unitPrice: inventoryItems[0]?.unitPrice || 0
            }],
            notes: ''
        });
        setShowRequestModal(true);
    };

    const handleSaveMaterialRequest = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            const res = await api.post('/material-requests', requestForm);
            notify(`Material Request ${res.data?.request?.requestNumber} submitted to Admin.`);
            setShowRequestModal(false);
            fetchMaterialRequests();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit material request.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenReviewModal = (req) => {
        setSelectedRequestForReview(req);
        setReviewForm({
            action: 'APPROVE',
            rejectionReason: '',
            allowNegativeStock: false,
            approvedItems: req.items.map(i => ({
                inventoryItemId: i.inventoryItemId?._id || i.inventoryItemId,
                approvedQty: i.requestedQty
            }))
        });
        setShowReviewModal(true);
    };

    const handleExecuteReview = async () => {
        if (!selectedRequestForReview) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await api.post(`/material-requests/${selectedRequestForReview._id}/review`, reviewForm);
            notify(res.data?.message || 'Material request reviewed and processed.');
            setShowReviewModal(false);
            fetchMaterialRequests();
            fetchMasterData(); // Refresh inventory quantities
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process material approval.');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── MATERIAL CONSUMPTION & RETURNS ───
    const handleRecordConsumptionSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            await api.post('/material-consumption/record', consumeForm);
            notify('Material consumption recorded successfully against project.');
            setShowConsumeModal(false);
            fetchConsumptionHistory();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record consumption.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReturnMaterialSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            const res = await api.post('/material-consumption/return', returnForm);
            notify(res.data?.message || 'Unused material returned to workshop stock.');
            setShowReturnModal(false);
            fetchConsumptionHistory();
            fetchMasterData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to return material.');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── PDF EXPORTS ───
    const handleExportCostingPDF = async (costing) => {
        const columns = ['Cost Component', 'Estimated (INR)', 'Actual (INR)', 'Variance (INR)', 'Adherence Status'];
        const est = costing.estimates;
        const act = costing.actuals;
        const fin = costing.financials;

        const data = [
            ['Raw Material Cost', `Rs. ${est.materialCost}`, `Rs. ${act.materialCost}`, `Rs. ${(act.materialCost - est.materialCost).toFixed(2)}`, act.materialCost <= est.materialCost ? 'Within Budget' : 'Cost Overrun'],
            ['Fabrication Labour', `Rs. ${est.labourCost}`, `Rs. ${act.labourCost}`, `Rs. ${(act.labourCost - est.labourCost).toFixed(2)}`, act.labourCost <= est.labourCost ? 'Within Budget' : 'Cost Overrun'],
            ['Transportation & Fuel', `Rs. ${est.transportCost}`, `Rs. ${act.transportCost}`, `Rs. ${(act.transportCost - est.transportCost).toFixed(2)}`, act.transportCost <= est.transportCost ? 'Within Budget' : 'Cost Overrun'],
            ['Equipment & Site Other', `Rs. ${est.otherCost}`, `Rs. ${act.otherCost}`, `Rs. ${(act.otherCost - est.otherCost).toFixed(2)}`, act.otherCost <= est.otherCost ? 'Within Budget' : 'Cost Overrun'],
            ['TOTAL PROJECT COST', `Rs. ${est.totalCost}`, `Rs. ${act.totalCost}`, `Rs. ${fin.costVariance}`, fin.isCostOverrun ? 'OVERRUN ALERT' : 'HEALTHY'],
            ['Recognized Project Revenue', '-', `Rs. ${act.recognizedRevenue}`, '-', 'Earned'],
            ['NET PROFIT / LOSS', `Rs. ${est.expectedProfit}`, `Rs. ${act.actualProfit}`, `Margin: ${act.actualProfitMargin}%`, act.actualProfit >= 0 ? 'Profitable' : 'Loss Warning']
        ];

        const title = `Project Financial & Costing Statement - ${costing.project.title}`;
        await generateGeneralReportPDF(data, title, columns);
    };

    const handleExportWastagePDF = async () => {
        if (!wastageReports || wastageReports.length === 0) {
            alert('No wastage data available for this month.');
            return;
        }
        const columns = ['Project Name', 'Issued Qty', 'Consumed Qty', 'Returned Qty', 'Wastage Qty', 'Wastage %', 'Wastage Loss'];
        const data = wastageReports.map(r => [
            r.projectTitle || 'Project',
            r.totalIssued.toString(),
            r.totalConsumed.toString(),
            r.totalReturned.toString(),
            r.totalWastage.toString(),
            `${r.wastagePercentage}%`,
            `Rs. ${r.wastageCost}`
        ]);
        const title = `Material Wastage & Yield Analysis - ${selectedMonth}`;
        await generateGeneralReportPDF(data, title, columns);
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-100 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Material Consumption, BOM & Project Costing Hub
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Industrial Bill of Materials, stock issuance workflow, variance tracking, and real-time project profitability.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={fetchMasterData}
                        disabled={loading || actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    {activeTab === 'bom' && (
                        <button
                            onClick={handleOpenCreateBOM}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create BOM</span>
                        </button>
                    )}

                    {activeTab === 'requests' && (
                        <button
                            onClick={handleOpenCreateRequest}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                        >
                            <Package className="w-4 h-4" />
                            <span>Request Material</span>
                        </button>
                    )}

                    {activeTab === 'consumption' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setConsumeForm({
                                        projectId: projects[0]?._id || '',
                                        materialRequestId: '',
                                        inventoryItemId: inventoryItems[0]?._id || '',
                                        materialName: inventoryItems[0]?.name || '',
                                        consumedQty: 1,
                                        wastageQty: 0,
                                        date: new Date().toISOString().split('T')[0],
                                        notes: ''
                                    });
                                    setShowConsumeModal(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Record Consumption</span>
                            </button>

                            <button
                                onClick={() => {
                                    setReturnForm({
                                        projectId: projects[0]?._id || '',
                                        materialRequestId: '',
                                        inventoryItemId: inventoryItems[0]?._id || '',
                                        returnedQty: 1,
                                        date: new Date().toISOString().split('T')[0],
                                        notes: ''
                                    });
                                    setShowReturnModal(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                            >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>Return Unused</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                    >
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>{successMsg}</span>
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400"
                    >
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('bom')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'bom'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Bill of Materials (BOM)</span>
                </button>

                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'requests'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Material Requests & Approvals ({materialRequests.filter(r => r.status === 'Pending').length} Pending)</span>
                </button>

                <button
                    onClick={() => setActiveTab('consumption')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'consumption'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Material Movements & Consumption</span>
                </button>

                <button
                    onClick={() => setActiveTab('costing')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'costing'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <IndianRupee className="w-4 h-4" />
                    <span>Project Costing & Profitability</span>
                </button>

                <button
                    onClick={() => setActiveTab('wastage')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'wastage'
                            ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <TrendingDown className="w-4 h-4" />
                    <span>Material Wastage Reports</span>
                </button>
            </div>

            {/* TAB 1: BILL OF MATERIALS (BOM) */}
            {activeTab === 'bom' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search BOMs by project, job number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold w-full sm:w-64"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Draft">Draft</option>
                                <option value="Approved">Approved</option>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    {boms.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 font-bold border border-slate-200/80 dark:border-slate-700">
                            No Bill of Materials created yet. Click "Create BOM" to define material requirements for a project.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {boms
                                .filter(b => {
                                    const matchSearch = !searchQuery || 
                                        b.bomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        b.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        b.jobOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
                                    return matchSearch && matchStatus;
                                })
                                .map(bom => (
                                    <div
                                        key={bom._id}
                                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm space-y-4 hover:border-blue-400 transition"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                                                    {bom.bomNumber}
                                                </span>
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                                                    {bom.projectTitle || 'Project BOM'}
                                                </h3>
                                                <p className="text-[11px] text-slate-400">
                                                    Job: {bom.jobOrderNumber || 'N/A'} • Client: {bom.customerName || 'Standard'}
                                                </p>
                                            </div>

                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                bom.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                bom.status === 'Active' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {bom.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Items Planned</span>
                                                <span className="font-black text-slate-800 dark:text-slate-200">
                                                    {bom.items?.length || 0} Materials
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Est. Material Cost</span>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                    ₹{bom.totalEstimatedMaterialCost?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Labour + Transport</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    ₹{((bom.estimatedLabourCost || 0) + (bom.estimatedTransportCost || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">TOTAL EST. COST</span>
                                                <span className="font-black text-blue-600 dark:text-blue-400">
                                                    ₹{bom.totalEstimatedCost?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <button
                                                onClick={() => setSelectedBOMView(bom)}
                                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View Items</span>
                                            </button>

                                            {bom.status === 'Draft' && (
                                                <button
                                                    onClick={() => handleApproveBOM(bom._id)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Approve BOM</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MATERIAL REQUESTS & APPROVALS */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                Project Material Requests & Store Approvals ({materialRequests.length})
                            </h2>
                        </div>

                        {materialRequests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-bold">
                                No material requests currently found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                            <th className="px-5 py-3">Req Number</th>
                                            <th className="px-5 py-3">Project</th>
                                            <th className="px-5 py-3">Requested By</th>
                                            <th className="px-5 py-3">Items Count</th>
                                            <th className="px-5 py-3 text-center">Priority</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                        {materialRequests.map(req => (
                                            <tr key={req._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-5 py-3 font-bold text-blue-600 whitespace-nowrap">
                                                    {req.requestNumber}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    {req.projectTitle}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                                                    {req.requestedByName}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    {req.items?.length || 0} items
                                                </td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        req.priority === 'Urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                                        req.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {req.priority}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                        req.status === 'Issued' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                                    {req.status === 'Pending' ? (
                                                        <button
                                                            onClick={() => handleOpenReviewModal(req)}
                                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                                                        >
                                                            Review & Issue Stock
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400">Processed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: MATERIAL CONSUMPTION & MOVEMENTS */}
            {activeTab === 'consumption' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                Project Material Movements & Consumption Log ({consumptionLogs.length})
                            </h2>
                        </div>

                        {consumptionLogs.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-bold">
                                No material movements or consumptions recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-5 py-3">Movement Type</th>
                                            <th className="px-5 py-3">Project</th>
                                            <th className="px-5 py-3">Material</th>
                                            <th className="px-5 py-3 text-center">Quantity</th>
                                            <th className="px-5 py-3 text-right">Unit Price</th>
                                            <th className="px-5 py-3 text-right">Total Cost</th>
                                            <th className="px-5 py-3">Handler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                        {consumptionLogs.map(log => (
                                            <tr key={log._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-5 py-3 whitespace-nowrap text-slate-400">
                                                    {new Date(log.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                        log.movementType === 'ISSUE' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                        log.movementType === 'CONSUMPTION' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        log.movementType === 'RETURN' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        'bg-rose-50 text-rose-600 border border-rose-200'
                                                    }`}>
                                                        {log.movementType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-bold whitespace-nowrap">
                                                    {log.projectTitle}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    {log.materialName} ({log.unit})
                                                </td>
                                                <td className="px-5 py-3 text-center font-black whitespace-nowrap">
                                                    {log.quantity} {log.unit}
                                                </td>
                                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                                    ₹{log.unitCost}
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                    ₹{log.totalCost?.toLocaleString()}
                                                </td>
                                                <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                                                    {log.issuedByName || log.receivedBy || 'Staff'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: PROJECT COSTING & PROFITABILITY DASHBOARD */}
            {activeTab === 'costing' && (
                <div className="space-y-6">
                    {/* Summary KPI Cards */}
                    {dashboardSummary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                    Total Inventory Valuation
                                </span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">
                                    ₹{dashboardSummary.inventoryValuation?.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Materials & tools in stock</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                                    Active Projects Costs
                                </span>
                                <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                                    ₹{dashboardSummary.totalActiveProjectCosts?.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Cumulative consumed cost</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                                    Material Consumption Value
                                </span>
                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                    ₹{dashboardSummary.totalMaterialConsumptionValue?.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Net issued & consumed</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                                    Outstanding Collections
                                </span>
                                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                                    ₹{dashboardSummary.totalOutstandingPayments?.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Pending customer dues</span>
                            </div>
                        </div>
                    )}

                    {/* Cost Overrun Warning Banner */}
                    {dashboardSummary?.overrunProjects && dashboardSummary.overrunProjects.length > 0 && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                            <div className="text-xs">
                                <p className="font-bold text-rose-900 dark:text-rose-200">
                                    Budget Overrun Warning: {dashboardSummary.overrunProjects.length} active project(s) exceeded approved budget thresholds.
                                </p>
                                <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                                    {dashboardSummary.overrunProjects.map(p => `${p.title} (+₹${p.overrun?.toLocaleString()})`).join(', ')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Project-Wise Costing & Profitability Cards */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Project-Wise Costing & Financial Statements ({projectsCosting.length})
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projectsCosting.map(c => {
                                const est = c.estimates;
                                const act = c.actuals;
                                const fin = c.financials;

                                return (
                                    <div
                                        key={c.project.id}
                                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-black text-base text-slate-900 dark:text-white">
                                                    {c.project.title}
                                                </h3>
                                                <p className="text-[11px] text-slate-400">
                                                    Client: {c.project.customer?.name || 'Customer'} • Status: {c.project.status}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                    act.actualProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                                }`}>
                                                    {act.actualProfitMargin}% Margin
                                                </span>
                                                <span className="block text-xs font-black text-slate-900 dark:text-white mt-1">
                                                    ₹{act.actualProfit?.toLocaleString()} Profit
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cost Components Breakdown */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Material Cost</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.materialCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block">Est: ₹{est.materialCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Labour Cost</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.labourCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block">Est: ₹{est.labourCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Transport</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.transportCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block">Est: ₹{est.transportCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Other Expenses</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.otherCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block">Est: ₹{est.otherCost?.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Budget & Variance Progress */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span>Budget Consumption</span>
                                                <span className={fin.isCostOverrun ? 'text-rose-600' : 'text-slate-600'}>
                                                    ₹{act.totalCost?.toLocaleString()} / ₹{fin.approvedProjectValue?.toLocaleString()} ({fin.costUsagePercentage}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all ${fin.isCostOverrun ? 'bg-rose-500' : 'bg-blue-600'}`} 
                                                    style={{ width: `${Math.min(100, fin.costUsagePercentage)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Financial Actions */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <div className="text-xs">
                                                <span className="text-slate-400">Outstanding: </span>
                                                <span className="font-bold text-amber-600">₹{fin.outstandingAmount?.toLocaleString()}</span>
                                            </div>

                                            <button
                                                onClick={() => handleExportCostingPDF(c)}
                                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download Costing PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: MATERIAL WASTAGE ANALYSIS */}
            {activeTab === 'wastage' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>

                        <button
                            onClick={handleExportWastagePDF}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Wastage Report (PDF)</span>
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                        {wastageReports.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-bold">
                                No material wastage recorded for {selectedMonth}.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                            <th className="px-5 py-3">Project Title</th>
                                            <th className="px-5 py-3 text-center">Issued Qty</th>
                                            <th className="px-5 py-3 text-center">Consumed Qty</th>
                                            <th className="px-5 py-3 text-center">Returned Qty</th>
                                            <th className="px-5 py-3 text-center">Wastage Qty</th>
                                            <th className="px-5 py-3 text-center">Wastage Yield %</th>
                                            <th className="px-5 py-3 text-right">Financial Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                        {wastageReports.map(rep => (
                                            <tr key={rep.projectId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-5 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                    {rep.projectTitle}
                                                </td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap">{rep.totalIssued}</td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap text-emerald-600 font-bold">{rep.totalConsumed}</td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap text-amber-600 font-bold">{rep.totalReturned}</td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap text-rose-600 font-bold">{rep.totalWastage}</td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        rep.wastagePercentage > 10 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {rep.wastagePercentage}%
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                                                    ₹{rep.wastageCost?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: CREATE / EDIT BOM */}
            <AnimatePresence>
                {showBOMModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                        {editingBOM ? `Edit BOM: ${editingBOM.bomNumber}` : 'Create Bill of Materials (BOM)'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Define required fabrication raw materials, specifications, and project cost estimates.
                                    </p>
                                </div>
                                <button onClick={() => setShowBOMModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveBOM} className="space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Project *</label>
                                        <select
                                            required
                                            disabled={!!editingBOM}
                                            value={bomForm.projectId}
                                            onChange={(e) => setBomForm({ ...bomForm, projectId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>
                                                    {p.title} (Budget: ₹{p.budget?.toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Job Work Order Code</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. JO-FAB-2026-08"
                                            value={bomForm.jobOrderNumber}
                                            onChange={(e) => setBomForm({ ...bomForm, jobOrderNumber: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Materials Requirement Table */}
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                                            Fabrication Material Requirements ({bomForm.items.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAddBOMItemRow}
                                            className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1 hover:bg-blue-100"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Row</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                                        {bomForm.items.map((item, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block">Link Inventory Material (Optional)</label>
                                                        <select
                                                            value={item.inventoryItemId || ''}
                                                            onChange={(e) => handleBOMItemChange(idx, 'inventoryItemId', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                                                        >
                                                            <option value="">-- Manual Material --</option>
                                                            {inventoryItems.map(inv => (
                                                                <option key={inv._id} value={inv._id}>
                                                                    {inv.name} ({inv.quantity} {inv.unit} in stock)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block">Category *</label>
                                                        <select
                                                            value={item.category || 'Raw Material'}
                                                            onChange={(e) => handleBOMItemChange(idx, 'category', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                                                        >
                                                            {FABRICATION_CATEGORIES.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <label className="text-[10px] text-slate-400 block">Material Name *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. MS Pipe, GI Sheet, Angles..."
                                                            value={item.materialName}
                                                            onChange={(e) => handleBOMItemChange(idx, 'materialName', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                                                    <div className="sm:col-span-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Specification (size, gauge, grade)..."
                                                            value={item.specification}
                                                            onChange={(e) => handleBOMItemChange(idx, 'specification', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                                        />
                                                    </div>

                                                    <div>
                                                        <input
                                                            type="number"
                                                            min="0.1"
                                                            step="any"
                                                            required
                                                            placeholder="Req Qty"
                                                            value={item.requiredQty}
                                                            onChange={(e) => handleBOMItemChange(idx, 'requiredQty', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                                        />
                                                    </div>

                                                    <div>
                                                        <select
                                                            value={item.unit || 'Pcs'}
                                                            onChange={(e) => handleBOMItemChange(idx, 'unit', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                                                        >
                                                            {STANDARD_UNITS.map(u => (
                                                                <option key={u} value={u}>{u}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            placeholder="Est Price"
                                                            value={item.estimatedUnitPrice}
                                                            onChange={(e) => handleBOMItemChange(idx, 'estimatedUnitPrice', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                                        />
                                                        {bomForm.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBOMItemRow(idx)}
                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cost Breakdown & Warning Threshold */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block font-bold">Labour Hours</label>
                                        <input
                                            type="number"
                                            value={bomForm.estimatedLabourHours}
                                            onChange={(e) => setBomForm({ ...bomForm, estimatedLabourHours: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block font-bold">Labour Rate (₹/hr)</label>
                                        <input
                                            type="number"
                                            value={bomForm.estimatedLabourRate}
                                            onChange={(e) => setBomForm({ ...bomForm, estimatedLabourRate: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block font-bold">Transport Cost (₹)</label>
                                        <input
                                            type="number"
                                            value={bomForm.estimatedTransportCost}
                                            onChange={(e) => setBomForm({ ...bomForm, estimatedTransportCost: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-400 block font-bold">Cost Alert Threshold (%)</label>
                                        <input
                                            type="number"
                                            value={bomForm.warningThresholdPercentage}
                                            onChange={(e) => setBomForm({ ...bomForm, warningThresholdPercentage: Number(e.target.value) })}
                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowBOMModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Bill of Materials'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: REVIEW & APPROVE MATERIAL REQUEST */}
            <AnimatePresence>
                {showReviewModal && selectedRequestForReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                        Review Material Request: {selectedRequestForReview.requestNumber}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Project: {selectedRequestForReview.projectTitle} • Requested By: {selectedRequestForReview.requestedByName}
                                    </p>
                                </div>
                                <button onClick={() => setShowReviewModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-300 block">Requested Items & Available Stock:</span>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                    {selectedRequestForReview.items.map((item, idx) => {
                                        const currentStock = inventoryItems.find(i => i._id === (item.inventoryItemId?._id || item.inventoryItemId))?.quantity || 0;
                                        const isLowStock = currentStock < item.requestedQty;

                                        return (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {item.materialName} ({item.unit})
                                                    </span>
                                                    <span className={`text-[10px] font-semibold ${isLowStock ? 'text-rose-600' : 'text-slate-400'}`}>
                                                        Current Store Stock: {currentStock} {item.unit}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-xs">Approved Qty:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.requestedQty}
                                                        value={reviewForm.approvedItems[idx]?.approvedQty ?? item.requestedQty}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value) || 0;
                                                            setReviewForm(prev => {
                                                                const newItems = [...prev.approvedItems];
                                                                newItems[idx] = { ...newItems[idx], approvedQty: val };
                                                                return { ...prev, approvedItems: newItems };
                                                            });
                                                        }}
                                                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-right"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={reviewForm.allowNegativeStock}
                                            onChange={(e) => setReviewForm({ ...reviewForm, allowNegativeStock: e.target.checked })}
                                            className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <span>Allow Negative Stock Exception (Override store stock limit)</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewForm({ ...reviewForm, action: 'REJECT' });
                                            handleExecuteReview();
                                        }}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold transition"
                                    >
                                        Reject Request
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewForm({ ...reviewForm, action: 'APPROVE' });
                                            handleExecuteReview();
                                        }}
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/20"
                                    >
                                        {actionLoading ? 'Processing...' : 'Approve & Issue Materials'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: RECORD CONSUMPTION */}
            <AnimatePresence>
                {showConsumeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                                        Record Project Material Consumption
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        Log consumed fabrication materials and offcut/wastage quantities.
                                    </p>
                                </div>
                                <button onClick={() => setShowConsumeModal(false)} className="p-1 rounded text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleRecordConsumptionSubmit} className="space-y-3 text-xs">
                                <div>
                                    <label className="font-bold block mb-1">Target Project *</label>
                                    <select
                                        required
                                        value={consumeForm.projectId}
                                        onChange={(e) => setConsumeForm({ ...consumeForm, projectId: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                    >
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1">Material Item *</label>
                                    <select
                                        required
                                        value={consumeForm.inventoryItemId}
                                        onChange={(e) => {
                                            const item = inventoryItems.find(i => i._id === e.target.value);
                                            setConsumeForm({
                                                ...consumeForm,
                                                inventoryItemId: e.target.value,
                                                materialName: item?.name || ''
                                            });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                    >
                                        {inventoryItems.map(inv => (
                                            <option key={inv._id} value={inv._id}>
                                                {inv.name} ({inv.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1">Consumed Qty *</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            required
                                            value={consumeForm.consumedQty}
                                            onChange={(e) => setConsumeForm({ ...consumeForm, consumedQty: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1">Wastage / Scrap Qty</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={consumeForm.wastageQty}
                                            onChange={(e) => setConsumeForm({ ...consumeForm, wastageQty: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1">Notes / Fabrication Details</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Structure frame fabrication, cutting offcuts..."
                                        value={consumeForm.notes}
                                        onChange={(e) => setConsumeForm({ ...consumeForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowConsumeModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        {actionLoading ? 'Recording...' : 'Record Consumption'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: RETURN UNUSED MATERIALS */}
            <AnimatePresence>
                {showReturnModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                                        Return Unused Material to Inventory
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        Restores physical workshop inventory and credits back project material costs.
                                    </p>
                                </div>
                                <button onClick={() => setShowReturnModal(false)} className="p-1 rounded text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleReturnMaterialSubmit} className="space-y-3 text-xs">
                                <div>
                                    <label className="font-bold block mb-1">Source Project *</label>
                                    <select
                                        required
                                        value={returnForm.projectId}
                                        onChange={(e) => setReturnForm({ ...returnForm, projectId: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                    >
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1">Material to Return *</label>
                                    <select
                                        required
                                        value={returnForm.inventoryItemId}
                                        onChange={(e) => setReturnForm({ ...returnForm, inventoryItemId: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                    >
                                        {inventoryItems.map(inv => (
                                            <option key={inv._id} value={inv._id}>
                                                {inv.name} (Current Stock: {inv.quantity} {inv.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1">Quantity Returned *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.1"
                                        required
                                        value={returnForm.returnedQty}
                                        onChange={(e) => setReturnForm({ ...returnForm, returnedQty: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold block mb-1">Reason for Return</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Excess material, job completed with surplus..."
                                        value={returnForm.notes}
                                        onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowReturnModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                    >
                                        {actionLoading ? 'Returning...' : 'Return & Restore Stock'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: VIEW BOM ITEMS DETAILS */}
            <AnimatePresence>
                {selectedBOMView && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                                        BOM Details: {selectedBOMView.bomNumber}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Project: {selectedBOMView.projectTitle} • Job: {selectedBOMView.jobOrderNumber}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedBOMView(null)} className="p-1 rounded text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                                            <th className="px-3 py-2">Material</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Specification</th>
                                            <th className="px-3 py-2 text-center">Qty</th>
                                            <th className="px-3 py-2 text-right">Est. Unit Price</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {selectedBOMView.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 font-bold">{item.materialName}</td>
                                                <td className="px-3 py-2 text-slate-400">{item.category}</td>
                                                <td className="px-3 py-2 text-slate-500">{item.specification || '-'}</td>
                                                <td className="px-3 py-2 text-center font-bold">{item.requiredQty} {item.unit}</td>
                                                <td className="px-3 py-2 text-right">₹{item.estimatedUnitPrice}</td>
                                                <td className="px-3 py-2 text-right font-black">₹{item.estimatedTotalCost?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 text-right text-xs">
                                    <div><span className="text-slate-400">Material Cost:</span> <span className="font-bold">₹{selectedBOMView.totalEstimatedMaterialCost?.toLocaleString()}</span></div>
                                    <div><span className="text-slate-400">Labour Cost ({selectedBOMView.estimatedLabourHours}h @ ₹{selectedBOMView.estimatedLabourRate}/h):</span> <span className="font-bold">₹{selectedBOMView.estimatedLabourCost?.toLocaleString()}</span></div>
                                    <div><span className="text-slate-400">Transport:</span> <span className="font-bold">₹{selectedBOMView.estimatedTransportCost?.toLocaleString()}</span></div>
                                    <div><span className="text-slate-400">Other:</span> <span className="font-bold">₹{selectedBOMView.estimatedOtherCost?.toLocaleString()}</span></div>
                                    <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-blue-600">
                                        Total Estimated Project Cost: ₹{selectedBOMView.totalEstimatedCost?.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
