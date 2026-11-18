import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    ShieldCheck, Plus, Search, Filter, Phone, Mail, 
    Calendar, CheckCircle2, Clock, Wrench, AlertTriangle, 
    X, RefreshCw, Star, User, FileText, ChevronRight
} from 'lucide-react';

const AdminWarrantyService = () => {
    const [activeTab, setActiveTab] = useState('warranties'); // 'warranties' | 'service-requests'
    const [warranties, setWarranties] = useState([]);
    const [serviceRequests, setServiceRequests] = useState([]);
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expiringSoonFilter, setExpiringSoonFilter] = useState(false);

    // Modals
    const [showWarrantyModal, setShowWarrantyModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showRepairModal, setShowRepairModal] = useState(false);
    const [showSignOffModal, setShowSignOffModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Form states
    const [warrantyForm, setWarrantyForm] = useState({
        customerId: '',
        projectId: '',
        deliveredItem: '',
        serialNumber: '',
        category: 'Structural Steel',
        startDate: new Date().toISOString().split('T')[0],
        durationMonths: 12,
        coverageTerms: '',
        exclusions: ''
    });

    const [serviceForm, setServiceForm] = useState({
        customerId: '',
        projectId: '',
        warrantyId: '',
        deliveredItem: '',
        issueDescription: '',
        priority: 'Medium'
    });

    const [assignForm, setAssignForm] = useState({
        technicianId: '',
        scheduledVisitDate: '',
        warrantyStatusOverride: ''
    });

    const [repairForm, setRepairForm] = useState({
        diagnosisNotes: '',
        repairActionsTaken: '',
        labourHours: 2,
        labourCost: 300,
        customerChargeableAmount: 0,
        selectedItemId: '',
        partQty: 1,
        partsConsumed: []
    });

    const [signOffForm, setSignOffForm] = useState({
        rating: 5,
        remarks: 'Job completed satisfactorily'
    });

    useEffect(() => {
        fetchWarranties();
        fetchServiceRequests();
        fetchProjects();
        fetchCustomers();
        fetchStaff();
        fetchMaterials();
    }, [expiringSoonFilter]);

    const fetchWarranties = async () => {
        setLoading(true);
        try {
            const params = {};
            if (expiringSoonFilter) params.expiringSoon = 'true';
            const res = await api.get('/warranties', { params });
            if (res.data.success) {
                setWarranties(res.data.warranties);
            }
        } catch (err) {
            console.error('Error fetching warranties:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchServiceRequests = async () => {
        try {
            const res = await api.get('/service-requests');
            if (res.data.success) {
                setServiceRequests(res.data.requests);
            }
        } catch (err) {
            console.error('Error fetching service requests:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(Array.isArray(res.data) ? res.data : (res.data.projects || []));
        } catch (_) {}
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/admin/users');
            const list = Array.isArray(res.data) ? res.data : (res.data.users || []);
            setCustomers(list.filter(u => u.role === 'customer'));
        } catch (_) {}
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaffList(res.data || []);
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

    const handleCreateWarrantySubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/warranties', warrantyForm);
            if (res.data.success) {
                setShowWarrantyModal(false);
                fetchWarranties();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating warranty');
        }
    };

    const handleCreateServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/service-requests', serviceForm);
            if (res.data.success) {
                setShowServiceModal(false);
                fetchServiceRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating service request');
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/service-requests/${selectedRequest._id}/assign`, assignForm);
            if (res.data.success) {
                setShowAssignModal(false);
                fetchServiceRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign technician');
        }
    };

    const handleAddPartToRepair = () => {
        const mat = materials.find(m => m._id === repairForm.selectedItemId);
        if (!mat) return;
        const newPart = {
            inventoryItemId: mat._id,
            partName: mat.name,
            quantity: Number(repairForm.partQty) || 1,
            unitCost: mat.unitPrice || 0,
            totalCost: (Number(repairForm.partQty) || 1) * (mat.unitPrice || 0),
            isChargeable: selectedRequest.warrantyStatus !== 'Under Warranty'
        };
        setRepairForm({
            ...repairForm,
            partsConsumed: [...repairForm.partsConsumed, newPart],
            selectedItemId: '',
            partQty: 1
        });
    };

    const handleRepairSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                diagnosisNotes: repairForm.diagnosisNotes,
                repairActionsTaken: repairForm.repairActionsTaken,
                labourHours: Number(repairForm.labourHours) || 0,
                labourCost: Number(repairForm.labourCost) || 0,
                customerChargeableAmount: Number(repairForm.customerChargeableAmount) || 0,
                partsConsumed: repairForm.partsConsumed,
                status: 'Customer Confirmation'
            };
            const res = await api.put(`/service-requests/${selectedRequest._id}/record-repair`, payload);
            if (res.data.success) {
                setShowRepairModal(false);
                fetchServiceRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record repair');
        }
    };

    const handleSignOffSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/service-requests/${selectedRequest._id}/signoff`, signOffForm);
            if (res.data.success) {
                setShowSignOffModal(false);
                fetchServiceRequests();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record customer signoff');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> After-Sales & Customer Retention
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Warranty & Service Management
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Register product warranties, track expiry reminders, and manage customer service visits without duplicate accounting.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => {
                            fetchWarranties();
                            fetchServiceRequests();
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {activeTab === 'warranties' ? (
                        <button
                            onClick={() => {
                                setWarrantyForm({
                                    customerId: customers[0]?._id || '',
                                    projectId: projects[0]?._id || '',
                                    deliveredItem: '',
                                    serialNumber: '',
                                    category: 'Structural Steel',
                                    startDate: new Date().toISOString().split('T')[0],
                                    durationMonths: 12,
                                    coverageTerms: '',
                                    exclusions: ''
                                });
                                setShowWarrantyModal(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Register Warranty
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setServiceForm({
                                    customerId: customers[0]?._id || '',
                                    projectId: projects[0]?._id || '',
                                    warrantyId: '',
                                    deliveredItem: '',
                                    issueDescription: '',
                                    priority: 'Medium'
                                });
                                setShowServiceModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Service Request
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tab Bar */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
                <button
                    onClick={() => setActiveTab('warranties')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
                        activeTab === 'warranties'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" /> Warranty Registrations ({warranties.length})
                </button>
                <button
                    onClick={() => setActiveTab('service-requests')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition ${
                        activeTab === 'service-requests'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Wrench className="w-4 h-4" /> Service Requests & Visits ({serviceRequests.length})
                </button>
            </div>

            {/* TAB 1: WARRANTIES */}
            {activeTab === 'warranties' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 text-xs">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search warranties by certificate number, customer, project or item..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none"
                            />
                        </div>

                        <button
                            onClick={() => setExpiringSoonFilter(!expiringSoonFilter)}
                            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                                expiringSoonFilter 
                                    ? 'bg-amber-500 text-white shadow-sm' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" /> Expiring in 30 Days
                        </button>
                    </div>

                    {/* Warranties Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-black">
                                <tr>
                                    <th className="p-3">Certificate No</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Project / Delivered Item</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Start Date</th>
                                    <th className="p-3">Expiry Date</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {warranties.map(w => (
                                    <tr key={w._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="p-3 font-mono font-black text-slate-900 dark:text-white">{w.warrantyNumber}</td>
                                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                            {w.customerName}
                                            <span className="block text-[10px] text-slate-400 font-normal">{w.customerPhone}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-bold text-slate-900 dark:text-white block">{w.deliveredItem}</span>
                                            <span className="text-[10px] text-slate-400">{w.projectTitle}</span>
                                        </td>
                                        <td className="p-3 text-slate-500">{w.category}</td>
                                        <td className="p-3 text-slate-500">{new Date(w.startDate).toLocaleDateString()}</td>
                                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                                            {new Date(w.expiryDate).toLocaleDateString()} ({w.durationMonths}m)
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                w.status === 'Active' 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {w.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: SERVICE REQUESTS */}
            {activeTab === 'service-requests' && (
                <div className="space-y-4">
                    <div className="space-y-3">
                        {serviceRequests.map(req => (
                            <div key={req._id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 transition space-y-3 text-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-slate-900 dark:text-white">{req.complaintNumber}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {req.status}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            req.warrantyStatus === 'Under Warranty' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {req.warrantyStatus}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {req.status === 'Complaint Received' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setAssignForm({ technicianId: staffList[0]?._id || '', scheduledVisitDate: '', warrantyStatusOverride: req.warrantyStatus });
                                                    setShowAssignModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <User className="w-3.5 h-3.5" /> Assign Technician
                                            </button>
                                        )}
                                        {['Technician Assigned', 'Visit Scheduled', 'Diagnosis in Progress'].includes(req.status) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setRepairForm({ diagnosisNotes: '', repairActionsTaken: '', labourHours: 2, labourCost: 300, customerChargeableAmount: 0, selectedItemId: '', partQty: 1, partsConsumed: [] });
                                                    setShowRepairModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <Wrench className="w-3.5 h-3.5" /> Record Repair Actions
                                            </button>
                                        )}
                                        {req.status === 'Customer Confirmation' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setSignOffForm({ rating: 5, remarks: 'Satisfied' });
                                                    setShowSignOffModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Customer Signoff & Close
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-500">
                                    <div>Customer: <strong className="text-slate-800 dark:text-slate-200">{req.customerName}</strong> ({req.customerPhone})</div>
                                    <div>Item: <strong className="text-slate-800 dark:text-slate-200">{req.deliveredItem}</strong></div>
                                    <div>Priority: <strong className="text-rose-600">{req.priority}</strong></div>
                                </div>

                                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                    "{req.issueDescription}"
                                </p>

                                {req.assignedTechnicianName && (
                                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                                        <span>Technician: <strong>{req.assignedTechnicianName}</strong></span>
                                        {req.scheduledVisitDate && <span>Visit Date: <strong>{new Date(req.scheduledVisitDate).toLocaleDateString()}</strong></span>}
                                        <span>Total Service Cost: <strong className="text-indigo-600">₹{req.totalServiceCost}</strong></span>
                                        {req.customerChargeableAmount > 0 && <span className="text-rose-600 font-bold">Chargeable: ₹{req.customerChargeableAmount}</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal: Register Warranty */}
            {showWarrantyModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Register Product Warranty</h2>
                            <button onClick={() => setShowWarrantyModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateWarrantySubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Customer *</label>
                                    <select
                                        required
                                        value={warrantyForm.customerId}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, customerId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Project *</label>
                                    <select
                                        required
                                        value={warrantyForm.projectId}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, projectId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Project...</option>
                                        {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Delivered Item *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Industrial Shed / Rolling Shutter"
                                        value={warrantyForm.deliveredItem}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, deliveredItem: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Serial / Asset Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. KE-SHED-2026-01"
                                        value={warrantyForm.serialNumber}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, serialNumber: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Warranty Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={warrantyForm.startDate}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, startDate: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Duration (Months)</label>
                                    <select
                                        value={warrantyForm.durationMonths}
                                        onChange={(e) => setWarrantyForm({ ...warrantyForm, durationMonths: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                    >
                                        <option value="6">6 Months</option>
                                        <option value="12">12 Months (1 Year)</option>
                                        <option value="24">24 Months (2 Years)</option>
                                        <option value="36">36 Months (3 Years)</option>
                                        <option value="60">60 Months (5 Years)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowWarrantyModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md">Issue Certificate</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Service Request */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Log Service Request</h2>
                            <button onClick={() => setShowServiceModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateServiceSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Customer *</label>
                                    <select
                                        required
                                        value={serviceForm.customerId}
                                        onChange={(e) => setServiceForm({ ...serviceForm, customerId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Project *</label>
                                    <select
                                        required
                                        value={serviceForm.projectId}
                                        onChange={(e) => setServiceForm({ ...serviceForm, projectId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Project...</option>
                                        {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Delivered Item / Machinery</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Automatic Main Gate Motor / Roof Truss"
                                    value={serviceForm.deliveredItem}
                                    onChange={(e) => setServiceForm({ ...serviceForm, deliveredItem: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Complaint / Issue Description *</label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Describe breakdown, noise, misalignment, water leakage..."
                                    value={serviceForm.issueDescription}
                                    onChange={(e) => setServiceForm({ ...serviceForm, issueDescription: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowServiceModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Assign Technician */}
            {showAssignModal && selectedRequest && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Assign Technician & Schedule Visit</h2>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Service Technician *</label>
                                <select
                                    required
                                    value={assignForm.technicianId}
                                    onChange={(e) => setAssignForm({ ...assignForm, technicianId: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                >
                                    <option value="">Select Technician...</option>
                                    {staffList.map(s => <option key={s._id} value={s._id}>{s.name} ({s.phone || 'Technician'})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Scheduled Visit Date</label>
                                <input
                                    type="date"
                                    value={assignForm.scheduledVisitDate}
                                    onChange={(e) => setAssignForm({ ...assignForm, scheduledVisitDate: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md">Confirm Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Repair */}
            {showRepairModal && selectedRequest && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Record Repair & Parts Consumed</h2>
                            <button onClick={() => setShowRepairModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleRepairSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Diagnosis Findings</label>
                                <textarea
                                    rows="2"
                                    placeholder="Cause of breakdown, worn bearings, voltage spike..."
                                    value={repairForm.diagnosisNotes}
                                    onChange={(e) => setRepairForm({ ...repairForm, diagnosisNotes: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Actions Taken</label>
                                <textarea
                                    rows="2"
                                    placeholder="Replaced worn rollers, realigned track, lubricated gears..."
                                    value={repairForm.repairActionsTaken}
                                    onChange={(e) => setRepairForm({ ...repairForm, repairActionsTaken: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            {/* Consumed Parts */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500">Replacement Parts Consumed</label>
                                <div className="flex gap-2">
                                    <select
                                        value={repairForm.selectedItemId}
                                        onChange={(e) => setRepairForm({ ...repairForm, selectedItemId: e.target.value })}
                                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="">Select Spare Part from Store...</option>
                                        {materials.map(m => <option key={m._id} value={m._id}>{m.name} (₹{m.unitPrice})</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Qty"
                                        value={repairForm.partQty}
                                        onChange={(e) => setRepairForm({ ...repairForm, partQty: e.target.value })}
                                        className="w-20 p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddPartToRepair}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                                    >
                                        Add
                                    </button>
                                </div>

                                {repairForm.partsConsumed.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        {repairForm.partsConsumed.map((p, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                                <span>{p.partName} x {p.quantity}</span>
                                                <span className="font-bold text-indigo-600">₹{p.totalCost}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Labour Charge (₹)</label>
                                    <input
                                        type="number"
                                        value={repairForm.labourCost}
                                        onChange={(e) => setRepairForm({ ...repairForm, labourCost: e.target.value })}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Chargeable to Customer (₹)</label>
                                    <input
                                        type="number"
                                        value={repairForm.customerChargeableAmount}
                                        onChange={(e) => setRepairForm({ ...repairForm, customerChargeableAmount: e.target.value })}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-rose-600"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowRepairModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md">Submit for Signoff</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Customer Signoff */}
            {showSignOffModal && selectedRequest && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Customer Signoff & Feedback</h2>
                            <button onClick={() => setShowSignOffModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSignOffSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Service Rating (1 to 5 Stars)</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setSignOffForm({ ...signOffForm, rating: star })}
                                            className={`p-2 rounded-xl border transition ${
                                                signOffForm.rating >= star 
                                                    ? 'bg-amber-50 border-amber-300 text-amber-500' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            <Star className="w-5 h-5 fill-current" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Customer Feedback Remarks</label>
                                <textarea
                                    rows="3"
                                    value={signOffForm.remarks}
                                    onChange={(e) => setSignOffForm({ ...signOffForm, remarks: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowSignOffModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md">Close Service Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWarrantyService;
