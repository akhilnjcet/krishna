import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Briefcase, Plus, X, Loader2, AlertCircle, MessageSquare, Send, AlertTriangle, Clock, Calendar, Trash2, CheckCircle2, Wallet, CheckCircle, XCircle, History, IndianRupee, Wrench, PlusCircle } from 'lucide-react';
import { getSocket } from '../../utils/socket';

// Inline sub-component: approve a pending additional-work item with a cost estimate
const ApproveWithAmountButton = ({ workItem, onApprove, isLoading }) => {
    const [approveAmount, setApproveAmount] = React.useState(workItem.amount || '');
    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                value={approveAmount}
                onChange={e => setApproveAmount(e.target.value)}
                className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg font-bold text-[9px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="₹ Amount"
            />
            <button
                disabled={isLoading}
                onClick={() => onApprove(approveAmount)}
                className="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1"
            >
                {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
                Approve
            </button>
        </div>
    );
};

const AdminProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [notificationText, setNotificationText] = useState({ title: '', message: '' });
    const [activeTab, setActiveTab] = useState('payments');
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);
    const [rejectModal, setRejectModal] = useState({ show: false, paymentId: null, reason: '' });
    const [showRemittanceModal, setShowRemittanceModal] = useState(false);
    const [remittanceLedger, setRemittanceLedger] = useState({ discount: '', advancePaid: '' });
    const [manualPaymentForm, setManualPaymentForm] = useState({ amount: '', method: 'cash', referenceId: '', notes: '' });
    const [recordingPayment, setRecordingPayment] = useState(false);
    const [updatingLedger, setUpdatingLedger] = useState(false);

    // Additional Work Modal
    const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);
    const [additionalWorkProject, setAdditionalWorkProject] = useState(null);
    const [newAdditionalWork, setNewAdditionalWork] = useState({ title: '', description: '', amount: '' });
    const [addingAdditionalWork, setAddingAdditionalWork] = useState(false);
    const [updatingWorkId, setUpdatingWorkId] = useState(null);

    const handlePostUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/progress', { 
                projectId: selectedProject._id, 
                title: notificationText.title,
                description: notificationText.message,
                progressPercentage: selectedProject.progress, // Maintain current progress
                status: 'In Progress'
            });
            setShowNotifyModal(false);
            setNotificationText({ title: '', message: '' });
            alert("Technical alert successfully broadcasted to client portal.");
        } catch (err) {
            alert("Failed to transmit intelligence: " + (err.response?.data?.message || err.message));
        }
    };
    const [formData, setFormData] = useState({
        title: '',
        customerId: '',
        serviceType: '',
        budget: '',
        deadline: '',
        assignedStaff: []
    });
    const [customers, setCustomers] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editAssignedStaff, setEditAssignedStaff] = useState([]);

    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [timelineDraft, setTimelineDraft] = useState([]);

    const handleOpenTimelineModal = (project) => {
        setSelectedProject(project);
        const initialTimeline = project.timeline ? project.timeline.map(m => ({
            title: m.title || '',
            description: m.description || '',
            date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
            status: m.status || 'Pending'
        })) : [];
        setTimelineDraft(initialTimeline);
        setShowTimelineModal(true);
    };

    const handleAddMilestone = () => {
        setTimelineDraft([...timelineDraft, { title: '', description: '', date: '', status: 'Pending' }]);
    };

    const handleRemoveMilestone = (idx) => {
        setTimelineDraft(timelineDraft.filter((_, i) => i !== idx));
    };

    const handleMilestoneChange = (idx, field, value) => {
        const updated = [...timelineDraft];
        updated[idx][field] = value;
        setTimelineDraft(updated);
    };

    const handleSubmitTimeline = async (e) => {
        e.preventDefault();
        if (timelineDraft.length === 0) return alert("Please add at least one milestone to the timeline.");
        
        const isValid = timelineDraft.every(m => m.title.trim() !== '' && m.date !== '');
        if (!isValid) return alert("All milestones must have a title and a date.");

        try {
            await api.put(`/projects/${selectedProject._id}/send-timeline`, {
                timeline: timelineDraft
            });
            alert("Timeline published successfully to client portal!");
            setShowTimelineModal(false);
            setSelectedProject(null);
            fetchProjects();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to publish timeline.");
        }
    };


    useEffect(() => {
        fetchProjects();
        fetchCustomers();
        fetchStaff();
        fetchPayments();

        const socket = getSocket();
        socket.connect();
        socket.emit('join-room', 'admin');

        socket.on('payment-status-changed', (updatedPayment) => {
            setPayments(prev => {
                const exists = prev.some(p => p._id === updatedPayment._id);
                if (exists) {
                    return prev.map(p => p._id === updatedPayment._id ? updatedPayment : p);
                } else {
                    return [updatedPayment, ...prev];
                }
            });
            fetchProjects();
        });

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

        return () => {
            socket.off('payment-status-changed');
            socket.off('project-updated');
            socket.disconnect();
        };
    }, []);

    const fetchPayments = async () => {
        setPaymentsLoading(true);
        try {
            const res = await api.get('/payments');
            setPayments(res.data);
        } catch (err) {
            console.error('Fetch Payments Error:', err);
        } finally {
            setPaymentsLoading(false);
        }
    };

    const handleVerifyPayment = async (id, status) => {
        setVerifyingId(id);
        try {
            await api.put(`/payments/${id}/verify`, { status });
            fetchPayments();
        } catch (err) {
            alert('Failed to update payment: ' + (err.response?.data?.message || err.message));
        } finally {
            setVerifyingId(null);
        }
    };

    const handleRejectPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!rejectModal.reason) return alert("Please specify a rejection reason.");
        
        setVerifyingId(rejectModal.paymentId);
        try {
            await api.put(`/payments/${rejectModal.paymentId}/verify`, { 
                status: 'Failed', 
                rejectionReason: rejectModal.reason 
            });
            setRejectModal({ show: false, paymentId: null, reason: '' });
            fetchPayments();
        } catch (err) {
            alert('Failed to reject payment: ' + (err.response?.data?.message || err.message));
        } finally {
            setVerifyingId(null);
        }
    };

    const handleUpdateLedger = async (e) => {
        e.preventDefault();
        setUpdatingLedger(true);
        try {
            const res = await api.put(`/projects/${selectedProject._id}`, {
                discount: parseFloat(remittanceLedger.discount) || 0,
                advancePaid: parseFloat(remittanceLedger.advancePaid) || 0
            });
            setSelectedProject(res.data);
            fetchProjects();
            alert("Project Financial Ledger updated successfully!");
        } catch (err) {
            alert("Failed to update project ledger: " + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingLedger(false);
        }
    };

    const handleRecordManualPayment = async (e) => {
        e.preventDefault();
        if (!manualPaymentForm.amount || parseFloat(manualPaymentForm.amount) <= 0) {
            return alert("Please enter a valid amount.");
        }
        setRecordingPayment(true);
        try {
            await api.post('/payments/manual', {
                customerId: selectedProject.customerId?._id || selectedProject.customerId,
                amount: parseFloat(manualPaymentForm.amount),
                method: manualPaymentForm.method,
                referenceId: manualPaymentForm.referenceId || undefined,
                notes: manualPaymentForm.notes || `Manual payment recorded by Admin`,
                projectId: selectedProject._id
            });
            
            // Clear manual payment form
            setManualPaymentForm({ amount: '', method: 'cash', referenceId: '', notes: '' });
            
            // Refresh payments list
            fetchPayments();
            
            // Fetch updated project data to refresh ledger numbers
            const res = await api.get('/projects');
            setProjects(res.data);
            const freshProj = res.data.find(p => p._id === selectedProject._id);
            if (freshProj) {
                setSelectedProject(freshProj);
            }
            
            alert("Manual payment recorded and ledger tallied successfully!");
        } catch (err) {
            alert("Failed to record payment: " + (err.response?.data?.message || err.message));
        } finally {
            setRecordingPayment(false);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/auth/users?role=customer');
            setCustomers(res.data);
        } catch (err) {
            console.error('Fetch Customers Error:', err);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaffList(res.data);
        } catch (err) {
            console.error('Fetch Staff Error:', err);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            fetchProjects();
            setShowModal(false);
            setFormData({ title: '', customerId: '', serviceType: '', budget: '', deadline: '', assignedStaff: [] });
            alert("Project created successfully!");
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create project.";
            const tip = err.response?.data?.tip || "";
            alert(`${msg}\n${tip}`);
        }
    };

    const handleUpdateStaffAssignment = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${selectedProject._id}`, {
                assignedStaff: editAssignedStaff
            });
            fetchProjects();
            setShowStaffModal(false);
            setSelectedProject(null);
            alert("Staff assignments updated successfully!");
        } catch (err) {
            alert("Failed to update staff assignments: " + (err.response?.data?.message || err.message));
        }
    };

    // ── Additional Work Handlers ──────────────────────────────────────────
    const handleOpenAdditionalWork = (prj) => {
        setAdditionalWorkProject(prj);
        setNewAdditionalWork({ title: '', description: '', amount: '' });
        setShowAdditionalWorkModal(true);
    };

    const handleAdminAddWork = async (e) => {
        e.preventDefault();
        if (!newAdditionalWork.title) return alert('Title is required.');
        setAddingAdditionalWork(true);
        try {
            const res = await api.post(`/projects/${additionalWorkProject._id}/additional-work`, {
                title: newAdditionalWork.title,
                description: newAdditionalWork.description,
                amount: parseFloat(newAdditionalWork.amount) || 0,
                status: 'Approved'
            });
            setAdditionalWorkProject(res.data);
            setProjects(prev => prev.map(p => p._id === res.data._id ? res.data : p));
            setNewAdditionalWork({ title: '', description: '', amount: '' });
        } catch (err) {
            alert('Failed to add work item: ' + (err.response?.data?.message || err.message));
        } finally {
            setAddingAdditionalWork(false);
        }
    };

    const handleWorkAction = async (workId, status, amount) => {
        setUpdatingWorkId(workId);
        try {
            const body = { status };
            if (amount !== undefined) body.amount = parseFloat(amount) || 0;
            const res = await api.put(`/projects/${additionalWorkProject._id}/additional-work/${workId}`, body);
            setAdditionalWorkProject(res.data);
            setProjects(prev => prev.map(p => p._id === res.data._id ? res.data : p));
        } catch (err) {
            alert('Failed to update work item: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingWorkId(null);
        }
    };

    const handleDeleteWork = async (workId) => {
        if (!window.confirm('Delete this additional work entry?')) return;
        setUpdatingWorkId(workId);
        try {
            const res = await api.delete(`/projects/${additionalWorkProject._id}/additional-work/${workId}`);
            setAdditionalWorkProject(res.data);
            setProjects(prev => prev.map(p => p._id === res.data._id ? res.data : p));
        } catch (err) {
            alert('Failed to delete work item: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingWorkId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50 dark:bg-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Director View</div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Projects & Payments</h2>
                </div>
                {activeTab === 'projects' && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Commission New Project
                    </button>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md w-fit">
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                        activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800'
                    }`}
                >
                    <Briefcase className="w-4 h-4" /> Projects Registry
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                        activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800'
                    }`}
                >
                    <Wallet className="w-4 h-4" /> Payment History
                    {payments.filter(p => p.status === 'pending').length > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">
                            {payments.filter(p => p.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'projects' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="p-6">Project Title / Client</th>
                                <th className="p-6">Category</th>
                                <th className="p-6">Budget</th>
                                <th className="p-6">Deadline</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-900 dark:text-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Project Data</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">No projects found in registry.</p>
                                    </td>
                                </tr>
                            ) : projects.map((prj, i) => (
                                <motion.tr
                                    key={prj._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-indigo-50/30 transition-colors group"
                                >
                                    <td className="p-6">
                                        <div className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">{prj.title}</div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-[10px] uppercase tracking-widest text-indigo-500 font-black">ID: {prj._id.slice(-8).toUpperCase()}</span>
                                            {prj.assignedStaff && prj.assignedStaff.length > 0 && (
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    • Assigned: {prj.assignedStaff.map(s => s.name).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6 text-slate-600 dark:text-slate-400 uppercase text-xs font-black">
                                       {prj.serviceType}
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 font-black">
                                            ₹ {prj.budget?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-6 text-slate-500 dark:text-slate-400 font-mono">
                                        {prj.deadline ? new Date(prj.deadline).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                            prj.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            prj.status === 'in-progress' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                            'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {prj.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => { setSelectedProject(prj); setShowNotifyModal(true); }}
                                            className="bg-indigo-50 text-indigo-600 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition"
                                            title="Transmit sudden info to customer"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleOpenTimelineModal(prj)}
                                            className="bg-indigo-50 text-indigo-650 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition"
                                            title="Manage & Publish Project Timeline"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setSelectedProject(prj);
                                                setEditAssignedStaff(prj.assignedStaff.map(s => s._id || s));
                                                setShowStaffModal(true);
                                            }}
                                            className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition"
                                            title="Manage Assigned Staff"
                                        >
                                            <Briefcase className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setSelectedProject(prj);
                                                setRemittanceLedger({
                                                    discount: prj.discount || '',
                                                    advancePaid: prj.advancePaid || ''
                                                });
                                                setManualPaymentForm({
                                                    amount: '',
                                                    method: 'cash',
                                                    referenceId: '',
                                                    notes: ''
                                                });
                                                setShowRemittanceModal(true);
                                            }}
                                            className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-650 hover:text-white transition"
                                            title="Project Financial Remittance & Ledger"
                                        >
                                            <Wallet className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenAdditionalWork(prj)}
                                            className="bg-violet-50 text-violet-600 p-2 rounded-xl hover:bg-violet-600 hover:text-white transition relative"
                                            title="Manage Additional Work Requests"
                                        >
                                            <Wrench className="w-4 h-4" />
                                            {prj.additionalWork?.some(w => w.status === 'Pending') && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                                            )}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* ── Payment History Tab ── */}
            {activeTab === 'payments' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Client Financials</div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" /> Transaction History
                            </h3>
                        </div>
                        <span className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-black rounded-full">
                            {payments.length} Total Records
                        </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-6">Client Name</th>
                                        <th className="p-6">Payment / Details</th>
                                        <th className="p-6">Amount</th>
                                        <th className="p-6">Date</th>
                                        <th className="p-6">Method</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paymentsLoading ? (
                                        <tr>
                                            <td colSpan="7" className="p-20 text-center">
                                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Payment Records...</p>
                                            </td>
                                        </tr>
                                    ) : payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-20 text-center">
                                                <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">No payment records found.</p>
                                            </td>
                                        </tr>
                                    ) : payments.map((p, i) => (
                                        <motion.tr
                                            key={p._id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="hover:bg-indigo-50/30 transition-colors group"
                                        >
                                            <td className="p-6">
                                                <div className="font-black text-slate-900 dark:text-white text-sm">{p.customerId?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-0.5">{p.customerId?.email || ''}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase">{p.name || 'General Payment'}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-xs truncate">{p.notes || '—'}</div>
                                                {p.referenceId && (
                                                    <div className="text-[9px] text-indigo-600 font-black mt-1 uppercase tracking-wider">UTR: {p.referenceId}</div>
                                                )}
                                                {p.status === 'Completed' || p.status === 'verified' ? (
                                                    <div className="text-[9px] text-emerald-600 font-bold mt-1 uppercase">Verified by {p.verifiedByName || 'Admin'} on {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : 'N/A'}</div>
                                                ) : p.status === 'Failed' || p.status === 'rejected' ? (
                                                    <div className="text-[9px] text-rose-500 font-bold mt-1 uppercase">Rejected by {p.verifiedByName || 'Admin'} {p.verifiedAt ? `on ${new Date(p.verifiedAt).toLocaleDateString()}` : ''} {p.rejectionReason ? `| Reason: ${p.rejectionReason}` : ''}</div>
                                                ) : null}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                                                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                                                    {p.amount?.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(p.paymentDate || p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-lg">{p.method}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex justify-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                        p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {p.status === 'Completed' || p.status === 'verified' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> :
                                                         p.status === 'Failed' || p.status === 'rejected' ? <XCircle className="w-3 h-3 text-rose-500" /> :
                                                         <Clock className="w-3 h-3 text-amber-500" />}
                                                        {p.status === 'verified' ? 'Completed' : (p.status === 'rejected' ? 'Failed' : p.status)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {(p.status === 'Waiting for Verification' || p.status === 'pending') && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                                                        >
                                                            {verifyingId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase rounded-xl hover:bg-rose-100 transition disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {(p.status === 'Completed' || p.status === 'verified') && (
                                                    <div className="text-right text-[10px] text-emerald-600 font-black uppercase">
                                                        Approved ✓
                                                    </div>
                                                )}
                                                {(p.status === 'Failed' || p.status === 'rejected') && (
                                                    <div className="text-right text-[10px] text-rose-500 font-black uppercase">
                                                        Rejected ✗
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Broadcast Terminal Modal */}
            <AnimatePresence>
                {showNotifyModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-indigo-600"
                        >
                            <button onClick={() => setShowNotifyModal(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-indigo-100 p-3 rounded-2xl">
                                    <Send className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sudden Pulse Transmit</h2>
                                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Uplink to Client Portal</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-8 border border-slate-100 dark:border-slate-800">
                                <div className="text-[9px] font-black uppercase text-slate-400 mb-1">Target Project Archive</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedProject?.title}</div>
                            </div>

                            <form onSubmit={handlePostUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Subject Heading</label>
                                    <input required value={notificationText.title} onChange={e => setNotificationText({...notificationText, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase text-xs" placeholder="TECHNICAL ALERT / SAFETY MILESTONE" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Core Intelligence Message</label>
                                    <textarea required rows={4} value={notificationText.message} onChange={e => setNotificationText({...notificationText, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" placeholder="Detail the structural update or sudden site information..." />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight italic">This update will be broadcasted live to the customer's secure dashboard matrix immediately.</p>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-4 group">
                                    Initiate Intelligence Uplink <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Commission Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative"
                        >
                            <button onClick={() => setShowModal(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Commission Project</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Initialize a new industrial contract in the registry.</p>

                            <form onSubmit={handleCreateProject} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Project Title</label>
                                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Select Customer*</label>
                                        <select 
                                            required 
                                            value={formData.customerId} 
                                            onChange={e => setFormData({...formData, customerId: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                                        >
                                            <option value="">Select a Client</option>
                                            {customers.map(c => (
                                                <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Service Type</label>
                                        <input required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="e.g. Fabrication" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Budget (₹)</label>
                                        <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Deadline</label>
                                        <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Assign Staff Members</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                        {staffList.map(staff => {
                                            const checked = formData.assignedStaff.includes(staff._id);
                                            return (
                                                <label key={staff._id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            const newAssigned = checked 
                                                                ? formData.assignedStaff.filter(id => id !== staff._id)
                                                                : [...formData.assignedStaff, staff._id];
                                                            setFormData({...formData, assignedStaff: newAssigned});
                                                        }}
                                                        className="w-4 h-4 rounded accent-indigo-600"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{staff.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{staff.designation}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition">Commence Operations</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Staff Assignment Modal */}
            <AnimatePresence>
                {showStaffModal && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-indigo-600"
                        >
                            <button 
                                onClick={() => {
                                    setShowStaffModal(false);
                                    setSelectedProject(null);
                                }} 
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Assign Staff</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 font-sans">Manage staff assigned to: <span className="font-black text-indigo-600 uppercase">{selectedProject.title}</span></p>

                            <form onSubmit={handleUpdateStaffAssignment} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Select Assigned Staff</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                        {staffList.map(staff => {
                                            const checked = editAssignedStaff.includes(staff._id);
                                            return (
                                                <label key={staff._id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            const newAssigned = checked 
                                                                ? editAssignedStaff.filter(id => id !== staff._id)
                                                                : [...editAssignedStaff, staff._id];
                                                            setEditAssignedStaff(newAssigned);
                                                        }}
                                                        className="w-4 h-4 rounded accent-indigo-600"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{staff.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{staff.designation}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition">Update Assignments</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Timeline Management Modal */}
            <AnimatePresence>
                {showTimelineModal && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-indigo-600"
                        >
                            <button 
                                onClick={() => {
                                    setShowTimelineModal(false);
                                    setSelectedProject(null);
                                }} 
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-indigo-100 p-3 rounded-2xl">
                                    <Clock className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Timeline Management</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium font-sans">Manage milestone delivery for: <span className="font-black text-indigo-600 uppercase">{selectedProject.title}</span></p>
                                </div>
                            </div>

                            {selectedProject.timelineStatus === 'Proposed by Staff' && (
                                <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-650 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider">Timeline Proposed by Staff</p>
                                        <p className="text-xs opacity-90 mt-0.5">Assigned staff proposed a timeline. Review, edit, and send it to the client below.</p>
                                    </div>
                                </div>
                            )}

                            {selectedProject.timelineStatus === 'Sent to Client' && (
                                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider">Timeline Published to Client</p>
                                        <p className="text-xs opacity-90 mt-0.5">This timeline is currently active and visible on the customer's portal.</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmitTimeline} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Project Milestones</label>
                                        <button 
                                            type="button" 
                                            onClick={handleAddMilestone}
                                            className="bg-indigo-605 text-white px-3 py-1.5 font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-indigo-700 border-none bg-indigo-600 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Milestone
                                        </button>
                                    </div>

                                    {timelineDraft.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed text-slate-400 font-bold uppercase text-xs">
                                            No milestones drafted. Add at least one milestone.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                            {timelineDraft.map((milestone, idx) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 relative">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveMilestone(idx)}
                                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-650 transition border-none bg-transparent cursor-pointer"
                                                        title="Remove Milestone"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Title *</label>
                                                            <input 
                                                                required
                                                                type="text"
                                                                placeholder="e.g. Excavation Completion"
                                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/25"
                                                                value={milestone.title}
                                                                onChange={e => handleMilestoneChange(idx, 'title', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Date *</label>
                                                            <input 
                                                                required
                                                                type="date"
                                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/25"
                                                                value={milestone.date}
                                                                onChange={e => handleMilestoneChange(idx, 'date', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="Details of the phase..."
                                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-indigo-500/25"
                                                                value={milestone.description}
                                                                onChange={e => handleMilestoneChange(idx, 'description', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                                                            <select
                                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/25"
                                                                value={milestone.status}
                                                                onChange={e => handleMilestoneChange(idx, 'status', e.target.value)}
                                                            >
                                                                <option value="Pending">Pending</option>
                                                                <option value="Completed">Completed</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setShowTimelineModal(false);
                                            setSelectedProject(null);
                                        }}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition border-none cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={timelineDraft.length === 0}
                                        className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 border-none cursor-pointer"
                                    >
                                        <Send className="w-4 h-4" /> Edit & Send to Client
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reject Payment Modal */}
            <AnimatePresence>
                {rejectModal.show && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-rose-600"
                        >
                            <button 
                                onClick={() => setRejectModal({ show: false, paymentId: null, reason: '' })} 
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full border-none bg-transparent cursor-pointer"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-rose-100 p-3 rounded-2xl">
                                    <XCircle className="w-8 h-8 text-rose-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Reject Payment</h2>
                                    <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.2em]">Transaction Audit Action</p>
                                </div>
                            </div>

                            <form onSubmit={handleRejectPaymentSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Rejection Reason *</label>
                                    <textarea 
                                        required 
                                        rows={4} 
                                        value={rejectModal.reason} 
                                        onChange={e => setRejectModal({...rejectModal, reason: e.target.value})} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-rose-500/20 outline-none text-xs" 
                                        placeholder="Please provide the specific reason for rejecting this transaction (e.g. Invalid UTR, Amount mismatch)..." 
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    <p className="text-[9px] font-black text-rose-700 uppercase tracking-tight italic">
                                        Rejecting this transaction will mark it as failed and notify the customer instantly.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setRejectModal({ show: false, paymentId: null, reason: '' })}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition border-none cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={verifyingId !== null}
                                        className="flex-[2] bg-rose-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-700 transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 border-none cursor-pointer"
                                    >
                                        {verifyingId === rejectModal.paymentId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                        Reject Payment
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Project Remittance Modal */}
            <AnimatePresence>
                {showRemittanceModal && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2rem] shadow-2xl p-6 relative border-t-[8px] border-emerald-600 my-4 max-h-[92vh] overflow-y-auto"
                        >
                            <button 
                                onClick={() => {
                                    setShowRemittanceModal(false);
                                    setSelectedProject(null);
                                }} 
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full border-none bg-transparent cursor-pointer"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-emerald-100 p-2 rounded-xl">
                                    <Wallet className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Project Remittance Manager</h2>
                                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">{selectedProject.title}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
                                {/* Left Side: Ledger Settings */}
                                <div className="lg:col-span-6 space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Project Ledger Settings</h3>
                                        
                                        <form onSubmit={handleUpdateLedger} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Discount Allowed</label>
                                                    <input 
                                                        type="number"
                                                        value={remittanceLedger.discount}
                                                        onChange={e => setRemittanceLedger({...remittanceLedger, discount: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Advance Paid</label>
                                                    <input 
                                                        type="number"
                                                        value={remittanceLedger.advancePaid}
                                                        onChange={e => setRemittanceLedger({...remittanceLedger, advancePaid: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                type="submit" 
                                                disabled={updatingLedger}
                                                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 border-none cursor-pointer"
                                            >
                                                {updatingLedger ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                Update Project Ledger
                                            </button>
                                        </form>
                                    </div>

                                    {/* Ledger Metrics - 3 col compact */}
                                    {(() => {
                                        const budget = selectedProject.budget || 0;
                                        const approvedAdditional = selectedProject.approvedAdditionalWorkTotal ||
                                            (selectedProject.additionalWork || []).filter(w => w.status === 'Approved').reduce((s, w) => s + (w.amount || 0), 0);
                                        const totalCost = selectedProject.totalCost || (budget + approvedAdditional);
                                        const totalPaid = (selectedProject.paidCash || 0) + (selectedProject.paidOnline || 0) + (selectedProject.advancePaid || 0);
                                        const discount = selectedProject.discount || 0;
                                        const duesRemaining = Math.max(0, totalCost - discount - totalPaid);
                                        return (
                                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 grid grid-cols-3 gap-3">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Base Budget</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">₹ {budget.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-violet-500 uppercase tracking-widest">Additional Work</p>
                                            <p className="text-sm font-black text-violet-700">₹ {approvedAdditional.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Total Contract</p>
                                            <p className="text-sm font-black text-emerald-700">₹ {totalCost.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ledger Discount</p>
                                            <p className="text-sm font-black text-emerald-700">₹ {discount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Receipts</p>
                                            <p className="text-sm font-black text-indigo-600">
                                                ₹ {totalPaid.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dues Remaining</p>
                                            <p className={`text-sm font-black ${ duesRemaining <= 0 ? 'text-emerald-600' : 'text-rose-600' }`}>
                                                ₹ {duesRemaining.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="col-span-3 flex items-center justify-between border-t border-emerald-100/70 pt-2 mt-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remittance Status</span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                selectedProject.paymentStatus === 'fully-paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                selectedProject.paymentStatus === 'partially-paid' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                'bg-rose-50 text-rose-600 border border-rose-100'
                                            }`}>
                                                {selectedProject.paymentStatus === 'fully-paid' ? 'Fully Paid ✓' :
                                                 selectedProject.paymentStatus === 'partially-paid' ? 'Partially Paid' : 'Unpaid'}
                                            </span>
                                        </div>
                                    </div>
                                        );
                                    })()}
                                </div>

                                {/* Right Side: Record Manual Payment */}
                                <div className="lg:col-span-6 space-y-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Record Manual / Cash Payment</h3>
                                        
                                        <form onSubmit={handleRecordManualPayment} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Payment Amount (INR) *</label>
                                                    <input 
                                                        required
                                                        type="number"
                                                        value={manualPaymentForm.amount}
                                                        onChange={e => setManualPaymentForm({...manualPaymentForm, amount: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Payment Method *</label>
                                                    <select 
                                                        value={manualPaymentForm.method}
                                                        onChange={e => setManualPaymentForm({...manualPaymentForm, method: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                    >
                                                        <option value="cash">Cash Override</option>
                                                        <option value="upi">UPI Portal</option>
                                                        <option value="bank_transfer">Bank Transfer / UTR</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Reference ID / UTR</label>
                                                    <input 
                                                        type="text"
                                                        value={manualPaymentForm.referenceId}
                                                        onChange={e => setManualPaymentForm({...manualPaymentForm, referenceId: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="e.g. CASH, UTR9988..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Payment Notes</label>
                                                    <input 
                                                        type="text"
                                                        value={manualPaymentForm.notes}
                                                        onChange={e => setManualPaymentForm({...manualPaymentForm, notes: e.target.value})}
                                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        placeholder="Cash received on site..."
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                type="submit" 
                                                disabled={recordingPayment}
                                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 border-none cursor-pointer animate-none"
                                            >
                                                {recordingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                Record Payment Received
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Project-Specific Transactions History Table */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Project Transactions Audit History</h3>
                                
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-800/80 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="p-4">Payment Info</th>
                                                    <th className="p-4">Amount</th>
                                                    <th className="p-4">Method / UTR</th>
                                                    <th className="p-4 text-center">Status</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                            No remittance history recorded for this project unit.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).map(p => (
                                                        <tr key={p._id} className="hover:bg-slate-50 dark:bg-slate-800 transition-colors text-xs">
                                                            <td className="p-4">
                                                                <div className="font-black text-slate-800 dark:text-slate-200 uppercase">{p.name || 'General Remittance'}</div>
                                                                <div className="text-[8px] text-slate-400 mt-1">Paid on: {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</div>
                                                                {(p.status === 'Completed' || p.status === 'verified') && (
                                                                    <div className="text-[7px] text-emerald-600 font-bold mt-0.5 uppercase">Verified by {p.verifiedByName || 'Admin'}</div>
                                                                )}
                                                                {(p.status === 'Failed' || p.status === 'rejected') && p.rejectionReason && (
                                                                    <div className="text-[7px] text-rose-500 font-bold mt-0.5 uppercase">Rejected Reason: {p.rejectionReason}</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 font-black text-slate-900 dark:text-white">
                                                                ₹ {p.amount?.toLocaleString()}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 dark:text-slate-300 text-[8px] font-black uppercase rounded">{p.method}</span>
                                                                {p.referenceId && (
                                                                    <div className="text-[8px] text-indigo-650 font-bold mt-1 uppercase">UTR: {p.referenceId}</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider ${
                                                                    p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                    p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                                }`}>
                                                                    {p.status === 'verified' ? 'Completed' : (p.status === 'rejected' ? 'Failed' : p.status)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                {(p.status === 'Waiting for Verification' || p.status === 'pending') ? (
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button
                                                                            disabled={verifyingId === p._id}
                                                                            onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                                            className="px-2.5 py-1.5 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            {verifyingId === p._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            disabled={verifyingId === p._id}
                                                                            onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                                            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-250 text-[8px] font-black uppercase rounded-lg hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            <XCircle className="w-2.5 h-2.5" /> Reject
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[8px] font-black uppercase text-slate-400">Resolved</span>
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Additional Work Scope Modal ───────────────────────────────── */}
            <AnimatePresence>
                {showAdditionalWorkModal && additionalWorkProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-violet-600 my-8"
                        >
                            <button
                                onClick={() => { setShowAdditionalWorkModal(false); setAdditionalWorkProject(null); }}
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full border-none bg-transparent cursor-pointer"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-violet-100 p-3 rounded-2xl">
                                    <Wrench className="w-8 h-8 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Additional Work Scope</h2>
                                    <p className="text-[10px] font-black uppercase text-violet-500 tracking-[0.2em]">{additionalWorkProject.title}</p>
                                </div>
                            </div>

                            {/* Budget Summary */}
                            {(() => {
                                const approvedTotal = (additionalWorkProject.additionalWork || [])
                                    .filter(w => w.status === 'Approved')
                                    .reduce((s, w) => s + (w.amount || 0), 0);
                                const totalCost = (additionalWorkProject.budget || 0) + approvedTotal;
                                return (
                                    <div className="grid grid-cols-3 gap-4 mb-8 bg-violet-50/50 p-5 rounded-2xl border border-violet-100">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Budget</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-slate-200">₹ {(additionalWorkProject.budget || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Additional</p>
                                            <p className="text-lg font-black text-violet-600">₹ {approvedTotal.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Contract Value</p>
                                            <p className="text-lg font-black text-emerald-600">₹ {totalCost.toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left: Existing Work Items */}
                                <div className="lg:col-span-7 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b pb-2">
                                        Scope Items ({(additionalWorkProject.additionalWork || []).length})
                                    </h3>

                                    {(additionalWorkProject.additionalWork || []).length === 0 ? (
                                        <div className="py-12 text-center bg-slate-50 dark:bg-slate-800 border-2 border-dashed rounded-2xl text-slate-400">
                                            <PlusCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No additional work items yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                            {(additionalWorkProject.additionalWork || []).map((w) => {
                                                const isPending = w.status === 'Pending';
                                                const isApproved = w.status === 'Approved';
                                                const isRejected = w.status === 'Rejected';
                                                return (
                                                    <div
                                                        key={w._id}
                                                        className={`p-4 rounded-2xl border ${
                                                            isPending ? 'bg-amber-50 border-amber-200' :
                                                            isApproved ? 'bg-emerald-50 border-emerald-200' :
                                                            'bg-rose-50 border-rose-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{w.title}</p>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                                        isPending ? 'bg-amber-200 text-amber-800' :
                                                                        isApproved ? 'bg-emerald-200 text-emerald-800' :
                                                                        'bg-rose-200 text-rose-700'
                                                                    }`}>{w.status}</span>
                                                                </div>
                                                                {w.description && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{w.description}</p>
                                                                )}
                                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1">
                                                                    ₹ {(w.amount || 0).toLocaleString()}
                                                                    {isApproved && <span className="text-emerald-600 ml-1">✓ Approved</span>}
                                                                </p>
                                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                                    {new Date(w.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                                                                {isPending && (
                                                                    <>
                                                                        <ApproveWithAmountButton
                                                                            workItem={w}
                                                                            onApprove={(amount) => handleWorkAction(w._id, 'Approved', amount)}
                                                                            isLoading={updatingWorkId === w._id}
                                                                        />
                                                                        <button
                                                                            disabled={updatingWorkId === w._id}
                                                                            onClick={() => handleWorkAction(w._id, 'Rejected')}
                                                                            className="px-3 py-1.5 bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-xl hover:bg-rose-200 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            {updatingWorkId === w._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <XCircle className="w-2.5 h-2.5" />}
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    disabled={updatingWorkId === w._id}
                                                                    onClick={() => handleDeleteWork(w._id)}
                                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase rounded-xl hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1"
                                                                >
                                                                    {updatingWorkId === w._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Add New Item */}
                                <div className="lg:col-span-5">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2">Log New Approved Work</h3>
                                        <form onSubmit={handleAdminAddWork} className="space-y-4">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Work Title *</label>
                                                <input
                                                    required
                                                    value={newAdditionalWork.title}
                                                    onChange={e => setNewAdditionalWork({ ...newAdditionalWork, title: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-violet-500/20"
                                                    placeholder="e.g. Extra Flooring Work"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                                <textarea
                                                    rows={2}
                                                    value={newAdditionalWork.description}
                                                    onChange={e => setNewAdditionalWork({ ...newAdditionalWork, description: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                                                    placeholder="Brief description of the scope..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Approved Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={newAdditionalWork.amount}
                                                    onChange={e => setNewAdditionalWork({ ...newAdditionalWork, amount: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-violet-500/20"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={addingAdditionalWork}
                                                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                                            >
                                                {addingAdditionalWork ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                                                Add Approved Entry
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminProjects;
