import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { 
    Layers, Package, CheckCircle2, Clock, AlertTriangle, ArrowRight, 
    ArrowLeftRight, FileText, Download, Plus, Trash2, Edit, Search, 
    Filter, RefreshCw, IndianRupee, TrendingUp, TrendingDown, ShieldAlert, 
    Check, X, Eye, FileSpreadsheet, Percent, Wrench, Truck, Briefcase, 
    ChevronRight, User, Calendar, AlertCircle, Info, Sparkles, Building2,
    Users, MapPin, Fuel, Loader2
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

const LABOUR_CATEGORIES = [
    'Welding', 'Fit-up & Assembly', 'Cutting & Fabrication', 
    'Painting & Blasting', 'Machine Operator', 'Site Erection', 
    'Helper / Rigging', 'Crane / Forklift Operator', 'Electrical & Wiring', 
    'General Labour', 'Subcontracted Labour', 'Other'
];

const RATE_TYPES = ['Daily', 'Hourly', 'Piece Rate', 'Fixed Job'];

const TRANSPORT_TYPES = [
    'Flatbed Trailer', 'Pickup Van (Tata Ace / Bolero)', 'Hydra Crane Transport', 
    'Heavy Trailer (40ft / Low Bed)', 'Tempo / Mini Truck', 'Inter-Site Shuttle', 
    'Third Party Logistics (3PL)', 'Material Inward Transport', 'Other'
];

export default function AdminBOMCosting() {
    const [activeTab, setActiveTab] = useState('bom'); // 'bom' | 'requests' | 'consumption' | 'labour' | 'transport' | 'costing' | 'wastage'
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Master Data
    const [projects, setProjects] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [boms, setBoms] = useState([]);
    const [materialRequests, setMaterialRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState(null);
    const [requestSearchQuery, setRequestSearchQuery] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState('All');
    const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
    const [consumptionLogs, setConsumptionLogs] = useState([]);
    const [projectsCosting, setProjectsCosting] = useState([]);
    const [dashboardSummary, setDashboardSummary] = useState(null);
    const [wastageReports, setWastageReports] = useState([]);

    // Independent Labour Cost State
    const [labourCosts, setLabourCosts] = useState([]);
    const [selectedLabourCategory, setSelectedLabourCategory] = useState('All');
    const [labourDateFilter, setLabourDateFilter] = useState('');
    const [showLabourModal, setShowLabourModal] = useState(false);
    const [editingLabour, setEditingLabour] = useState(null);
    const [labourForm, setLabourForm] = useState({
        projectId: '',
        labourCategory: 'Welding',
        workDescription: '',
        workerName: '',
        numberOfWorkers: 1,
        workDate: new Date().toISOString().split('T')[0],
        rateType: 'Daily',
        quantity: 1,
        rate: 900,
        totalAmount: 900,
        notes: '',
        attachmentUrl: ''
    });

    // Independent Transport Cost State
    const [transportCosts, setTransportCosts] = useState([]);
    const [selectedTransportTypeFilter, setSelectedTransportTypeFilter] = useState('All');
    const [transportDateFilter, setTransportDateFilter] = useState('');
    const [showTransportModal, setShowTransportModal] = useState(false);
    const [editingTransport, setEditingTransport] = useState(null);
    const [transportForm, setTransportForm] = useState({
        projectId: '',
        transportDate: new Date().toISOString().split('T')[0],
        transportType: 'Flatbed Trailer',
        vehicleNumber: '',
        driverName: '',
        startingLocation: 'Central Fabrication Yard, Palakkad',
        destination: '',
        transportDescription: '',
        numberOfTrips: 1,
        freightCharge: 0,
        fuelCharge: 0,
        loadingUnloadingCharge: 0,
        tollCharge: 0,
        otherCharge: 0,
        totalTransportCost: 0,
        notes: '',
        attachmentUrl: ''
    });

    // Project Cost History Modal State
    const [showProjectHistoryModal, setShowProjectHistoryModal] = useState(false);
    const [projectHistoryData, setProjectHistoryData] = useState(null);
    const [historySubTab, setHistorySubTab] = useState('all'); // 'all' | 'material' | 'labour' | 'transport' | 'other'
    const [historyLoading, setHistoryLoading] = useState(false);

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
                api.get('/projects').catch(() => ({ data: [] })),
                api.get('/inventory/items').catch(() => api.get('/inventory')).catch(() => ({ data: [] }))
            ]);
            setProjects(Array.isArray(projRes.data) ? projRes.data : (projRes.data?.projects || []));
            const items = Array.isArray(invRes.data) ? invRes.data : (invRes.data?.items || []);
            const materials = items.filter(i => i.type === 'material' || !i.type);
            setInventoryItems(materials.length > 0 ? materials : items);
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
        setRequestsLoading(true);
        setRequestsError(null);
        try {
            const res = await api.get('/material-requests');
            if (res.data?.success) {
                setMaterialRequests(res.data.requests || []);
            }
        } catch (err) {
            console.error('Error fetching material requests:', err);
            setRequestsError(err.response?.data?.message || err.message || 'Failed to fetch material requests.');
        } finally {
            setRequestsLoading(false);
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

    // Load Independent Labour Costs
    const fetchLabourCosts = useCallback(async () => {
        try {
            const res = await api.get('/labour-cost');
            if (res.data?.success) {
                setLabourCosts(res.data.labourCosts || []);
            }
        } catch (err) {
            console.error('Error fetching labour costs:', err);
        }
    }, []);

    // Load Independent Transport Costs
    const fetchTransportCosts = useCallback(async () => {
        try {
            const res = await api.get('/transport-cost');
            if (res.data?.success) {
                setTransportCosts(res.data.transportCosts || []);
            }
        } catch (err) {
            console.error('Error fetching transport costs:', err);
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

    const filteredRequests = useMemo(() => {
        return materialRequests.filter(req => {
            const matchesStatus = requestStatusFilter === 'All' || req.status === requestStatusFilter;
            const q = requestSearchQuery.trim().toLowerCase();
            const matchesSearch = !q || 
                req.requestNumber?.toLowerCase().includes(q) ||
                req.projectTitle?.toLowerCase().includes(q) ||
                req.requestedByName?.toLowerCase().includes(q) ||
                req.items?.some(i => i.materialName?.toLowerCase().includes(q));
            return matchesStatus && matchesSearch;
        });
    }, [materialRequests, requestStatusFilter, requestSearchQuery]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    useEffect(() => {
        if (activeTab === 'bom') fetchBOMs();
        else if (activeTab === 'requests') fetchMaterialRequests();
        else if (activeTab === 'consumption') fetchConsumptionHistory();
        else if (activeTab === 'labour') fetchLabourCosts();
        else if (activeTab === 'transport') fetchTransportCosts();
        else if (activeTab === 'costing') {
            fetchCostingData();
            fetchLabourCosts();
            fetchTransportCosts();
        }
        else if (activeTab === 'wastage') fetchWastageReports();
    }, [activeTab, fetchBOMs, fetchMaterialRequests, fetchConsumptionHistory, fetchLabourCosts, fetchTransportCosts, fetchCostingData, fetchWastageReports]);

    // ─── LABOUR COST CALCULATION & ACTIONS ───
    const updateLabourFormCalculation = (field, val) => {
        setLabourForm(prev => {
            const next = { ...prev, [field]: val };
            if (field !== 'totalAmount') {
                const nw = Number(next.numberOfWorkers) > 0 ? Number(next.numberOfWorkers) : 1;
                const q = Number(next.quantity) || 0;
                const r = Number(next.rate) || 0;
                if (next.rateType === 'Fixed Job') {
                    next.totalAmount = r;
                } else {
                    next.totalAmount = parseFloat((q * r * nw).toFixed(2));
                }
            }
            return next;
        });
    };

    const handleOpenAddLabour = (targetProjectId = '') => {
        setEditingLabour(null);
        const pId = targetProjectId || projects[0]?._id || '';
        setLabourForm({
            projectId: pId,
            labourCategory: 'Welding',
            workDescription: '',
            workerName: '',
            numberOfWorkers: 1,
            workDate: new Date().toISOString().split('T')[0],
            rateType: 'Daily',
            quantity: 1,
            rate: 900,
            totalAmount: 900,
            notes: '',
            attachmentUrl: ''
        });
        setShowLabourModal(true);
    };

    const handleOpenEditLabour = (rec) => {
        setEditingLabour(rec);
        setLabourForm({
            projectId: rec.projectId?._id || rec.projectId || '',
            labourCategory: rec.labourCategory || 'General Labour',
            workDescription: rec.workDescription || '',
            workerName: rec.workerName || '',
            numberOfWorkers: rec.numberOfWorkers || 1,
            workDate: rec.workDate ? new Date(rec.workDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            rateType: rec.rateType || 'Daily',
            quantity: rec.quantity || 1,
            rate: rec.rate || 0,
            totalAmount: rec.totalAmount || 0,
            notes: rec.notes || '',
            attachmentUrl: rec.attachmentUrl || ''
        });
        setShowLabourModal(true);
    };

    const handleSaveLabour = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (editingLabour) {
                const res = await api.put(`/labour-cost/${editingLabour._id}`, labourForm);
                if (res.data?.success) {
                    notify('Labour cost record updated successfully!');
                }
            } else {
                const res = await api.post('/labour-cost', labourForm);
                if (res.data?.success) {
                    notify('Labour cost recorded successfully!');
                }
            }
            setShowLabourModal(false);
            setEditingLabour(null);
            fetchLabourCosts();
            fetchCostingData();
            if (projectHistoryData?.project?.id) {
                handleOpenProjectHistory(projectHistoryData.project.id);
            }
        } catch (err) {
            console.error('Error saving labour cost:', err);
            setError(err.response?.data?.message || err.message || 'Failed to save labour cost.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteLabour = async (id) => {
        if (!window.confirm('Are you sure you want to delete this labour cost record?')) return;
        setActionLoading(true);
        try {
            const res = await api.delete(`/labour-cost/${id}`);
            if (res.data?.success) {
                notify('Labour cost record deleted.');
                fetchLabourCosts();
                fetchCostingData();
                if (projectHistoryData?.project?.id) {
                    handleOpenProjectHistory(projectHistoryData.project.id);
                }
            }
        } catch (err) {
            console.error('Error deleting labour cost:', err);
            setError(err.response?.data?.message || err.message || 'Failed to delete labour cost.');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── TRANSPORT COST CALCULATION & ACTIONS ───
    const updateTransportFormCalculation = (field, val) => {
        setTransportForm(prev => {
            const next = { ...prev, [field]: val };
            if (field !== 'totalTransportCost') {
                const fr = Number(next.freightCharge) || 0;
                const fu = Number(next.fuelCharge) || 0;
                const lo = Number(next.loadingUnloadingCharge) || 0;
                const to = Number(next.tollCharge) || 0;
                const ot = Number(next.otherCharge) || 0;
                next.totalTransportCost = parseFloat((fr + fu + lo + to + ot).toFixed(2));
            }
            return next;
        });
    };

    const handleOpenAddTransport = (targetProjectId = '') => {
        setEditingTransport(null);
        const pId = targetProjectId || projects[0]?._id || '';
        const targetProj = projects.find(p => p._id === pId);
        setTransportForm({
            projectId: pId,
            transportDate: new Date().toISOString().split('T')[0],
            transportType: 'Flatbed Trailer',
            vehicleNumber: '',
            driverName: '',
            startingLocation: 'Central Fabrication Yard, Palakkad',
            destination: targetProj?.location || '',
            transportDescription: '',
            numberOfTrips: 1,
            freightCharge: 0,
            fuelCharge: 0,
            loadingUnloadingCharge: 0,
            tollCharge: 0,
            otherCharge: 0,
            totalTransportCost: 0,
            notes: '',
            attachmentUrl: ''
        });
        setShowTransportModal(true);
    };

    const handleOpenEditTransport = (rec) => {
        setEditingTransport(rec);
        setTransportForm({
            projectId: rec.projectId?._id || rec.projectId || '',
            transportDate: rec.transportDate ? new Date(rec.transportDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            transportType: rec.transportType || 'Flatbed Trailer',
            vehicleNumber: rec.vehicleNumber || '',
            driverName: rec.driverName || '',
            startingLocation: rec.startingLocation || '',
            destination: rec.destination || '',
            transportDescription: rec.transportDescription || '',
            numberOfTrips: rec.numberOfTrips || 1,
            freightCharge: rec.freightCharge || 0,
            fuelCharge: rec.fuelCharge || 0,
            loadingUnloadingCharge: rec.loadingUnloadingCharge || 0,
            tollCharge: rec.tollCharge || 0,
            otherCharge: rec.otherCharge || 0,
            totalTransportCost: rec.totalTransportCost || 0,
            notes: rec.notes || '',
            attachmentUrl: rec.attachmentUrl || ''
        });
        setShowTransportModal(true);
    };

    const handleSaveTransport = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (editingTransport) {
                const res = await api.put(`/transport-cost/${editingTransport._id}`, transportForm);
                if (res.data?.success) {
                    notify('Transport cost record updated successfully!');
                }
            } else {
                const res = await api.post('/transport-cost', transportForm);
                if (res.data?.success) {
                    notify('Transport cost recorded successfully!');
                }
            }
            setShowTransportModal(false);
            setEditingTransport(null);
            fetchTransportCosts();
            fetchCostingData();
            if (projectHistoryData?.project?.id) {
                handleOpenProjectHistory(projectHistoryData.project.id);
            }
        } catch (err) {
            console.error('Error saving transport cost:', err);
            setError(err.response?.data?.message || err.message || 'Failed to save transport cost.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteTransport = async (id) => {
        if (!window.confirm('Are you sure you want to delete this transport cost record?')) return;
        setActionLoading(true);
        try {
            const res = await api.delete(`/transport-cost/${id}`);
            if (res.data?.success) {
                notify('Transport cost record deleted.');
                fetchTransportCosts();
                fetchCostingData();
                if (projectHistoryData?.project?.id) {
                    handleOpenProjectHistory(projectHistoryData.project.id);
                }
            }
        } catch (err) {
            console.error('Error deleting transport cost:', err);
            setError(err.response?.data?.message || err.message || 'Failed to delete transport cost.');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── PROJECT COST HISTORY VIEWER ───
    const handleOpenProjectHistory = async (projId) => {
        setHistoryLoading(true);
        setShowProjectHistoryModal(true);
        setHistorySubTab('all');
        try {
            const res = await api.get(`/project-costing/${projId}/history`);
            if (res.data?.success) {
                setProjectHistoryData(res.data);
            }
        } catch (err) {
            console.error('Error loading project history:', err);
            setError('Failed to load project cost history.');
        } finally {
            setHistoryLoading(false);
        }
    };

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
        if (projects.length === 0 || inventoryItems.length === 0) {
            fetchMasterData();
        }
        const eligibleProjects = projects.filter(p => !['cancelled', 'CANCELLED', 'Cancelled'].includes(p.status));
        const initialProj = eligibleProjects[0]?._id || projects[0]?._id || '';
        setRequestForm({
            projectId: initialProj,
            bomId: '',
            priority: 'Normal',
            items: [{
                inventoryItemId: inventoryItems[0]?._id || '',
                materialName: inventoryItems[0]?.name || '',
                category: inventoryItems[0]?.category || 'Raw Material',
                specification: '',
                unit: inventoryItems[0]?.unit || 'Pcs',
                requestedQty: 1,
                unitPrice: inventoryItems[0]?.unitPrice || 0
            }],
            notes: ''
        });
        setError(null);
        setShowRequestModal(true);
    };

    const handleAddRequestItem = () => {
        setRequestForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    inventoryItemId: inventoryItems[0]?._id || '',
                    materialName: inventoryItems[0]?.name || '',
                    category: inventoryItems[0]?.category || 'Raw Material',
                    specification: '',
                    unit: inventoryItems[0]?.unit || 'Pcs',
                    requestedQty: 1,
                    unitPrice: inventoryItems[0]?.unitPrice || 0
                }
            ]
        }));
    };

    const handleRemoveRequestItem = (index) => {
        if (requestForm.items.length <= 1) return;
        setRequestForm(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index)
        }));
    };

    const handleUpdateRequestItem = (index, field, value) => {
        setRequestForm(prev => {
            const nextItems = [...prev.items];
            if (field === 'inventoryItemId') {
                const inv = inventoryItems.find(i => i._id === value);
                nextItems[index] = {
                    ...nextItems[index],
                    inventoryItemId: value,
                    materialName: inv ? inv.name : nextItems[index].materialName,
                    category: inv ? inv.category : nextItems[index].category,
                    unit: inv ? inv.unit : nextItems[index].unit,
                    unitPrice: inv ? (inv.unitPrice || 0) : nextItems[index].unitPrice
                };
            } else {
                nextItems[index] = { ...nextItems[index], [field]: value };
            }
            return { ...prev, items: nextItems };
        });
    };

    const handleSaveMaterialRequest = async (e) => {
        e.preventDefault();
        if (!requestForm.projectId) {
            setError('Please select a project for the material request.');
            return;
        }
        if (!requestForm.items || requestForm.items.length === 0) {
            setError('Please add at least one material item.');
            return;
        }
        for (let i = 0; i < requestForm.items.length; i++) {
            const itm = requestForm.items[i];
            if (!itm.materialName && !itm.inventoryItemId) {
                setError(`Item #${i + 1} requires a material name.`);
                return;
            }
            if (Number(itm.requestedQty) <= 0) {
                setError(`Item #${i + 1} requested quantity must be greater than zero.`);
                return;
            }
        }
        setActionLoading(true);
        setError(null);
        try {
            const res = await api.post('/material-requests', requestForm);
            notify(`Material Request ${res.data?.request?.requestNumber || 'submitted'} created successfully.`);
            setShowRequestModal(false);
            fetchMaterialRequests();
            fetchMasterData();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit material request.');
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

                    {activeTab === 'labour' && (
                        <button
                            onClick={() => handleOpenAddLabour()}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Labour Cost</span>
                        </button>
                    )}

                    {activeTab === 'transport' && (
                        <button
                            onClick={() => handleOpenAddTransport()}
                            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Transport Cost</span>
                        </button>
                    )}

                    {activeTab === 'costing' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleOpenAddLabour()}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Labour Cost</span>
                            </button>
                            <button
                                onClick={() => handleOpenAddTransport()}
                                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Transport Cost</span>
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
                    <span>Material Requests ({materialRequests.filter(r => r.status === 'Pending').length} Pending)</span>
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
                    <span>Material Movements</span>
                </button>

                <button
                    onClick={() => setActiveTab('labour')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'labour'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Labour Costs ({labourCosts.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('transport')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 shrink-0 ${
                        activeTab === 'transport'
                            ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Transport Costs ({transportCosts.length})</span>
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
                    <span>Material Wastage</span>
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
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                                    Project Material Requests & Store Approvals ({filteredRequests.length})
                                </h2>
                                {requestsLoading && (
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:w-56">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search req, project, item..."
                                        value={requestSearchQuery}
                                        onChange={(e) => setRequestSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                                    />
                                </div>

                                <select
                                    value={requestStatusFilter}
                                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Partially Approved">Partially Approved</option>
                                    <option value="Issued">Issued</option>
                                    <option value="Rejected">Rejected</option>
                                </select>

                                <button
                                    onClick={handleOpenCreateRequest}
                                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Request Material</span>
                                </button>

                                <button
                                    onClick={fetchMaterialRequests}
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                                    title="Refresh requests"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${requestsLoading ? 'animate-spin text-indigo-600' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {requestsLoading ? (
                            <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                <span>Loading project material requests...</span>
                            </div>
                        ) : requestsError ? (
                            <div className="p-8 text-center space-y-2">
                                <p className="text-xs font-bold text-rose-500">{requestsError}</p>
                                <button
                                    onClick={fetchMaterialRequests}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 font-bold space-y-3">
                                <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="text-xs">
                                    {materialRequests.length === 0 
                                        ? 'No material requests currently recorded.' 
                                        : 'No material requests match your filters.'}
                                </p>
                                <button
                                    onClick={handleOpenCreateRequest}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                                >
                                    + Request Material
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                            <th className="px-5 py-3">Req Number</th>
                                            <th className="px-5 py-3">Project</th>
                                            <th className="px-5 py-3">Requested By</th>
                                            <th className="px-5 py-3">Items Summary</th>
                                            <th className="px-5 py-3 text-center">Priority</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                        {filteredRequests.map(req => (
                                            <tr key={req._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                <td className="px-5 py-3 font-bold text-indigo-600 whitespace-nowrap">
                                                    {req.requestNumber}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className="font-bold text-slate-900 dark:text-white block">{req.projectTitle}</span>
                                                    {req.jobOrderNumber && (
                                                        <span className="text-[10px] text-slate-400 font-mono">Job: {req.jobOrderNumber}</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                                                    <span className="block font-medium">{req.requestedByName}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(req.createdAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {req.items?.length || 0} items
                                                    </span>
                                                    {req.items && req.items[0] && (
                                                        <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                                                            e.g. {req.items[0].materialName} ({req.items[0].requestedQty} {req.items[0].unit})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        req.priority === 'Urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                                        req.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {req.priority}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                        req.status === 'Issued' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        req.status === 'Partially Approved' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                        req.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedRequestDetails(req)}
                                                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                                                            title="View details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>

                                                        {req.status === 'Pending' && (
                                                            <button
                                                                onClick={() => handleOpenReviewModal(req)}
                                                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                                                            >
                                                                Review & Issue
                                                            </button>
                                                        )}
                                                    </div>
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

            {/* TAB 4: INDEPENDENT LABOUR COSTS */}
            {activeTab === 'labour' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search by worker name, description, project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold w-full sm:w-72"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                            <select
                                value={selectedProjectFilter}
                                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="All">All Projects</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.title}</option>
                                ))}
                            </select>

                            <select
                                value={selectedLabourCategory}
                                onChange={(e) => setSelectedLabourCategory(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="All">All Categories</option>
                                {LABOUR_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={labourDateFilter}
                                onChange={(e) => setLabourDateFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                title="Filter by work date"
                            />
                            {labourDateFilter && (
                                <button
                                    onClick={() => setLabourDateFilter('')}
                                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded"
                                    title="Clear date filter"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <button
                                onClick={() => handleOpenAddLabour()}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Labour Cost</span>
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {(() => {
                        const filtered = labourCosts.filter(l => {
                            const matchProj = selectedProjectFilter === 'All' || (l.projectId?._id || l.projectId) === selectedProjectFilter;
                            const matchCat = selectedLabourCategory === 'All' || l.labourCategory === selectedLabourCategory;
                            const matchDate = !labourDateFilter || (l.workDate && new Date(l.workDate).toISOString().split('T')[0] === labourDateFilter);
                            const matchSearch = !searchQuery || 
                                l.workDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.labourCategory?.toLowerCase().includes(searchQuery.toLowerCase());
                            return matchProj && matchCat && matchDate && matchSearch;
                        });
                        const totalSpend = filtered.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
                        const totalWorkers = filtered.reduce((acc, curr) => acc + (Number(curr.numberOfWorkers) || 1), 0);

                        return (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">
                                            Total Labour Expenditure
                                        </span>
                                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                            ₹{totalSpend.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Project Direct Fabrication Labour</span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Total Workers Deployed
                                        </span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            {totalWorkers} Workers
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Across logged fabrication operations</span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Total Entries Logged
                                        </span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            {filtered.length} Records
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">In BOM & Project Costing Hub</span>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                                    {filtered.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 font-bold">
                                            No labour cost records found matching the filters. Click "Add Labour Cost" to create a new entry.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                                        <th className="px-4 py-3">Work Date</th>
                                                        <th className="px-4 py-3">Project</th>
                                                        <th className="px-4 py-3">Category</th>
                                                        <th className="px-4 py-3">Worker / Crew</th>
                                                        <th className="px-4 py-3">Description</th>
                                                        <th className="px-4 py-3 text-center">Quantity & Rate</th>
                                                        <th className="px-4 py-3 text-right">Total Amount</th>
                                                        <th className="px-4 py-3 text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                    {filtered.map(l => (
                                                        <tr key={l._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                                                                {new Date(l.workDate).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold whitespace-nowrap">
                                                                {l.projectTitle}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                                    {l.labourCategory}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className="font-bold text-slate-900 dark:text-white">{l.workerName || 'Shopfloor Crew'}</span>
                                                                <span className="text-[10px] text-slate-400 block">{l.numberOfWorkers} worker(s)</span>
                                                            </td>
                                                            <td className="px-4 py-3 max-w-xs truncate" title={l.workDescription}>
                                                                {l.workDescription}
                                                                {l.notes && <span className="block text-[10px] text-slate-400 italic">"{l.notes}"</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                {l.rateType === 'Fixed Job' ? (
                                                                    <span className="font-bold text-slate-800 dark:text-slate-200">Fixed Job</span>
                                                                ) : (
                                                                    <span>{l.quantity} {l.rateType === 'Hourly' ? 'hrs' : 'days'} @ ₹{l.rate}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                                ₹{l.totalAmount?.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleOpenEditLabour(l)}
                                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition"
                                                                        title="Edit Labour Record"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteLabour(l._id)}
                                                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 transition"
                                                                        title="Delete Labour Record"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* TAB 5: INDEPENDENT TRANSPORT COSTS */}
            {activeTab === 'transport' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                            <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search by vehicle, driver, route, project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold w-full sm:w-72"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                            <select
                                value={selectedProjectFilter}
                                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="All">All Projects</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.title}</option>
                                ))}
                            </select>

                            <select
                                value={selectedTransportTypeFilter}
                                onChange={(e) => setSelectedTransportTypeFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                <option value="All">All Transport Types</option>
                                {TRANSPORT_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={transportDateFilter}
                                onChange={(e) => setTransportDateFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                title="Filter by transport date"
                            />
                            {transportDateFilter && (
                                <button
                                    onClick={() => setTransportDateFilter('')}
                                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded"
                                    title="Clear date filter"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <button
                                onClick={() => handleOpenAddTransport()}
                                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Transport Cost</span>
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {(() => {
                        const filtered = transportCosts.filter(t => {
                            const matchProj = selectedProjectFilter === 'All' || (t.projectId?._id || t.projectId) === selectedProjectFilter;
                            const matchType = selectedTransportTypeFilter === 'All' || t.transportType === selectedTransportTypeFilter;
                            const matchDate = !transportDateFilter || (t.transportDate && new Date(t.transportDate).toISOString().split('T')[0] === transportDateFilter);
                            const matchSearch = !searchQuery || 
                                t.transportDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.startingLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase());
                            return matchProj && matchType && matchDate && matchSearch;
                        });
                        const totalTransport = filtered.reduce((acc, curr) => acc + (Number(curr.totalTransportCost) || 0), 0);
                        const totalTrips = filtered.reduce((acc, curr) => acc + (Number(curr.numberOfTrips) || 1), 0);

                        return (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/50 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 block mb-1">
                                            Total Transport Expenditure
                                        </span>
                                        <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                                            ₹{totalTransport.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Project Freight, Fuel & Dispatch Logistics</span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Total Logistics Trips
                                        </span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            {totalTrips} Trips
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">Executed transport movements</span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                            Total Entries Logged
                                        </span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">
                                            {filtered.length} Records
                                        </span>
                                        <span className="text-[10px] text-slate-400 block mt-0.5">In BOM & Project Costing Hub</span>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                                    {filtered.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 font-bold">
                                            No transport cost records found matching the filters. Click "Add Transport Cost" to create a new entry.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3">Project</th>
                                                        <th className="px-4 py-3">Type</th>
                                                        <th className="px-4 py-3">Vehicle / Driver</th>
                                                        <th className="px-4 py-3">Route & Description</th>
                                                        <th className="px-4 py-3 text-center">Cost Breakdown</th>
                                                        <th className="px-4 py-3 text-right">Total Cost</th>
                                                        <th className="px-4 py-3 text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                    {filtered.map(t => (
                                                        <tr key={t._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                                                                {new Date(t.transportDate).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold whitespace-nowrap">
                                                                {t.projectTitle}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400">
                                                                    {t.transportType}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className="font-bold text-slate-900 dark:text-white">{t.vehicleNumber || 'Standard Carrier'}</span>
                                                                {t.driverName && <span className="text-[10px] text-slate-400 block">Driver: {t.driverName}</span>}
                                                            </td>
                                                            <td className="px-4 py-3 max-w-xs truncate" title={`${t.startingLocation} -> ${t.destination}`}>
                                                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                                                    {t.startingLocation && t.destination ? `${t.startingLocation} ➔ ${t.destination}` : (t.destination || 'On-site Transit')}
                                                                </div>
                                                                {t.transportDescription && (
                                                                    <span className="text-[10px] text-slate-400 block truncate">{t.transportDescription}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap text-[10px] text-slate-500">
                                                                <span>Freight: ₹{t.freightCharge}</span>
                                                                {t.fuelCharge > 0 && <span className="ml-1">• Fuel: ₹{t.fuelCharge}</span>}
                                                                {t.tollCharge > 0 && <span className="ml-1">• Toll: ₹{t.tollCharge}</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                                                                ₹{t.totalTransportCost?.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleOpenEditTransport(t)}
                                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition"
                                                                        title="Edit Transport Record"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTransport(t._id)}
                                                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 transition"
                                                                        title="Delete Transport Record"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* TAB 6: PROJECT COSTING & PROFITABILITY DASHBOARD */}
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
                                <span className="text-[10px] text-slate-400 block mt-0.5">Cumulative actual cost</span>
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
                                Project-Wise Costing & Profitability Statements ({projectsCosting.length})
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
                                        {/* Card Header: Title & Profitability */}
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
                                                    act.actualProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                                }`}>
                                                    {act.actualProfitMargin}% Margin
                                                </span>
                                                <span className="block text-xs font-black text-slate-900 dark:text-white mt-1">
                                                    ₹{act.actualProfit?.toLocaleString()} Profit
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cost Components Breakdown */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Material Cost</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.materialCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block truncate">Est: ₹{est.materialCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-indigo-500 font-bold uppercase block">Labour Cost</span>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                    ₹{act.labourCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block truncate">Est: ₹{est.labourCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-cyan-500 font-bold uppercase block">Transport</span>
                                                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                                                    ₹{act.transportCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block truncate">Est: ₹{est.transportCost?.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Machine Cost</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{(act.machineCost || 0)?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block">Equipment</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Other Expenses</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{act.otherCost?.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 block truncate">Est: ₹{est.otherCost?.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Financial Metrics Row: Actual Cost, Budget, Variance & Revenue */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-2.5 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Actual Cost</span>
                                                <span className="font-black text-slate-900 dark:text-white">
                                                    ₹{act.totalCost?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Approved Budget</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    ₹{fin.approvedProjectValue?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Budget Variance</span>
                                                <span className={`font-black ${fin.isCostOverrun ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {fin.isCostOverrun ? `+₹${fin.costVariance?.toLocaleString()} (Over)` : `₹${Math.abs(fin.costVariance || 0)?.toLocaleString()} (Under)`}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Project Revenue</span>
                                                <span className="font-black text-blue-600 dark:text-blue-400">
                                                    ₹{act.recognizedRevenue?.toLocaleString()}
                                                </span>
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

                                        {/* Dedicated Action Buttons */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <button
                                                    onClick={() => {
                                                        setConsumeForm({
                                                            projectId: c.project.id,
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
                                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                                                    title="Add material consumption for this project"
                                                >
                                                    <Package className="w-3 h-3" />
                                                    <span>+ Material</span>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenAddLabour(c.project.id)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                                                    title="Add labour cost for this project"
                                                >
                                                    <Users className="w-3 h-3" />
                                                    <span>+ Labour</span>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenAddTransport(c.project.id)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 text-[11px] font-bold transition flex items-center gap-1 border border-cyan-200 dark:border-cyan-800"
                                                    title="Add transport cost for this project"
                                                >
                                                    <Truck className="w-3 h-3" />
                                                    <span>+ Transport</span>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenProjectHistory(c.project.id)}
                                                    className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 text-[11px] font-bold transition flex items-center gap-1 border border-purple-200 dark:border-purple-800"
                                                    title="View itemized cost history & audit trail"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    <span>View Cost Details</span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleExportCostingPDF(c)}
                                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition flex items-center gap-1"
                                                title="Download PDF statement"
                                            >
                                                <Download className="w-3 h-3" />
                                                <span>PDF</span>
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

            {/* MODAL: CREATE MATERIAL REQUEST */}
            <AnimatePresence>
                {showRequestModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            Request Material from Store
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            Requisition raw materials, steel profiles, or fasteners for a project.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowRequestModal(false)} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveMaterialRequest} className="space-y-4 text-xs">
                                {/* Project & Priority Selection */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                            Target Project *
                                        </label>
                                        <select
                                            required
                                            value={requestForm.projectId}
                                            onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                        >
                                            <option value="">Select Project...</option>
                                            {projects.map(p => {
                                                const isCancelled = ['cancelled', 'CANCELLED', 'Cancelled'].includes(p.status);
                                                return (
                                                    <option key={p._id} value={p._id} disabled={isCancelled}>
                                                        {p.title} {isCancelled ? '(Cancelled - Ineligible)' : `• ${p.status || 'Active'}`}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                            Priority Level
                                        </label>
                                        <select
                                            value={requestForm.priority}
                                            onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                                        >
                                            <option value="Normal">Normal</option>
                                            <option value="High">High Priority</option>
                                            <option value="Urgent">Urgent / Critical</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Linked BOM (Optional) */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Linked Bill of Materials (Optional)
                                    </label>
                                    <select
                                        value={requestForm.bomId}
                                        onChange={(e) => setRequestForm({ ...requestForm, bomId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                                    >
                                        <option value="">No BOM Linked (General Requisition)</option>
                                        {boms
                                            .filter(b => !requestForm.projectId || String(b.projectId?._id || b.projectId) === String(requestForm.projectId))
                                            .map(b => (
                                                <option key={b._id} value={b._id}>
                                                    {b.bomNumber} - {b.productName} ({b.jobOrderNumber || 'General'})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Requested Items Section */}
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                                            Materials Requested ({requestForm.items.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAddRequestItem}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>+ Add Item</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                                        {requestForm.items.map((item, idx) => {
                                            const selectedInv = inventoryItems.find(i => String(i._id) === String(item.inventoryItemId));
                                            const currentStock = selectedInv?.quantity ?? null;

                                            return (
                                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                                                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/50 dark:border-slate-800">
                                                        <span className="font-black text-[10px] uppercase text-indigo-600 dark:text-indigo-400">
                                                            Item #{idx + 1}
                                                        </span>
                                                        {requestForm.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveRequestItem(idx)}
                                                                className="text-rose-500 hover:text-rose-700 p-1 transition"
                                                                title="Remove item"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        {/* Store Item Selection */}
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                                                Select from Store Stock
                                                            </label>
                                                            <select
                                                                value={item.inventoryItemId}
                                                                onChange={(e) => handleUpdateRequestItem(idx, 'inventoryItemId', e.target.value)}
                                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                            >
                                                                <option value="">-- Custom / Manual Entry Below --</option>
                                                                {inventoryItems.map(inv => (
                                                                    <option key={inv._id} value={inv._id}>
                                                                        {inv.name} (Stock: {inv.quantity || 0} {inv.unit || 'Pcs'})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {currentStock !== null && (
                                                                <span className={`text-[10px] font-semibold mt-0.5 block ${currentStock <= 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                                                    Current Store Stock: {currentStock} {item.unit || 'Pcs'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Category */}
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                                                Category
                                                            </label>
                                                            <select
                                                                value={item.category}
                                                                onChange={(e) => handleUpdateRequestItem(idx, 'category', e.target.value)}
                                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs"
                                                            >
                                                                {FABRICATION_CATEGORIES.map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {/* Material Name */}
                                                        <div className="col-span-2">
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                                                Material Name / Item Code *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="e.g. MS Plate 16mm IS 2062"
                                                                value={item.materialName}
                                                                onChange={(e) => handleUpdateRequestItem(idx, 'materialName', e.target.value)}
                                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                            />
                                                        </div>

                                                        {/* Qty */}
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                                                Quantity *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                required
                                                                value={item.requestedQty}
                                                                onChange={(e) => handleUpdateRequestItem(idx, 'requestedQty', Math.max(1, Number(e.target.value) || 1))}
                                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs text-indigo-600"
                                                            />
                                                        </div>

                                                        {/* Unit */}
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                                                Unit
                                                            </label>
                                                            <select
                                                                value={item.unit}
                                                                onChange={(e) => handleUpdateRequestItem(idx, 'unit', e.target.value)}
                                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs"
                                                            >
                                                                {STANDARD_UNITS.map(u => (
                                                                    <option key={u} value={u}>{u}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Specification */}
                                                    <div>
                                                        <input
                                                            type="text"
                                                            placeholder="Specification / Dimensions / Heat No. / Make (Optional)"
                                                            value={item.specification}
                                                            onChange={(e) => handleUpdateRequestItem(idx, 'specification', e.target.value)}
                                                            className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-[11px]"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Justification / Notes */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Remarks / Justification
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="State purpose of material requisition, shop-floor work order reference, or urgency details..."
                                        value={requestForm.notes}
                                        onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowRequestModal(false)}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                                    >
                                        {actionLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Submitting Request...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-4 h-4" />
                                                <span>Submit Material Request</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: VIEW REQUEST DETAILS */}
            <AnimatePresence>
                {selectedRequestDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                        Material Requisition Details
                                    </span>
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        {selectedRequestDetails.requestNumber}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedRequestDetails(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Project</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequestDetails.projectTitle}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Requested By</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequestDetails.requestedByName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Priority</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequestDetails.priority}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Status</span>
                                    <span className="font-black uppercase text-indigo-600 dark:text-indigo-400">{selectedRequestDetails.status}</span>
                                </div>
                            </div>

                            {selectedRequestDetails.rejectionReason && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 rounded-xl text-xs text-rose-600">
                                    <span className="font-black block uppercase text-[10px]">Rejection Reason:</span>
                                    {selectedRequestDetails.rejectionReason}
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 mb-2">
                                    Requisitioned Items ({selectedRequestDetails.items?.length || 0})
                                </h3>
                                <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black">
                                            <tr>
                                                <th className="px-3 py-2">Material</th>
                                                <th className="px-3 py-2">Category</th>
                                                <th className="px-3 py-2 text-center">Requested</th>
                                                <th className="px-3 py-2 text-center">Approved</th>
                                                <th className="px-3 py-2 text-center">Issued</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-semibold">
                                            {selectedRequestDetails.items?.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">
                                                        {item.materialName}
                                                        {item.specification ? (
                                                            <span className="block text-[10px] font-normal text-slate-400">{item.specification}</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">{item.category}</td>
                                                    <td className="px-3 py-2 text-center font-black text-indigo-600">{item.requestedQty} {item.unit}</td>
                                                    <td className="px-3 py-2 text-center font-bold text-emerald-600">{item.approvedQty || 0} {item.unit}</td>
                                                    <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">{item.issuedQty || 0} {item.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {selectedRequestDetails.notes && (
                                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl">
                                    <span className="font-bold block text-slate-700 dark:text-slate-300 mb-1">Remarks:</span>
                                    {selectedRequestDetails.notes}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setSelectedRequestDetails(null)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                >
                                    Close
                                </button>
                                {selectedRequestDetails.status === 'Pending' && (
                                    <button
                                        onClick={() => {
                                            const req = selectedRequestDetails;
                                            setSelectedRequestDetails(null);
                                            handleOpenReviewModal(req);
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                    >
                                        Review & Issue Stock
                                    </button>
                                )}
                            </div>
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

            {/* MODAL: ADD / EDIT LABOUR COST */}
            <AnimatePresence>
                {showLabourModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                        <span>{editingLabour ? 'Edit Project Labour Cost' : 'Record Project Labour Cost'}</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        Independent labour cost entry for fabrication, welding, assembly, and site work.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowLabourModal(false)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveLabour} className="space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Target Project *</label>
                                        <select
                                            required
                                            value={labourForm.projectId}
                                            onChange={(e) => setLabourForm({ ...labourForm, projectId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>
                                                    {p.title} ({p.projectCode || p.jobOrderNumber || 'No Code'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Labour Category *</label>
                                        <select
                                            required
                                            value={labourForm.labourCategory}
                                            onChange={(e) => setLabourForm({ ...labourForm, labourCategory: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            {LABOUR_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Worker / Team Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Ramesh Kumar / Site Team B"
                                            value={labourForm.workerName}
                                            onChange={(e) => setLabourForm({ ...labourForm, workerName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Work Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={labourForm.workDate}
                                            onChange={(e) => setLabourForm({ ...labourForm, workDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Work Description *</label>
                                    <textarea
                                        rows="2"
                                        required
                                        placeholder="Specific work completed e.g. Truss assembly welding, base plate drilling, grinding welds..."
                                        value={labourForm.workDescription}
                                        onChange={(e) => setLabourForm({ ...labourForm, workDescription: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                    />
                                </div>

                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                                    <div className="font-bold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                        Rate & Working Hours Calculation
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Rate Basis *</label>
                                            <select
                                                value={labourForm.rateType}
                                                onChange={(e) => updateLabourFormCalculation('rateType', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                                            >
                                                {RATE_TYPES.map(rt => (
                                                    <option key={rt} value={rt}>{rt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">No. of Workers *</label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={labourForm.numberOfWorkers}
                                                onChange={(e) => updateLabourFormCalculation('numberOfWorkers', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                                {labourForm.rateType === 'Hourly' ? 'Hours' : labourForm.rateType === 'Daily' ? 'Days / Shifts' : labourForm.rateType === 'Piece Rate' ? 'Quantity / Pcs' : 'Units'} *
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0.1"
                                                required
                                                disabled={labourForm.rateType === 'Fixed Job'}
                                                value={labourForm.quantity}
                                                onChange={(e) => updateLabourFormCalculation('quantity', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                                                Rate (₹ / {labourForm.rateType === 'Hourly' ? 'hr' : labourForm.rateType === 'Daily' ? 'day' : labourForm.rateType === 'Piece Rate' ? 'pc' : 'job'}) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={labourForm.rate}
                                                onChange={(e) => updateLabourFormCalculation('rate', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                                        <div className="text-[11px] text-slate-500">
                                            Formula: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{labourForm.rateType === 'Fixed Job' ? `Fixed ₹${labourForm.rate}` : `${labourForm.numberOfWorkers} worker(s) × ${labourForm.quantity} × ₹${labourForm.rate}`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">Total Labour Cost (₹):</label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={labourForm.totalAmount}
                                                onChange={(e) => setLabourForm({ ...labourForm, totalAmount: Number(e.target.value) || 0 })}
                                                className="w-36 px-3 py-1.5 rounded-xl border-2 border-indigo-500 bg-white dark:bg-slate-900 font-black text-indigo-700 dark:text-indigo-400 text-sm text-right"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Notes / Remarks</label>
                                        <input
                                            type="text"
                                            placeholder="Optional notes or overtime info..."
                                            value={labourForm.notes}
                                            onChange={(e) => setLabourForm({ ...labourForm, notes: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Attachment / Timesheet Link</label>
                                        <input
                                            type="text"
                                            placeholder="https://... or doc URL"
                                            value={labourForm.attachmentUrl}
                                            onChange={(e) => setLabourForm({ ...labourForm, attachmentUrl: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowLabourModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md shadow-indigo-600/20"
                                    >
                                        {actionLoading ? 'Saving...' : editingLabour ? 'Update Labour Record' : 'Save Labour Cost'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: ADD / EDIT TRANSPORT COST */}
            <AnimatePresence>
                {showTransportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-amber-600" />
                                        <span>{editingTransport ? 'Edit Project Transport Cost' : 'Record Project Transport Cost'}</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        Independent freight, fuel, vehicle trip, and logistics cost for this project.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTransportModal(false)}
                                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveTransport} className="space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Target Project *</label>
                                        <select
                                            required
                                            value={transportForm.projectId}
                                            onChange={(e) => setTransportForm({ ...transportForm, projectId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>
                                                    {p.title} ({p.projectCode || p.jobOrderNumber || 'No Code'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Transport Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={transportForm.transportDate}
                                            onChange={(e) => setTransportForm({ ...transportForm, transportDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Transport / Vehicle Type *</label>
                                        <select
                                            required
                                            value={transportForm.transportType}
                                            onChange={(e) => setTransportForm({ ...transportForm, transportType: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            {TRANSPORT_TYPES.map(tt => (
                                                <option key={tt} value={tt}>{tt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Vehicle Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. KL-09-AH-3829"
                                            value={transportForm.vehicleNumber}
                                            onChange={(e) => setTransportForm({ ...transportForm, vehicleNumber: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Driver / Transporter</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Suresh / City Logistics"
                                            value={transportForm.driverName}
                                            onChange={(e) => setTransportForm({ ...transportForm, driverName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Starting Location</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Fabrication Yard, Palakkad"
                                            value={transportForm.startingLocation}
                                            onChange={(e) => setTransportForm({ ...transportForm, startingLocation: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Destination Site</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Client Site, Kochi"
                                            value={transportForm.destination}
                                            onChange={(e) => setTransportForm({ ...transportForm, destination: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">No. of Trips</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={transportForm.numberOfTrips}
                                            onChange={(e) => setTransportForm({ ...transportForm, numberOfTrips: Number(e.target.value) || 1 })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Transport / Goods Description</label>
                                    <textarea
                                        rows="2"
                                        placeholder="e.g. Shifted 4 prefabricated roof trusses and purlins to site..."
                                        value={transportForm.transportDescription}
                                        onChange={(e) => setTransportForm({ ...transportForm, transportDescription: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                    />
                                </div>

                                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/50 space-y-3">
                                    <div className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                        Expense Breakdown (₹)
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400 text-[10px]">Freight / Hire</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={transportForm.freightCharge}
                                                onChange={(e) => updateTransportFormCalculation('freightCharge', e.target.value)}
                                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400 text-[10px]">Fuel / Diesel</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={transportForm.fuelCharge}
                                                onChange={(e) => updateTransportFormCalculation('fuelCharge', e.target.value)}
                                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400 text-[10px]">Loading / Crane</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={transportForm.loadingUnloadingCharge}
                                                onChange={(e) => updateTransportFormCalculation('loadingUnloadingCharge', e.target.value)}
                                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400 text-[10px]">Toll / Fastag</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={transportForm.tollCharge}
                                                onChange={(e) => updateTransportFormCalculation('tollCharge', e.target.value)}
                                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                                            />
                                        </div>

                                        <div>
                                            <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400 text-[10px]">Other Charges</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={transportForm.otherCharge}
                                                onChange={(e) => updateTransportFormCalculation('otherCharge', e.target.value)}
                                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-amber-100 dark:border-amber-900/50">
                                        <div className="text-[11px] text-slate-500">
                                            Sum of breakdown: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">₹{((Number(transportForm.freightCharge) || 0) + (Number(transportForm.fuelCharge) || 0) + (Number(transportForm.loadingUnloadingCharge) || 0) + (Number(transportForm.tollCharge) || 0) + (Number(transportForm.otherCharge) || 0)).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">Total Transport Cost (₹):</label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={transportForm.totalTransportCost}
                                                onChange={(e) => setTransportForm({ ...transportForm, totalTransportCost: Number(e.target.value) || 0 })}
                                                className="w-36 px-3 py-1.5 rounded-xl border-2 border-amber-500 bg-white dark:bg-slate-900 font-black text-amber-700 dark:text-amber-400 text-sm text-right"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Notes / Remarks</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Weighbridge slip attached, driver toll receipt..."
                                            value={transportForm.notes}
                                            onChange={(e) => setTransportForm({ ...transportForm, notes: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Attachment / LR / Bilty Link</label>
                                        <input
                                            type="text"
                                            placeholder="https://... or receipt URL"
                                            value={transportForm.attachmentUrl}
                                            onChange={(e) => setTransportForm({ ...transportForm, attachmentUrl: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowTransportModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-md shadow-amber-600/20"
                                    >
                                        {actionLoading ? 'Saving...' : editingTransport ? 'Update Transport Record' : 'Save Transport Cost'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: PROJECT COST HISTORY & AUDIT TRAIL */}
            <AnimatePresence>
                {showProjectHistoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-5xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-6"
                        >
                            {/* Modal Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-black text-slate-900 dark:text-white">
                                            Project Cost Details & Complete Audit Trail
                                        </h2>
                                        {projectHistoryData?.project && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                projectHistoryData.project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                projectHistoryData.project.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {projectHistoryData.project.status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {projectHistoryData?.project?.title} • Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{projectHistoryData?.project?.projectCode || projectHistoryData?.project?.jobOrderNumber || 'N/A'}</span> • Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{projectHistoryData?.project?.customerName || 'N/A'}</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {projectHistoryData?.project?.id && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const pid = projectHistoryData.project.id;
                                                    setShowProjectHistoryModal(false);
                                                    setConsumeForm({
                                                        projectId: pid,
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
                                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                                            >
                                                <Package className="w-3.5 h-3.5" />
                                                <span>+ Material</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const pid = projectHistoryData.project.id;
                                                    setShowProjectHistoryModal(false);
                                                    handleOpenAddLabour(pid);
                                                }}
                                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span>+ Labour</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const pid = projectHistoryData.project.id;
                                                    setShowProjectHistoryModal(false);
                                                    handleOpenAddTransport(pid);
                                                }}
                                                className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 text-[11px] font-bold transition flex items-center gap-1 border border-cyan-200 dark:border-cyan-800"
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                <span>+ Transport</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setShowProjectHistoryModal(false)}
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {historyLoading ? (
                                <div className="p-12 text-center text-slate-400 font-bold">
                                    Loading complete project cost history...
                                </div>
                            ) : !projectHistoryData ? (
                                <div className="p-12 text-center text-slate-400 font-bold">
                                    No history data available for this project.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Cost Breakdown Summary Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Material Cost</span>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                                ₹{projectHistoryData.summary?.totalMaterialCost?.toLocaleString() || 0}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                            <span className="text-[10px] text-indigo-500 font-bold uppercase block">Labour Cost</span>
                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                ₹{projectHistoryData.summary?.totalLabourCost?.toLocaleString() || 0}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                            <span className="text-[10px] text-amber-500 font-bold uppercase block">Transport Cost</span>
                                            <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                                ₹{projectHistoryData.summary?.totalTransportCost?.toLocaleString() || 0}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                            <span className="text-[10px] text-purple-500 font-bold uppercase block">Machine / Other</span>
                                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                                                ₹{((projectHistoryData.summary?.totalMachineCost || 0) + (projectHistoryData.summary?.totalOtherCost || 0)).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-900/50">
                                            <span className="text-[10px] text-rose-500 font-bold uppercase block">Total Cost</span>
                                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                                ₹{projectHistoryData.summary?.totalActualCost?.toLocaleString() || 0}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-900/50">
                                            <span className="text-[10px] text-emerald-500 font-bold uppercase block">Profit / Margin</span>
                                            <span className={`text-xs font-black ${
                                                (projectHistoryData.summary?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                ₹{projectHistoryData.summary?.netProfit?.toLocaleString() || 0} ({projectHistoryData.summary?.profitMarginPercentage || 0}%)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sub-tabs Navigation */}
                                    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-1 overflow-x-auto text-xs">
                                        {[
                                            { id: 'all', label: `Complete Cost History (${projectHistoryData.counts?.completeHistory || 0})` },
                                            { id: 'material', label: `Material Consumption (${projectHistoryData.counts?.materialMovements || 0})` },
                                            { id: 'labour', label: `Labour Costs (${projectHistoryData.counts?.labourRecords || 0})` },
                                            { id: 'transport', label: `Transport Costs (${projectHistoryData.counts?.transportRecords || 0})` },
                                            { id: 'other', label: `Other Expenses (${projectHistoryData.counts?.otherExpenses || 0})` }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setHistorySubTab(tab.id)}
                                                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-xs ${
                                                    historySubTab === tab.id
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sub-tab 1: ALL / COMPLETE COST HISTORY */}
                                    {historySubTab === 'all' && (
                                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                            {(!projectHistoryData.completeHistory || projectHistoryData.completeHistory.length === 0) ? (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    No cost transactions recorded for this project yet.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-3 py-2">Date</th>
                                                            <th className="px-3 py-2">Type</th>
                                                            <th className="px-3 py-2">Description / Particulars</th>
                                                            <th className="px-3 py-2 text-center">Qty / Units</th>
                                                            <th className="px-3 py-2 text-right">Unit Rate</th>
                                                            <th className="px-3 py-2 text-right">Total Amount</th>
                                                            <th className="px-3 py-2">Recorded By</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                        {projectHistoryData.completeHistory.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                                                                    {new Date(item.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                        item.costType === 'Material' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                        item.costType === 'Labour' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                                                                        item.costType === 'Transport' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                                        'bg-purple-50 text-purple-600 border border-purple-200'
                                                                    }`}>
                                                                        {item.costType}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                                                                    {item.subtitle && <div className="text-[10px] text-slate-400 font-normal">{item.subtitle}</div>}
                                                                </td>
                                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                    {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-right whitespace-nowrap text-slate-500">
                                                                    {item.unitRate ? `₹${item.unitRate}` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                                    ₹{item.totalCost?.toLocaleString() || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-[11px]">
                                                                    {item.handler || 'Staff'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 2: MATERIAL CONSUMPTION */}
                                    {historySubTab === 'material' && (
                                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                            {(!projectHistoryData.materialLogs || projectHistoryData.materialLogs.length === 0) ? (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    No material consumption logs recorded for this project.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-3 py-2">Date</th>
                                                            <th className="px-3 py-2">Movement</th>
                                                            <th className="px-3 py-2">Material</th>
                                                            <th className="px-3 py-2 text-center">Consumed Qty</th>
                                                            <th className="px-3 py-2 text-center">Wastage / Scrap</th>
                                                            <th className="px-3 py-2 text-right">Unit Cost</th>
                                                            <th className="px-3 py-2 text-right">Total Cost</th>
                                                            <th className="px-3 py-2">Handler</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                        {projectHistoryData.materialLogs.map((log, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                                                                    {new Date(log.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                        log.movementType === 'ISSUE' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                                        log.movementType === 'CONSUMPTION' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                        log.movementType === 'RETURN' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                                        'bg-rose-50 text-rose-600 border border-rose-200'
                                                                    }`}>
                                                                        {log.movementType}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                                                    {log.materialName} ({log.unit})
                                                                </td>
                                                                <td className="px-3 py-2 text-center font-bold whitespace-nowrap">
                                                                    {log.quantity} {log.unit}
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                                    {log.wastageQuantity ? `${log.wastageQuantity} ${log.unit}` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 text-right whitespace-nowrap text-slate-500">
                                                                    ₹{log.unitCost}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                                    ₹{log.totalCost?.toLocaleString() || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-[11px]">
                                                                    {log.issuedByName || log.receivedBy || 'Staff'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 3: LABOUR COSTS */}
                                    {historySubTab === 'labour' && (
                                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                            {(!projectHistoryData.labourRecords || projectHistoryData.labourRecords.length === 0) ? (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    No labour costs recorded for this project yet. Click "+ Labour" above to add.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-3 py-2">Work Date</th>
                                                            <th className="px-3 py-2">Category</th>
                                                            <th className="px-3 py-2">Worker / Team</th>
                                                            <th className="px-3 py-2">Work Description</th>
                                                            <th className="px-3 py-2 text-center">Basis & Qty</th>
                                                            <th className="px-3 py-2 text-right">Rate</th>
                                                            <th className="px-3 py-2 text-right">Total Amount</th>
                                                            <th className="px-3 py-2 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                        {projectHistoryData.labourRecords.map((lab, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                                                                    {new Date(lab.workDate).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                                        {lab.labourCategory}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 font-bold whitespace-nowrap">
                                                                    {lab.workerName} {lab.numberOfWorkers > 1 && `(${lab.numberOfWorkers} workers)`}
                                                                </td>
                                                                <td className="px-3 py-2 max-w-xs truncate text-slate-500" title={lab.workDescription}>
                                                                    {lab.workDescription}
                                                                </td>
                                                                <td className="px-3 py-2 text-center whitespace-nowrap text-[11px]">
                                                                    {lab.rateType === 'Fixed Job' ? 'Fixed Job' : `${lab.quantity} ${lab.rateType === 'Hourly' ? 'hrs' : lab.rateType === 'Daily' ? 'days' : 'pcs'}`}
                                                                </td>
                                                                <td className="px-3 py-2 text-right whitespace-nowrap text-slate-500">
                                                                    ₹{lab.rate}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                                    ₹{lab.totalAmount?.toLocaleString() || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowProjectHistoryModal(false);
                                                                                handleOpenEditLabour(lab);
                                                                            }}
                                                                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                                                                            title="Edit Labour Record"
                                                                        >
                                                                            <Edit className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteLabour(lab._id)}
                                                                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                                            title="Delete Labour Record"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 4: TRANSPORT COSTS */}
                                    {historySubTab === 'transport' && (
                                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                            {(!projectHistoryData.transportRecords || projectHistoryData.transportRecords.length === 0) ? (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    No transport costs recorded for this project yet. Click "+ Transport" above to add.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-3 py-2">Date</th>
                                                            <th className="px-3 py-2">Transport Type</th>
                                                            <th className="px-3 py-2">Vehicle / Driver</th>
                                                            <th className="px-3 py-2">Route</th>
                                                            <th className="px-3 py-2 text-center">Trips</th>
                                                            <th className="px-3 py-2">Breakdown</th>
                                                            <th className="px-3 py-2 text-right">Total Cost</th>
                                                            <th className="px-3 py-2 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                        {projectHistoryData.transportRecords.map((tr, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                                                                    {new Date(tr.transportDate).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                                        {tr.transportType}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <div className="font-bold text-slate-900 dark:text-white font-mono">{tr.vehicleNumber || '-'}</div>
                                                                    {tr.driverName && <div className="text-[10px] text-slate-400 font-sans">{tr.driverName}</div>}
                                                                </td>
                                                                <td className="px-3 py-2 text-[11px] whitespace-nowrap">
                                                                    <div className="flex items-center gap-1">
                                                                        <span>{tr.startingLocation || 'Yard'}</span>
                                                                        <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{tr.destination || 'Site'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 text-center font-bold whitespace-nowrap">
                                                                    {tr.numberOfTrips || 1}
                                                                </td>
                                                                <td className="px-3 py-2 text-[10px] text-slate-500 whitespace-nowrap">
                                                                    Hire: ₹{tr.freightCharge || 0} | Fuel: ₹{tr.fuelCharge || 0} | Crane: ₹{tr.loadingUnloadingCharge || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                                    ₹{tr.totalTransportCost?.toLocaleString() || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowProjectHistoryModal(false);
                                                                                handleOpenEditTransport(tr);
                                                                            }}
                                                                            className="p-1 rounded text-slate-400 hover:text-blue-600"
                                                                            title="Edit Transport Record"
                                                                        >
                                                                            <Edit className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteTransport(tr._id)}
                                                                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                                            title="Delete Transport Record"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 5: OTHER DIRECT EXPENSES */}
                                    {historySubTab === 'other' && (
                                        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                                            {(!projectHistoryData.otherExpenses || projectHistoryData.otherExpenses.length === 0) ? (
                                                <div className="p-8 text-center text-slate-400 text-xs">
                                                    No other direct expenses recorded for this project.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-3 py-2">Date</th>
                                                            <th className="px-3 py-2">Category</th>
                                                            <th className="px-3 py-2">Title / Description</th>
                                                            <th className="px-3 py-2 text-right">Amount</th>
                                                            <th className="px-3 py-2">Payment Method / Vendor</th>
                                                            <th className="px-3 py-2">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                                        {projectHistoryData.otherExpenses.map((exp, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                                                                    {new Date(exp.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                                        {exp.category}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                                                    {exp.title}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                                                    ₹{exp.amount?.toLocaleString() || 0}
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[11px]">
                                                                    {exp.vendor || exp.paymentMethod || '-'}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                                        {exp.status || 'Recorded'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
