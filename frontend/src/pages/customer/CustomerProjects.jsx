import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, Calendar, DollarSign, User, Mail, Phone, Clock, 
    CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronRight,
    MapPin, Users, IndianRupee, Wallet, CheckCircle, XCircle, Plus, X, Wrench, Send
} from 'lucide-react';
import { getSocket } from '../../utils/socket';
import { getDirectImageUrl } from '../../utils/imageUtils';

const CustomerProjects = () => {
    const [projects, setProjects] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        method: 'upi',
        referenceId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        name: '',
        notes: ''
    });
    const [showAdditionalWorkForm, setShowAdditionalWorkForm] = useState(false);
    const [additionalWorkForm, setAdditionalWorkForm] = useState({ title: '', description: '' });
    const [submittingWork, setSubmittingWork] = useState(false);

    useEffect(() => {
        fetchProjects();
        fetchPayments();

        const socket = getSocket();
        socket.connect();

        socket.on('project-updated', (data) => {
            setProjects(prev => prev.map(proj => {
                if (proj._id === data.projectId) {
                    return {
                        ...proj,
                        paymentStatus: data.paymentStatus,
                        paidCash: data.paidCash,
                        paidOnline: data.paidOnline,
                        discount: data.discount,
                        advancePaid: data.advancePaid,
                        budget: data.budget,
                        totalCost: data.totalCost,
                        approvedAdditionalWorkTotal: data.approvedAdditionalWorkTotal
                    };
                }
                return proj;
            }));

            setSelectedProject(prev => {
                if (prev && prev._id === data.projectId) {
                    return {
                        ...prev,
                        paymentStatus: data.paymentStatus,
                        paidCash: data.paidCash,
                        paidOnline: data.paidOnline,
                        discount: data.discount,
                        advancePaid: data.advancePaid,
                        budget: data.budget,
                        totalCost: data.totalCost,
                        approvedAdditionalWorkTotal: data.approvedAdditionalWorkTotal
                    };
                }
                return prev;
            });
        });

        socket.on('payment-status-changed', () => {
            fetchPayments();
            fetchProjects();
        });

        return () => {
            socket.off('project-updated');
            socket.off('payment-status-changed');
            socket.disconnect();
        };
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customer/projects');
            const data = res.data || [];
            setProjects(data);
            if (data.length > 0) {
                setSelectedProject(data[0]);
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await api.get('/payments/my-payments');
            setAllPayments(res.data || []);
        } catch (err) {
            console.error("Error fetching payments:", err);
        }
    };

    const handleProjectPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return alert("Please enter a valid amount.");
        if (!paymentForm.referenceId) return alert("Please enter Transaction ID/UTR Number.");
        if (!paymentForm.paymentDate) return alert("Please select a Payment Date.");
        
        try {
            await api.post('/payments/submit', {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount),
                projectId: selectedProject._id,
                name: paymentForm.name || `Payment for ${selectedProject.title}`
            });
            alert("Payment Acknowledgement Submitted successfully! Awaiting Admin Verification.");
            setShowPaymentModal(false);
            setPaymentForm({
                amount: '',
                method: 'upi',
                referenceId: '',
                paymentDate: new Date().toISOString().split('T')[0],
                name: '',
                notes: ''
            });
            fetchPayments();
            fetchProjects();
        } catch (err) {
            alert("Failed to submit payment: " + (err.response?.data?.message || err.message));
        }
    };

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': 
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'in-progress':
            case 'in progress':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delayed':
                return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
            case 'stopped':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Syncing Portfolio Assets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] border-b-8 border-indigo-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white dark:bg-slate-900/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Secure Link Uplink</div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white font-poppins">
                        My Commissioned Projects
                    </h1>
                    <p className="text-slate-400 text-xs mt-2 max-w-2xl font-medium">
                        Real-time industrial contract status, assigned logistics engineers, contact details, and milestone timelines.
                    </p>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Projects list selection */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                            <Briefcase className="w-4 h-4 text-indigo-500" /> ACTIVE AGREEMENTS
                        </h2>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {projects.map((project) => (
                                <button
                                    key={project._id}
                                    onClick={() => setSelectedProject(project)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                        selectedProject?._id === project._id
                                            ? 'border-indigo-600 bg-indigo-50/30'
                                            : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800/80/70'
                                    }`}
                                >
                                    <div className="min-w-0 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                                            selectedProject?._id === project._id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {project.title.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate uppercase">{project.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{project.serviceType}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedProject?._id === project._id ? 'text-indigo-600 translate-x-1' : 'text-slate-300'}`} />
                                </button>
                            ))}
                            
                            {projects.length === 0 && (
                                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No project records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Project Details Panel */}
                <div className="lg:col-span-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedProject ? (
                            <motion.div
                                key={selectedProject._id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8"
                            >
                                {/* Hero Project Card */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusStyle(selectedProject.status)}`}>
                                                    {selectedProject.status || 'Active'}
                                                </span>
                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                    ID: {selectedProject._id.slice(-8).toUpperCase()}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-poppins">
                                                {selectedProject.title}
                                            </h2>
                                        </div>

                                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-2 font-mono">
                                            <DollarSign className="w-5 h-5 text-emerald-600" />
                                            <div className="text-right">
                                                <div className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Contract Budget</div>
                                                <div className="text-base font-black">₹ {selectedProject.budget?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600 border border-slate-100 dark:border-slate-800">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Deadline</div>
                                                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                                                    {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600 border border-slate-100 dark:border-slate-800">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Site Location</div>
                                                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                                    {selectedProject.location || 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-indigo-600 border border-slate-100 dark:border-slate-800">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Current Completion</div>
                                                <div className="text-xs font-black text-indigo-600">
                                                    {selectedProject.progress}% Solid
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800/80 w-full rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                                            <div 
                                                className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-1000" 
                                                style={{ width: `${selectedProject.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Project Financial Ledger */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-800 flex-wrap gap-4">
                                        <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-indigo-500" /> Project Financial Ledger
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                selectedProject.paymentStatus === 'fully-paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                selectedProject.paymentStatus === 'partially-paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                'bg-rose-50 text-rose-600 border border-rose-200'
                                            }`}>
                                                {selectedProject.paymentStatus === 'fully-paid' ? 'Fully Paid ✓' :
                                                 selectedProject.paymentStatus === 'partially-paid' ? 'Partially Paid' : 'Unpaid'}
                                            </span>
                                            <button 
                                                onClick={() => {
                                                    setPaymentForm({
                                                        amount: '',
                                                        method: 'upi',
                                                        referenceId: '',
                                                        paymentDate: new Date().toISOString().split('T')[0],
                                                        name: 'Project Payment',
                                                        notes: `Remittance for project: ${selectedProject.title}`
                                                    });
                                                    setShowPaymentModal(true);
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-1.5 border-none cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Report Payment
                                            </button>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown Grid */}
                                    {(() => {
                                        const budget = selectedProject.budget || 0;
                                        const approvedAdditional = selectedProject.approvedAdditionalWorkTotal ||
                                            (selectedProject.additionalWork || []).filter(w => w.status === 'Approved').reduce((s, w) => s + (w.amount || 0), 0);
                                        const totalCost = selectedProject.totalCost || (budget + approvedAdditional);
                                        const totalPaid = (selectedProject.paidCash || 0) + (selectedProject.paidOnline || 0) + (selectedProject.advancePaid || 0);
                                        const discount = selectedProject.discount || 0;
                                        const duesRemaining = Math.max(0, totalCost - discount - totalPaid);
                                        return (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Budget</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">₹ {budget.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100">
                                            <p className="text-[8px] font-black text-violet-500 uppercase tracking-widest mb-1">Additional Work</p>
                                            <p className="text-sm font-black text-violet-700">₹ {approvedAdditional.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Contract</p>
                                            <p className="text-sm font-black text-emerald-700">₹ {totalCost.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount Allowed</p>
                                            <p className="text-sm font-black text-emerald-600">₹ {discount.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Advance Deposited</p>
                                            <p className="text-sm font-black text-indigo-650">₹ {(selectedProject.advancePaid || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="col-span-1 md:col-span-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining Dues</p>
                                            <p className={`text-sm font-black ${ duesRemaining <= 0 ? 'text-emerald-600' : 'text-rose-600' }`}>
                                                ₹ {duesRemaining.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                        );
                                    })()}

                                    {/* Received Payments Breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Received Cash</p>
                                                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">₹ {(selectedProject.paidCash || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Received Online</p>
                                                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">₹ {(selectedProject.paidOnline || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-indigo-500 rounded-full" />
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Receipts Tallied</p>
                                                <p className="text-xs font-black text-indigo-650">
                                                    ₹ {((selectedProject.paidCash || 0) + (selectedProject.paidOnline || 0) + (selectedProject.advancePaid || 0)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remittance History Sublist */}
                                    <div className="border-t pt-6 border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4">Project Remittance History</h4>
                                        <div className="overflow-x-auto max-h-40 overflow-y-auto pr-1">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="p-3">Reference/UTR</th>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Method</th>
                                                        <th className="p-3">Amount</th>
                                                        <th className="p-3 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {allPayments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="p-6 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                                                No payments reported for this project unit.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        allPayments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).map(p => (
                                                            <tr key={p._id} className="text-xs hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                                                                <td className="p-3 font-bold">
                                                                    <div>{p.referenceId || 'N/A'}</div>
                                                                    <div className="text-[7px] text-slate-400 mt-0.5">{p.name}</div>
                                                                </td>
                                                                <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">
                                                                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 rounded text-[8px] font-black uppercase">{p.method}</span>
                                                                </td>
                                                                <td className="p-3 font-black text-slate-800 dark:text-slate-200">
                                                                    ₹ {p.amount?.toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider ${
                                                                        p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                        p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                                    }`}>
                                                                        {p.status === 'verified' ? 'Completed' : (p.status === 'rejected' ? 'Failed' : p.status)}
                                                                    </span>
                                                                    {p.rejectionReason && (p.status === 'Failed' || p.status === 'rejected') && (
                                                                        <div className="text-[7px] text-rose-500 font-bold mt-0.5 max-w-[120px] truncate" title={p.rejectionReason}>
                                                                            Reason: {p.rejectionReason}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Logistics Team */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                                        <Users className="w-5 h-5 text-indigo-500" /> Assigned Engineering Team
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedProject.assignedStaff && selectedProject.assignedStaff.length > 0 ? (
                                            selectedProject.assignedStaff.map((staff) => (
                                                <div key={staff._id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 hover:bg-slate-100 dark:bg-slate-800/80/50 transition-colors flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-200 flex-shrink-0">
                                                        {staff.profilePhoto ? (
                                                            <img src={getDirectImageUrl(staff.profilePhoto)} alt={staff.name} className="w-full h-full object-cover rounded-2xl" />
                                                        ) : (
                                                            staff.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 space-y-2">
                                                        <div>
                                                            <h4 className="font-black text-slate-900 dark:text-white text-sm truncate uppercase">{staff.name}</h4>
                                                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{staff.designation || 'Field Engineer'}</p>
                                                        </div>
                                                        <div className="space-y-1 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                                            <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors truncate">
                                                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span className="truncate">{staff.email}</span>
                                                            </a>
                                                            {(staff.phone || staff.phoneNumber) && (
                                                                <a href={`tel:${staff.phone || staff.phoneNumber}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                                                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    <span>{staff.phone || staff.phoneNumber}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center py-6 bg-slate-50 dark:bg-slate-800 border border-dashed rounded-3xl text-slate-400 font-bold uppercase text-xs">
                                                No engineering personnel allocated to this project unit.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Additional Work Requests Section */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
                                        <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2">
                                            <Wrench className="w-5 h-5 text-violet-500" /> Scope Expansion / Additional Work
                                        </h3>
                                        <button
                                            onClick={() => setShowAdditionalWorkForm(prev => !prev)}
                                            className="bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-1.5 border-none cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Request Additional Work
                                        </button>
                                    </div>

                                    {/* Request Form */}
                                    {showAdditionalWorkForm && (
                                        <form
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                if (!additionalWorkForm.title) return alert('Title is required.');
                                                setSubmittingWork(true);
                                                try {
                                                    const res = await api.post(`/projects/${selectedProject._id}/additional-work`, {
                                                        title: additionalWorkForm.title,
                                                        description: additionalWorkForm.description
                                                    });
                                                    setSelectedProject(res.data);
                                                    setProjects(prev => prev.map(p => p._id === res.data._id ? res.data : p));
                                                    setAdditionalWorkForm({ title: '', description: '' });
                                                    setShowAdditionalWorkForm(false);
                                                    alert('Your request has been submitted and is awaiting admin review.');
                                                } catch (err) {
                                                    alert('Failed to submit: ' + (err.response?.data?.message || err.message));
                                                } finally {
                                                    setSubmittingWork(false);
                                                }
                                            }}
                                            className="bg-violet-50 border border-violet-100 rounded-2xl p-6 space-y-4"
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">Submit Additional Work Request</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Work Title *</label>
                                                    <input
                                                        required
                                                        value={additionalWorkForm.title}
                                                        onChange={e => setAdditionalWorkForm({ ...additionalWorkForm, title: e.target.value })}
                                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-violet-500/20"
                                                        placeholder="e.g. Extra Painting Work"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                                    <input
                                                        value={additionalWorkForm.description}
                                                        onChange={e => setAdditionalWorkForm({ ...additionalWorkForm, description: e.target.value })}
                                                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-violet-500/20"
                                                        placeholder="Brief details of what is needed..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button type="button" onClick={() => setShowAdditionalWorkForm(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase rounded-xl border-none cursor-pointer transition">Cancel</button>
                                                <button type="submit" disabled={submittingWork} className="flex-[2] py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 border-none cursor-pointer transition disabled:opacity-50">
                                                    {submittingWork ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                    Submit Request
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Additional Work Items Log */}
                                    {(selectedProject.additionalWork || []).length === 0 ? (
                                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-800 border-2 border-dashed rounded-2xl text-slate-400">
                                            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No additional work requests for this project.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="p-3">Work Item</th>
                                                        <th className="p-3">Requested On</th>
                                                        <th className="p-3">Approved Amount</th>
                                                        <th className="p-3 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {(selectedProject.additionalWork || []).map(w => (
                                                        <tr key={w._id} className="text-xs hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                                                            <td className="p-3">
                                                                <p className="font-black text-slate-800 dark:text-slate-200 uppercase">{w.title}</p>
                                                                {w.description && <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{w.description}</p>}
                                                            </td>
                                                            <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">
                                                                {new Date(w.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td className="p-3 font-black text-slate-800 dark:text-slate-200">
                                                                {w.status === 'Approved' ? `₹ ${(w.amount || 0).toLocaleString()}` : '—'}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider ${
                                                                    w.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                    w.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                                }`}>
                                                                    {w.status === 'Pending' ? '⏳ Awaiting Review' : w.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Project Timeline */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                                        <Clock className="w-5 h-5 text-indigo-500" /> Milestone Delivery Timeline
                                    </h3>

                                    {selectedProject.timelineStatus === 'Sent to Client' && selectedProject.timeline && selectedProject.timeline.length > 0 ? (
                                        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 ml-3 py-2">
                                            {selectedProject.timeline.map((milestone, idx) => {
                                                const isCompleted = milestone.status === 'Completed';
                                                return (
                                                    <div key={milestone._id || idx} className="relative space-y-2">
                                                        {/* Step Indicator Pin */}
                                                        <span className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 ${
                                                            isCompleted 
                                                                ? 'bg-emerald-500 border-white text-white shadow-md shadow-emerald-500/20' 
                                                                : 'bg-white dark:bg-slate-900 border-indigo-600 text-indigo-600'
                                                        }`}>
                                                            {isCompleted ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                                            )}
                                                        </span>

                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <h4 className={`text-base font-black uppercase tracking-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                {milestone.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-150 px-2.5 py-1 rounded-lg">
                                                                    {new Date(milestone.date).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
                                                                </span>
                                                                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                                                                    isCompleted 
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                                }`}>
                                                                    {milestone.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {milestone.description && (
                                                            <p className={`text-xs font-semibold leading-relaxed max-w-2xl ${isCompleted ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {milestone.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 border border-dashed rounded-3xl text-slate-400">
                                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
                                            <h4 className="font-extrabold uppercase text-xs text-slate-500 dark:text-slate-400 mb-1">Timeline Compilation in Progress</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto">
                                                A custom blueprint timeline is being generated by our engineers. You will be notified as soon as it is reviewed and published.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-55 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] text-slate-400">
                                <Briefcase className="w-16 h-16 opacity-30 mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest italic">Select a project agreement to relay intelligence.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Report Project Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-indigo-600"
                        >
                            <button 
                                onClick={() => setShowPaymentModal(false)} 
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full border-none bg-transparent cursor-pointer"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Report Project Payment</h2>
                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-8">Remittance submission for: {selectedProject?.title}</p>

                            <form onSubmit={handleProjectPaymentSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Payment Name *</label>
                                        <input 
                                            required 
                                            value={paymentForm.name} 
                                            onChange={e => setPaymentForm({...paymentForm, name: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                            placeholder="e.g., Progress Installment 1" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Payment Amount (INR) *</label>
                                        <input 
                                            required 
                                            type="number"
                                            value={paymentForm.amount} 
                                            onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Payment Method *</label>
                                        <select 
                                            required
                                            value={paymentForm.method} 
                                            onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                        >
                                            <option value="upi">UPI Portal</option>
                                            <option value="bank_transfer">Bank Node / UTR</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Transaction ID / UTR *</label>
                                        <input 
                                            required 
                                            value={paymentForm.referenceId} 
                                            onChange={e => setPaymentForm({...paymentForm, referenceId: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                            placeholder="Enter UPI Ref / UTR number" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Payment Date *</label>
                                        <input 
                                            required 
                                            type="date"
                                            value={paymentForm.paymentDate} 
                                            onChange={e => setPaymentForm({...paymentForm, paymentDate: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Notes / Details</label>
                                        <input 
                                            value={paymentForm.notes} 
                                            onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" 
                                            placeholder="Any details to share with verifier" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition border-none cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest border-none cursor-pointer"
                                    >
                                        Submit Payment
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

export default CustomerProjects;
