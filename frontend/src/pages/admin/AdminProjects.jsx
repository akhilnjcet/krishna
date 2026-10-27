import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
    Briefcase, Plus, X, Loader2, AlertCircle, MessageSquare, Send, AlertTriangle, 
    Clock, Calendar, Trash2, CheckCircle2, Wallet, CheckCircle, XCircle, History, 
    IndianRupee, Wrench, PlusCircle, Mail, Eye, EyeOff, Search, Filter, ArrowUpDown, 
    Ban, ShieldAlert, FileText, Check, ChevronDown, Info, ShieldCheck, RefreshCw 
} from 'lucide-react';
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
    const [isTransmitting, setIsTransmitting] = useState(false);
    const [transmitFeedback, setTransmitFeedback] = useState({ type: null, message: '' });
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

    // Search, Filter & Sort State (Requirements 3, 4, 5)
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt-desc');

    // Cancel Project & Permanent Audit State (Requirements 1, 2, 6, 7, 9)
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [projectToCancel, setProjectToCancel] = useState(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellingProject, setCancellingProject] = useState(false);
    const [cancelWarningAgreed, setCancelWarningAgreed] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [selectedAuditProject, setSelectedAuditProject] = useState(null);

    // Helper to calculate project payment metrics for cancellation modal (Requirement 6)
    const getProjectPaymentMetrics = (projectId) => {
        if (!projectId) return { count: 0, totalPaid: 0, transactions: [] };
        const matchingPayments = payments.filter(p => {
            const id = p.projectId?._id || p.projectId;
            return id && id.toString() === projectId.toString();
        });
        const totalPaid = matchingPayments
            .filter(p => p.status === 'Completed' || p.status === 'Verified')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
            count: matchingPayments.length,
            totalPaid,
            transactions: matchingPayments
        };
    };

    // Open Cancel Modal with duplicate cancellation prevention (Requirement 6)
    const handleOpenCancelModal = (project) => {
        const isCancelled = ['cancelled', 'CANCELLED', 'Cancelled'].includes(project.status);
        if (isCancelled) {
            alert('This project is already cancelled. Duplicate cancellation is prohibited.');
            return;
        }
        setProjectToCancel(project);
        setCancellationReason('');
        setCancelWarningAgreed(false);
        setShowCancelModal(true);
    };

    // Confirm Cancellation Request (Requirements 1, 6, 8, 9)
    const handleConfirmCancelProject = async (e) => {
        e.preventDefault();
        if (!cancellationReason.trim() || cancellationReason.trim().length < 3) {
            return alert('Please enter a valid cancellation reason (minimum 3 characters).');
        }

        const metrics = getProjectPaymentMetrics(projectToCancel._id);
        if (metrics.count > 0 && !cancelWarningAgreed) {
            return alert('Please check and acknowledge the Financial Records Preservation notice before proceeding.');
        }

        setCancellingProject(true);
        try {
            const res = await api.put(`/projects/${projectToCancel._id}/cancel`, {
                reason: cancellationReason.trim()
            });

            // Update in local state
            setProjects(prev => prev.map(p => p._id === projectToCancel._id ? res.data.project : p));
            if (selectedProject?._id === projectToCancel._id) {
                setSelectedProject(res.data.project);
            }

            setShowCancelModal(false);
            setProjectToCancel(null);
            setCancellationReason('');
            setCancelWarningAgreed(false);

            alert(`🚫 Project "${projectToCancel.title}" has been successfully CANCELLED.\n\nAll financial transactions, quotations, and staff assignments have been permanently preserved in the audit database.`);
        } catch (err) {
            console.error('Cancel Project error:', err);
            alert('Failed to cancel project: ' + (err.response?.data?.message || err.message));
        } finally {
            setCancellingProject(false);
        }
    };

    const handleOpenNotifyModal = (prj) => {
        setSelectedProject(prj);
        setNotificationText({ title: '', message: '' });
        setTransmitFeedback({ type: null, message: '' });
        setShowNotifyModal(true);
    };

    const handlePostUpdate = async (e) => {
        e.preventDefault();
        setTransmitFeedback({ type: null, message: '' });

        const targetId = selectedProject?._id || selectedProject?.id;
        if (!targetId) {
            setTransmitFeedback({
                type: 'error',
                message: 'Target project archive identifier is missing. Please select a valid project.'
            });
            return;
        }

        if (!notificationText.title.trim()) {
            setTransmitFeedback({
                type: 'error',
                message: 'Subject heading is required for transmission.'
            });
            return;
        }

        if (!notificationText.message.trim()) {
            setTransmitFeedback({
                type: 'error',
                message: 'Core intelligence message content is required.'
            });
            return;
        }

        setIsTransmitting(true);
        try {
            await api.post('/progress', { 
                projectId: targetId, 
                title: notificationText.title.trim(),
                description: notificationText.message.trim(),
                progressPercentage: selectedProject?.progress ?? 0,
                status: 'In Progress'
            });

            setTransmitFeedback({
                type: 'success',
                message: 'Intelligence pulse successfully broadcasted to client portal.'
            });

            // Update in local projects list
            setProjects(prev => prev.map(p => {
                if (p._id === targetId) {
                    return { ...p, updateNotes: notificationText.message.trim() };
                }
                return p;
            }));

            setTimeout(() => {
                setShowNotifyModal(false);
                setNotificationText({ title: '', message: '' });
                setTransmitFeedback({ type: null, message: '' });
            }, 1200);
        } catch (err) {
            console.error('Pulse transmit error:', err);
            const errMsg = err.response?.data?.message || err.message || 'Request failed';
            setTransmitFeedback({
                type: 'error',
                message: `Failed to transmit intelligence: ${errMsg}`
            });
        } finally {
            setIsTransmitting(false);
        }
    };
    const [formData, setFormData] = useState({
        title: '',
        customerId: '',
        serviceType: '',
        description: '',
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
    const [notifyClientByEmail, setNotifyClientByEmail] = useState(true);
    const [additionalClientMessage, setAdditionalClientMessage] = useState('');
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const [submittingTimeline, setSubmittingTimeline] = useState(false);

    const handleOpenTimelineModal = (project) => {
        setSelectedProject(project);
        const initialTimeline = project.timeline ? project.timeline.map(m => ({
            _id: m._id,
            title: m.title || '',
            description: m.description || '',
            date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
            status: m.status || 'Pending'
        })) : [];
        setTimelineDraft(initialTimeline);
        setNotifyClientByEmail(true);
        setAdditionalClientMessage('');
        setShowEmailPreview(false);
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

        setSubmittingTimeline(true);
        try {
            const res = await api.put(`/projects/${selectedProject._id}/send-timeline`, {
                timeline: timelineDraft,
                notifyClient: notifyClientByEmail,
                additionalMessage: additionalClientMessage
            });

            const emailInfo = res.data?.emailNotification;
            let successMessage = "Timeline published successfully to client portal!";

            if (notifyClientByEmail) {
                if (emailInfo?.sent) {
                    successMessage += `\n\n📧 Notification email successfully delivered to ${emailInfo.recipient}`;
                } else if (emailInfo?.skipped) {
                    successMessage += `\n\nℹ️ Email notification note: ${emailInfo.reason || 'Timeline unchanged; duplicate email prevented.'}`;
                } else if (emailInfo?.error) {
                    successMessage += `\n\n⚠️ Note: Timeline was saved, but email notification failed: ${emailInfo.error}`;
                }
            } else {
                successMessage += "\n(Email notification was disabled by admin)";
            }

            alert(successMessage);
            setShowTimelineModal(false);
            setSelectedProject(null);
            setAdditionalClientMessage('');
            setNotifyClientByEmail(true);
            setShowEmailPreview(false);
            fetchProjects();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to publish timeline.");
        } finally {
            setSubmittingTimeline(false);
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
            const res = await api.post('/projects', formData);
            fetchProjects();
            setShowModal(false);

            const emailInfo = res.data?.emailNotification;
            let successMsg = "Project commissioned and created successfully!";
            if (emailInfo?.sent) {
                successMsg += `\n\n📧 Official assignment email notification dispatched to client (${emailInfo.recipient}).`;
            } else if (emailInfo?.error) {
                successMsg += `\n\n⚠️ Project saved, but assignment email failed to dispatch: ${emailInfo.error}`;
            }

            alert(successMsg);
            setFormData({ title: '', customerId: '', serviceType: '', description: '', budget: '', deadline: '', assignedStaff: [] });
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

    // Status counts for filter pills (Requirement 5)
    const statusCounts = useMemo(() => {
        const counts = { all: projects.length, inProgress: 0, delayed: 0, completed: 0, cancelled: 0 };
        projects.forEach(p => {
            const st = (p.status || '').toLowerCase();
            if (['cancelled', 'cancelled'].includes(st)) counts.cancelled++;
            else if (st === 'in-progress' || st === 'in progress') counts.inProgress++;
            else if (st === 'delayed') counts.delayed++;
            else if (st === 'completed') counts.completed++;
        });
        return counts;
    }, [projects]);

    // Filtered and sorted projects (Requirements 3, 4, 5)
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            // Status Filter
            if (statusFilter !== 'all') {
                const pStatus = (p.status || '').toLowerCase();
                if (statusFilter === 'cancelled') {
                    if (!['cancelled', 'cancelled'].includes(pStatus)) return false;
                } else if (statusFilter === 'in-progress') {
                    if (!['in-progress', 'in progress'].includes(pStatus)) return false;
                } else if (statusFilter === 'delayed') {
                    if (pStatus !== 'delayed') return false;
                } else if (statusFilter === 'completed') {
                    if (pStatus !== 'completed') return false;
                } else {
                    if (pStatus !== statusFilter.toLowerCase()) return false;
                }
            }

            // Search Filter (Title, ID, Client name/email, Assigned Staff, Status, Service type, Cancellation Reason)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = (p.title || '').toLowerCase().includes(q);
                const idMatch = (p._id || '').toLowerCase().includes(q) || (p._id ? p._id.slice(-8).toLowerCase().includes(q) : false);
                const clientMatch = (p.customerId?.name || '').toLowerCase().includes(q) || (p.customerId?.email || '').toLowerCase().includes(q);
                const staffMatch = Array.isArray(p.assignedStaff) && p.assignedStaff.some(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
                const statusMatch = (p.status || '').toLowerCase().includes(q);
                const serviceMatch = (p.serviceType || '').toLowerCase().includes(q);
                const reasonMatch = (p.cancellationReason || '').toLowerCase().includes(q);

                if (!titleMatch && !idMatch && !clientMatch && !staffMatch && !statusMatch && !serviceMatch && !reasonMatch) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            // Sort options
            if (sortBy === 'createdAt-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (sortBy === 'createdAt-asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
            if (sortBy === 'budget-asc') return (a.budget || 0) - (b.budget || 0);
            if (sortBy === 'budget-desc') return (b.budget || 0) - (a.budget || 0);
            if (sortBy === 'deadline-asc') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            }
            if (sortBy === 'deadline-desc') {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(b.deadline) - new Date(a.deadline);
            }
            if (sortBy === 'status-asc') return (a.status || '').localeCompare(b.status || '');
            return 0;
        });
    }, [projects, searchQuery, statusFilter, sortBy]);

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
            <div className="space-y-6">
                {/* Search, Filter & Sort Hub (Requirements 3, 4, 5, 7) */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-md space-y-4">
                    {/* Row 1: Search Input & Sort Selector */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        {/* Search Bar (Requirement 3: title, project ID, client, staff, status) */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by title, project ID, client name, assigned staff, or status..."
                                className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                    title="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Sort Selector Dropdown (Requirement 4) */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap flex items-center gap-1">
                                <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
                            </span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="createdAt-desc">Creation Date (Newest first)</option>
                                <option value="createdAt-asc">Creation Date (Oldest first)</option>
                                <option value="title-asc">Project Title (A → Z)</option>
                                <option value="title-desc">Project Title (Z → A)</option>
                                <option value="budget-desc">Budget (High to Low)</option>
                                <option value="budget-asc">Budget (Low to High)</option>
                                <option value="deadline-asc">Deadline (Earliest first)</option>
                                <option value="deadline-desc">Deadline (Latest first)</option>
                                <option value="status-asc">Status (A → Z)</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Status Filter Tabs (Requirement 5) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5" /> Status:
                            </span>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                    statusFilter === 'all'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                All ({statusCounts.all})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('in-progress')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                    statusFilter === 'in-progress'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                In Progress ({statusCounts.inProgress})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('delayed')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                    statusFilter === 'delayed'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                Delayed ({statusCounts.delayed})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('completed')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                    statusFilter === 'completed'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                Completed ({statusCounts.completed})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('cancelled')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                                    statusFilter === 'cancelled'
                                        ? 'bg-rose-600 text-white shadow-md'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                                }`}
                            >
                                <Ban className="w-3 h-3" />
                                Cancelled ({statusCounts.cancelled})
                            </button>
                        </div>

                        {/* Result Counter & Reset Button */}
                        <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                            <span>Showing <strong className="text-slate-800 dark:text-white font-black">{filteredProjects.length}</strong> of {projects.length} projects</span>
                            {(searchQuery || statusFilter !== 'all') && (
                                <button
                                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                    className="text-indigo-600 hover:underline text-[11px] font-black uppercase ml-1"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Projects Registry Table & Mobile Cards */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
                    {/* Mobile Project Cards View (block lg:hidden) */}
                    <div className="block lg:hidden p-3 sm:p-4 space-y-3">
                        {loading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Project Data</p>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-700 dark:text-slate-200 font-bold text-sm">
                                    {projects.length === 0 ? "No projects found in registry." : "No matching projects found."}
                                </p>
                                {projects.length > 0 && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                        className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition inline-block"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredProjects.map((prj) => {
                                const isCancelled = ['cancelled', 'CANCELLED', 'Cancelled'].includes(prj.status);
                                const isCompleted = prj.status === 'completed' || prj.status === 'Completed';
                                const isInProgress = prj.status === 'in-progress' || prj.status === 'In Progress';
                                const isDelayed = prj.status === 'Delayed' || prj.status === 'delayed';

                                return (
                                    <div 
                                        key={`mobile-${prj._id}`}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            isCancelled
                                                ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60'
                                        }`}
                                    >
                                        {/* Header: Title + Status */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight truncate max-w-[220px]">
                                                        {prj.title}
                                                    </h4>
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                        {prj.serviceType}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                                                    #{prj._id.slice(-8).toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {isCancelled ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 whitespace-nowrap">
                                                        <Ban className="w-3 h-3" /> CANCELLED
                                                    </span>
                                                ) : isCompleted ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                                        COMPLETED
                                                    </span>
                                                ) : isInProgress ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
                                                        IN PROGRESS
                                                    </span>
                                                ) : isDelayed ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                        DELAYED
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                                        {prj.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Client & Staff Details */}
                                        <div className="text-xs space-y-1 mb-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            {prj.customerId && (
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Client:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                                        {prj.customerId.name || prj.customerId.email || 'N/A'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px]">Budget:</span>
                                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                                    ₹ {prj.budget?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-semibold uppercase text-[10px]">Deadline:</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                                    {prj.deadline ? new Date(prj.deadline).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                            {prj.assignedStaff && prj.assignedStaff.length > 0 && (
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Staff:</span>
                                                    <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px]">
                                                        {prj.assignedStaff.map(s => s.name).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cancellation reason if cancelled */}
                                        {isCancelled && prj.cancellationReason && (
                                            <div className="mb-3 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/50 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-1.5">
                                                <Ban className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                                                <span className="italic leading-snug">
                                                    <strong className="font-bold">Reason:</strong> {prj.cancellationReason}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <button 
                                                onClick={() => handleOpenNotifyModal(prj)}
                                                className="flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                title="Message Client"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" /> Message
                                            </button>
                                            <button 
                                                onClick={() => handleOpenTimelineModal(prj)}
                                                className="flex items-center justify-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                title="Timeline"
                                            >
                                                <Clock className="w-3.5 h-3.5" /> Timeline
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setSelectedProject(prj);
                                                    setEditAssignedStaff(prj.assignedStaff.map(s => s._id || s));
                                                    setShowStaffModal(true);
                                                }}
                                                className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                title="Staff"
                                            >
                                                <Briefcase className="w-3.5 h-3.5" /> Staff
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
                                                className="flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                title="Ledger"
                                            >
                                                <Wallet className="w-3.5 h-3.5" /> Ledger
                                            </button>
                                            <button
                                                onClick={() => handleOpenAdditionalWork(prj)}
                                                className="flex items-center justify-center gap-1 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition relative"
                                                title="Work Requests"
                                            >
                                                <Wrench className="w-3.5 h-3.5" /> Work
                                                {prj.additionalWork?.some(w => w.status === 'Pending') && (
                                                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                                )}
                                            </button>
                                            {isCancelled ? (
                                                <button
                                                    onClick={() => { setSelectedAuditProject(prj); setShowAuditModal(true); }}
                                                    className="flex items-center justify-center gap-1 bg-rose-100 text-rose-700 hover:bg-rose-700 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                    title="Audit History"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Audit
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenCancelModal(prj)}
                                                    className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-600 hover:text-white py-2 px-2 rounded-xl text-[11px] font-bold transition"
                                                    title="Cancel Project"
                                                >
                                                    <Ban className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop Table View (hidden lg:block) */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[850px]">
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
                            <tbody className="text-sm font-bold text-slate-900 dark:text-white divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center">
                                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Project Data</p>
                                        </td>
                                    </tr>
                                ) : filteredProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                            <p className="text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-sm mb-1">
                                                {projects.length === 0 ? "No projects found in registry." : "No matching projects found."}
                                            </p>
                                            <p className="text-slate-400 text-xs">
                                                {projects.length === 0 ? "Click Commission New Project to create one." : "Try adjusting your search query or filter options."}
                                            </p>
                                            {projects.length > 0 && (
                                                <button
                                                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                                    className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition inline-block"
                                                >
                                                    Clear All Filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : filteredProjects.map((prj, i) => {
                                    const isCancelled = ['cancelled', 'CANCELLED', 'Cancelled'].includes(prj.status);
                                    const isCompleted = prj.status === 'completed' || prj.status === 'Completed';
                                    const isInProgress = prj.status === 'in-progress' || prj.status === 'In Progress';
                                    const isDelayed = prj.status === 'Delayed' || prj.status === 'delayed';

                                    return (
                                        <motion.tr
                                            key={prj._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className={`transition-colors group ${
                                                isCancelled
                                                    ? 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40'
                                                    : 'hover:bg-indigo-50/30'
                                            }`}
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 dark:text-white text-base md:text-lg uppercase tracking-tight">
                                                        {prj.title}
                                                    </span>
                                                    {isCancelled && (
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px]">
                                                    <span className="uppercase tracking-widest text-indigo-500 font-black">
                                                        ID: #{prj._id.slice(-8).toUpperCase()}
                                                    </span>
                                                    {prj.customerId && (
                                                        <span className="text-slate-600 dark:text-slate-300 font-bold">
                                                            • Client: {prj.customerId.name || prj.customerId.email || 'N/A'}
                                                        </span>
                                                    )}
                                                    {prj.assignedStaff && prj.assignedStaff.length > 0 && (
                                                        <span className="text-slate-400 font-medium">
                                                            • Staff: {prj.assignedStaff.map(s => s.name).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Cancellation summary preview if cancelled (Requirement 2) */}
                                                {isCancelled && prj.cancellationReason && (
                                                    <div className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-start gap-1.5">
                                                        <Ban className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                                                        <span className="line-clamp-1 italic">
                                                            Reason: {prj.cancellationReason}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6 text-slate-600 dark:text-slate-400 uppercase text-xs font-black">
                                                {prj.serviceType}
                                            </td>
                                            <td className="p-6">
                                                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 font-black">
                                                    ₹ {prj.budget?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-6 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                                {prj.deadline ? new Date(prj.deadline).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-6">
                                                {isCancelled ? (
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1">
                                                            <Ban className="w-3 h-3 text-rose-600" /> CANCELLED
                                                        </span>
                                                        {prj.cancelledAt && (
                                                            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-medium">
                                                                {new Date(prj.cancelledAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : isCompleted ? (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-emerald-100 text-emerald-700 border-emerald-200">
                                                        Completed
                                                    </span>
                                                ) : isInProgress ? (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-indigo-100 text-indigo-700 border-indigo-200">
                                                        In Progress
                                                    </span>
                                                ) : isDelayed ? (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-amber-100 text-amber-700 border-amber-200">
                                                        Delayed
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                                        {prj.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end items-center gap-1.5 flex-wrap">
                                                    <button 
                                                        onClick={() => handleOpenNotifyModal(prj)}
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
                                                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition"
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

                                                    {/* Requirement 1 & 2: Cancel Project Action & Audit Button */}
                                                    {isCancelled ? (
                                                        <button
                                                            onClick={() => { setSelectedAuditProject(prj); setShowAuditModal(true); }}
                                                            className="bg-rose-100 text-rose-700 hover:bg-rose-700 hover:text-white p-2 rounded-xl transition"
                                                            title="View Cancellation Reason & Audit History"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenCancelModal(prj)}
                                                            className="bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition"
                                                            title="Cancel Project Agreement"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                        {/* Mobile / Small Screen Card View (md:hidden) */}
                        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {paymentsLoading ? (
                                <div className="p-10 text-center">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Payment Records...</p>
                                </div>
                            ) : payments.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-bold text-xs">No payment records found.</p>
                                </div>
                            ) : (
                                payments.map((p, i) => {
                                    const isCompleted = p.status === 'Completed' || p.status === 'verified';
                                    const isFailed = p.status === 'Failed' || p.status === 'rejected';
                                    const isPending = !isCompleted && !isFailed;
                                    const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : 'Payment Verification';

                                    return (
                                        <div key={p._id || i} className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900 transition-colors">
                                            {/* Header Row: Client Name & Amount */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                                        {p.customerId?.name || 'Unknown Client'}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {p.customerId?.email || 'No email registered'}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="flex items-center justify-end gap-1 text-base sm:text-lg font-black text-slate-900 dark:text-white font-poppins whitespace-nowrap">
                                                        <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                                                        <span>{p.amount?.toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-block mt-0.5 whitespace-nowrap">
                                                        {p.method || 'Online'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Box */}
                                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Details</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-right truncate">
                                                        {p.name || 'General Remittance'}
                                                    </span>
                                                </div>
                                                {p.notes && (
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 whitespace-nowrap">Notes</span>
                                                        <span className="text-slate-600 dark:text-slate-300 text-right text-[11px] break-words max-w-[200px]">
                                                            {p.notes}
                                                        </span>
                                                    </div>
                                                )}
                                                {p.referenceId && (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">UTR / Ref</span>
                                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] tracking-wide whitespace-nowrap">
                                                            {p.referenceId}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date & Time</span>
                                                    <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px] whitespace-nowrap">
                                                        {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(p.paymentDate || p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {isCompleted && p.verifiedByName && (
                                                    <div className="text-[10px] text-emerald-600 font-semibold pt-1 border-t border-emerald-100/60 dark:border-emerald-950/60">
                                                        Verified by {p.verifiedByName} {p.verifiedAt ? `on ${new Date(p.verifiedAt).toLocaleDateString('en-IN')}` : ''}
                                                    </div>
                                                )}
                                                {isFailed && p.rejectionReason && (
                                                    <div className="text-[10px] text-rose-500 font-semibold pt-1 border-t border-rose-100/60 dark:border-rose-950/60">
                                                        Reason: {p.rejectionReason}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Badge & Actions Row */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                                    isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                                    isFailed ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' :
                                                    'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                                }`}>
                                                    {isCompleted ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> :
                                                     isFailed ? <XCircle className="w-3 h-3 text-rose-500 shrink-0" /> :
                                                     <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                                                    <span>{statusLabel}</span>
                                                </span>

                                                {isPending && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm whitespace-nowrap"
                                                        >
                                                            {verifyingId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-black uppercase tracking-wider rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95 whitespace-nowrap"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {isCompleted && (
                                                    <span className="text-xs font-black text-emerald-600 uppercase tracking-wider whitespace-nowrap">
                                                        Approved ✓
                                                    </span>
                                                )}
                                                {isFailed && (
                                                    <span className="text-xs font-black text-rose-500 uppercase tracking-wider whitespace-nowrap">
                                                        Rejected ✗
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Desktop Table View (hidden md:block) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[760px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-6 whitespace-nowrap">Client Name</th>
                                        <th className="p-6 whitespace-nowrap">Payment / Details</th>
                                        <th className="p-6 whitespace-nowrap">Amount</th>
                                        <th className="p-6 whitespace-nowrap">Date</th>
                                        <th className="p-6 whitespace-nowrap">Method</th>
                                        <th className="p-6 text-center whitespace-nowrap">Status</th>
                                        <th className="p-6 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs">
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
                                                <div className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">{p.customerId?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-[160px]">{p.customerId?.email || ''}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase whitespace-nowrap">{p.name || 'General Payment'}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-xs truncate">{p.notes || '—'}</div>
                                                {p.referenceId && (
                                                    <div className="text-[9px] text-indigo-600 font-black mt-1 uppercase tracking-wider whitespace-nowrap">UTR: {p.referenceId}</div>
                                                )}
                                                {p.status === 'Completed' || p.status === 'verified' ? (
                                                    <div className="text-[9px] text-emerald-600 font-bold mt-1 uppercase whitespace-nowrap">Verified by {p.verifiedByName || 'Admin'} on {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : 'N/A'}</div>
                                                ) : p.status === 'Failed' || p.status === 'rejected' ? (
                                                    <div className="text-[9px] text-rose-500 font-bold mt-1 uppercase whitespace-nowrap">Rejected by {p.verifiedByName || 'Admin'} {p.verifiedAt ? `on ${new Date(p.verifiedAt).toLocaleDateString()}` : ''} {p.rejectionReason ? `| Reason: ${p.rejectionReason}` : ''}</div>
                                                ) : null}
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                                                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    {p.amount?.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(p.paymentDate || p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase rounded-lg whitespace-nowrap">{p.method}</span>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="flex justify-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap ${
                                                        p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {p.status === 'Completed' || p.status === 'verified' ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> :
                                                         p.status === 'Failed' || p.status === 'rejected' ? <XCircle className="w-3 h-3 text-rose-500 shrink-0" /> :
                                                         <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                                                        <span>{p.status === 'verified' || p.status === 'Completed' ? 'Completed' : (p.status === 'rejected' || p.status === 'Failed' ? 'Failed' : 'PAYMENT VERIFICATION')}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 whitespace-nowrap text-right">
                                                {(p.status === 'Waiting for Verification' || p.status === 'pending') && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                                                        >
                                                            {verifyingId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={verifyingId === p._id}
                                                            onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase rounded-xl hover:bg-rose-100 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {(p.status === 'Completed' || p.status === 'verified') && (
                                                    <div className="text-right text-[10px] text-emerald-600 font-black uppercase whitespace-nowrap">
                                                        Approved ✓
                                                    </div>
                                                )}
                                                {(p.status === 'Failed' || p.status === 'rejected') && (
                                                    <div className="text-right text-[10px] text-rose-500 font-black uppercase whitespace-nowrap">
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
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 relative border-t-[12px] border-indigo-600 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto my-auto"
                        >
                            <button onClick={() => setShowNotifyModal(false)} className="absolute right-4 top-4 sm:right-8 sm:top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer">
                                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
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

                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800">
                                <div className="text-[9px] font-black uppercase text-slate-400 mb-1">Target Project Archive</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedProject?.title || 'Unknown Project'}</div>
                            </div>

                            {/* In-app Feedback Banner */}
                            {transmitFeedback.message && (
                                <div className={`p-4 rounded-2xl mb-6 flex items-start gap-3 border animate-in fade-in duration-300 ${
                                    transmitFeedback.type === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                }`}>
                                    {transmitFeedback.type === 'success' ? (
                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                                    )}
                                    <div className="text-xs font-bold leading-relaxed">
                                        {transmitFeedback.message}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handlePostUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Subject Heading</label>
                                    <input required disabled={isTransmitting} value={notificationText.title} onChange={e => setNotificationText({...notificationText, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase text-xs disabled:opacity-50" placeholder="TECHNICAL ALERT / SAFETY MILESTONE" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Core Intelligence Message</label>
                                    <textarea required rows={4} disabled={isTransmitting} value={notificationText.message} onChange={e => setNotificationText({...notificationText, message: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs disabled:opacity-50" placeholder="Detail the structural update or sudden site information..." />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight italic">This update will be broadcasted live to the customer's secure dashboard matrix immediately.</p>
                                </div>
                                <button type="submit" disabled={isTransmitting} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isTransmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Transmitting Intelligence...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Initiate Intelligence Uplink</span>
                                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Commission Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 relative max-h-[92vh] sm:max-h-[85vh] overflow-y-auto my-auto"
                        >
                            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 sm:right-8 sm:top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                            </button>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 sm:mb-2">Commission Project</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mb-6 sm:mb-8">Initialize a new industrial contract in the registry.</p>

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
                                                <label key={staff._id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800 p-2 rounded-lg transition-colors">
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
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Project Scope / Description</label>
                                    <textarea 
                                        rows="3"
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" 
                                        placeholder="Detailed description of works, specifications, or deliverables to include in client assignment briefing..."
                                    />
                                </div>

                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                                        <span className="font-black uppercase tracking-wide text-[10px] text-indigo-700 dark:text-indigo-300 block mb-0.5">Automated Client Email Notification</span>
                                        Upon commissioning, an official assignment email will be sent automatically to the client's email address containing project ID, assigned staff, budget, deadline, and a direct client portal link.
                                    </div>
                                </div>

                                <div className="pt-2 pb-6 sm:pb-0">
                                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 sm:py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition cursor-pointer">Commence Operations</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Staff Assignment Modal */}
            <AnimatePresence>
                {showStaffModal && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 relative border-t-[12px] border-indigo-600 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto my-auto"
                        >
                            <button 
                                onClick={() => {
                                    setShowStaffModal(false);
                                    setSelectedProject(null);
                                }} 
                                className="absolute right-4 top-4 sm:right-8 sm:top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                            </button>

                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 sm:mb-2">Assign Staff</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mb-6 sm:mb-8 font-sans">Manage staff assigned to: <span className="font-black text-indigo-600 uppercase">{selectedProject.title}</span></p>

                            <form onSubmit={handleUpdateStaffAssignment} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Select Assigned Staff</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                        {staffList.map(staff => {
                                            const checked = editAssignedStaff.includes(staff._id);
                                            return (
                                                <label key={staff._id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:bg-slate-800 p-2 rounded-lg transition-colors">
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
                                <div className="pt-2 pb-6 sm:pb-0">
                                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 sm:py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition cursor-pointer">Update Assignments</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Timeline Management Modal */}
            <AnimatePresence>
                {showTimelineModal && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 relative border-t-[12px] border-indigo-600 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto my-auto"
                        >
                            <button 
                                onClick={() => {
                                    setShowTimelineModal(false);
                                    setSelectedProject(null);
                                }} 
                                className="absolute right-4 top-4 sm:right-8 sm:top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
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

                                {/* Email Notification Configuration */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                id="send-timeline-email-client"
                                                checked={notifyClientByEmail}
                                                onChange={e => setNotifyClientByEmail(e.target.checked)}
                                                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                                Send Email Notification to Client
                                            </span>
                                        </label>

                                        {notifyClientByEmail && (
                                            <button
                                                type="button"
                                                onClick={() => setShowEmailPreview(!showEmailPreview)}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer self-start sm:self-auto"
                                            >
                                                {showEmailPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                {showEmailPreview ? 'Hide Email Preview' : 'Preview Email'}
                                            </button>
                                        )}
                                    </div>

                                    {notifyClientByEmail && (
                                        <div className="space-y-3 pt-1">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                    Additional Message to Client (Optional)
                                                </label>
                                                <textarea
                                                    rows="2"
                                                    value={additionalClientMessage}
                                                    onChange={e => setAdditionalClientMessage(e.target.value)}
                                                    placeholder="Add an optional note to the client, e.g. 'Structural steel fabrication completed ahead of schedule'..."
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-indigo-500/25 resize-none"
                                                />
                                            </div>

                                            {showEmailPreview && (
                                                <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3.5 text-xs space-y-2 shadow-sm">
                                                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex flex-col gap-1 text-[11px]">
                                                        <div><span className="font-bold text-slate-400">Recipient:</span> <span className="text-slate-700 dark:text-slate-300 font-mono">{selectedProject?.client?.email || 'client@example.com'}</span></div>
                                                        <div><span className="font-bold text-slate-400">Subject:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">Project Timeline Updated – {selectedProject?.title}</span></div>
                                                    </div>

                                                    {additionalClientMessage && (
                                                        <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-2 text-amber-900 dark:text-amber-200 text-[11px] rounded">
                                                            <strong>Note from Engineering Team:</strong> {additionalClientMessage}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Milestone Schedule Preview:</div>
                                                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                                            {timelineDraft.map((m, idx) => (
                                                                <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-slate-50 dark:bg-slate-800 text-[10px]">
                                                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                                                        {m.title || 'Untitled Phase'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-slate-500 font-mono">{m.date || 'TBD'}</span>
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {m.status || 'Pending'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-500">Expected Completion:</span>
                                                        <span className="font-bold text-indigo-600">
                                                            {timelineDraft.map(m => m.date).filter(Boolean).sort().slice(-1)[0] || 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t flex gap-3">
                                    <button 
                                        type="button"
                                        disabled={submittingTimeline}
                                        onClick={() => {
                                            setShowTimelineModal(false);
                                            setSelectedProject(null);
                                        }}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition border-none cursor-pointer disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={timelineDraft.length === 0 || submittingTimeline}
                                        className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 border-none cursor-pointer"
                                    >
                                        {submittingTimeline ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Publishing & Notifying...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" /> Edit & Send to Client
                                            </>
                                        )}
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
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full border-none bg-transparent cursor-pointer"
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
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition border-none cursor-pointer"
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
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full border-none bg-transparent cursor-pointer"
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
                                    {/* Mobile Cards (sm:hidden) */}
                                    <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2.5 space-y-2.5 max-h-60 overflow-y-auto">
                                        {payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                No remittance history recorded for this project unit.
                                            </div>
                                        ) : (
                                            payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).map(p => {
                                                const isCompleted = p.status === 'Completed' || p.status === 'verified';
                                                const isFailed = p.status === 'Failed' || p.status === 'rejected';
                                                const isPending = !isCompleted && !isFailed;

                                                return (
                                                    <div key={p._id} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <h5 className="font-black text-slate-900 dark:text-white text-xs truncate">
                                                                    {p.name || 'General Remittance'}
                                                                </h5>
                                                                <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                                                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">
                                                                    ₹ {p.amount?.toLocaleString()}
                                                                </p>
                                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-block mt-0.5 whitespace-nowrap">
                                                                    {p.method}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {p.referenceId && (
                                                            <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap truncate">
                                                                UTR: {p.referenceId}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 ${
                                                                isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                isFailed ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                                {isCompleted ? 'Completed' : isFailed ? 'Failed' : 'PAYMENT VERIFICATION'}
                                                            </span>

                                                            {isPending && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        disabled={verifyingId === p._id}
                                                                        onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                                        className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                                                    >
                                                                        {verifyingId === p._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        disabled={verifyingId === p._id}
                                                                        onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                                        className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-250 text-[9px] font-black uppercase rounded-lg hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                                                    >
                                                                        <XCircle className="w-2.5 h-2.5" /> Reject
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {isCompleted && (
                                                                <span className="text-[9px] font-black uppercase text-emerald-600 whitespace-nowrap">
                                                                    Resolved ✓
                                                                </span>
                                                            )}
                                                            {isFailed && (
                                                                <span className="text-[9px] font-black uppercase text-rose-500 whitespace-nowrap">
                                                                    Rejected ✗
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Desktop Table (hidden sm:block) */}
                                    <div className="hidden sm:block overflow-x-auto max-h-48 overflow-y-auto">
                                        <table className="w-full text-left border-collapse min-w-[500px]">
                                            <thead>
                                                <tr className="bg-slate-100 dark:bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                    <th className="p-4 whitespace-nowrap">Payment Info</th>
                                                    <th className="p-4 whitespace-nowrap">Amount</th>
                                                    <th className="p-4 whitespace-nowrap">Method / UTR</th>
                                                    <th className="p-4 text-center whitespace-nowrap">Status</th>
                                                    <th className="p-4 text-right whitespace-nowrap">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                            No remittance history recorded for this project unit.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    payments.filter(p => p.projectId === selectedProject._id || p.projectId?._id === selectedProject._id).map(p => (
                                                        <tr key={p._id} className="hover:bg-slate-50 dark:bg-slate-800 transition-colors text-xs">
                                                            <td className="p-4 whitespace-nowrap">
                                                                <div className="font-black text-slate-800 dark:text-slate-200 uppercase">{p.name || 'General Remittance'}</div>
                                                                <div className="text-[8px] text-slate-400 mt-1">Paid on: {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</div>
                                                                {(p.status === 'Completed' || p.status === 'verified') && (
                                                                    <div className="text-[7px] text-emerald-600 font-bold mt-0.5 uppercase">Verified by {p.verifiedByName || 'Admin'}</div>
                                                                )}
                                                                {(p.status === 'Failed' || p.status === 'rejected') && p.rejectionReason && (
                                                                    <div className="text-[7px] text-rose-500 font-bold mt-0.5 uppercase max-w-[150px] truncate" title={p.rejectionReason}>Rejected Reason: {p.rejectionReason}</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                                                                ₹ {p.amount?.toLocaleString()}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap">
                                                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[8px] font-black uppercase rounded">{p.method}</span>
                                                                {p.referenceId && (
                                                                    <div className="text-[8px] text-indigo-650 font-bold mt-1 uppercase">UTR: {p.referenceId}</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-center whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider whitespace-nowrap ${
                                                                    p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                    p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                                }`}>
                                                                    {p.status === 'verified' || p.status === 'Completed' ? 'Completed' : (p.status === 'rejected' || p.status === 'Failed' ? 'Failed' : 'PAYMENT VERIFICATION')}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right whitespace-nowrap">
                                                                {(p.status === 'Waiting for Verification' || p.status === 'pending') ? (
                                                                    <div className="flex justify-end gap-1.5">
                                                                        <button
                                                                            disabled={verifyingId === p._id}
                                                                            onClick={() => handleVerifyPayment(p._id, 'Completed')}
                                                                            className="px-2.5 py-1.5 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                                                        >
                                                                            {verifyingId === p._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            disabled={verifyingId === p._id}
                                                                            onClick={() => setRejectModal({ show: true, paymentId: p._id, reason: '' })}
                                                                            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-250 text-[8px] font-black uppercase rounded-lg hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 whitespace-nowrap"
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
                                className="absolute right-8 top-8 p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full border-none bg-transparent cursor-pointer"
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
                                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase rounded-xl hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50 border-none cursor-pointer flex items-center gap-1"
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

            {/* ── Cancel Project Confirmation Modal (Requirements 1, 6, 7) ── */}
            <AnimatePresence>
                {showCancelModal && projectToCancel && (() => {
                    const metrics = getProjectPaymentMetrics(projectToCancel._id);
                    const hasPayments = metrics.count > 0;

                    return (
                        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-rose-200 dark:border-rose-900/50 p-6 md:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden space-y-6"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 border border-rose-200 dark:border-rose-800 flex-shrink-0">
                                            <Ban className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">Administrative Action</div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                Cancel Project Agreement
                                            </h3>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCancelModal(false); setProjectToCancel(null); }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Project Overview Card */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-mono text-[10px] font-black text-indigo-500 uppercase">
                                                ID: #{projectToCancel._id.slice(-8).toUpperCase()}
                                            </span>
                                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase mt-0.5">
                                                {projectToCancel.title}
                                            </h4>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            Status: {projectToCancel.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                                        <div>
                                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Client:</span>
                                            <span className="font-bold">{projectToCancel.customerId?.name || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Budget:</span>
                                            <span className="font-bold text-emerald-600 font-mono">₹ {(projectToCancel.budget || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Records Warning Banner (Requirement 6) */}
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 rounded-2xl space-y-2 text-amber-900 dark:text-amber-200">
                                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <span>Financial Records Preservation Policy</span>
                                    </div>
                                    <p className="text-[11px] font-medium leading-relaxed">
                                        {hasPayments ? (
                                            <>This project has <strong>{metrics.count} recorded financial transaction(s)</strong> totaling <strong>₹ {metrics.totalPaid.toLocaleString()}</strong>. In accordance with ERP financial regulations, all payments, invoice receipts, and quotations will be <strong>permanently preserved</strong> in the database. <strong>No automated refund will be processed or transactions deleted.</strong></>
                                        ) : (
                                            <>No financial transactions have been recorded for this project yet. All existing quotations, staff assignments, and audit logs will be permanently retained in the database.</>
                                        )}
                                    </p>
                                    {hasPayments && (
                                        <label className="flex items-start gap-2 pt-2 text-[11px] font-bold cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={cancelWarningAgreed}
                                                onChange={e => setCancelWarningAgreed(e.target.checked)}
                                                className="mt-0.5 rounded border-amber-400 text-rose-600 focus:ring-rose-500"
                                            />
                                            <span>I understand that financial records remain intact and no automatic refund is issued.</span>
                                        </label>
                                    )}
                                </div>

                                {/* Cancellation Form (Requirement 1) */}
                                <form onSubmit={handleConfirmCancelProject} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                                            <span>Reason for Cancellation *</span>
                                            <span className="text-slate-400 font-normal lowercase text-[10px]">mandatory (min. 3 characters)</span>
                                        </label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={cancellationReason}
                                            onChange={e => setCancellationReason(e.target.value)}
                                            placeholder="Specify why this project is being cancelled (e.g. Client requested contract termination due to site permit delay, contract re-negotiation, scope change)..."
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            disabled={cancellingProject}
                                            onClick={() => { setShowCancelModal(false); setProjectToCancel(null); }}
                                            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                        >
                                            Keep Project Active
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={cancellingProject || !cancellationReason.trim() || cancellationReason.trim().length < 3 || (hasPayments && !cancelWarningAgreed)}
                                            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-2 border-none cursor-pointer"
                                        >
                                            {cancellingProject ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Cancelling Project...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Ban className="w-4 h-4" />
                                                    <span>Confirm Cancellation</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* ── Project Audit & Cancellation History Modal (Requirement 2) ── */}
            <AnimatePresence>
                {showAuditModal && selectedAuditProject && (() => {
                    const metrics = getProjectPaymentMetrics(selectedAuditProject._id);

                    return (
                        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-6 md:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden space-y-6 max-h-[90vh] overflow-y-auto"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Permanent Audit Ledger</div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            <History className="w-5 h-5 text-indigo-600" /> Project History & Audit Record
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAuditModal(false); setSelectedAuditProject(null); }}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Project Overview */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex items-start justify-between flex-wrap gap-2">
                                        <div>
                                            <span className="font-mono text-xs font-black text-indigo-600 uppercase">
                                                ID: #{selectedAuditProject._id.slice(-8).toUpperCase()} ({selectedAuditProject._id})
                                            </span>
                                            <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase mt-0.5">
                                                {selectedAuditProject.title}
                                            </h4>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                                            <Ban className="w-3 h-3 text-rose-600" /> {selectedAuditProject.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Client</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAuditProject.customerId?.name || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Category</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAuditProject.serviceType}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Budget</span>
                                            <span className="font-mono font-bold text-emerald-600">₹ {(selectedAuditProject.budget || 0).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 block">Previous Status</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAuditProject.previousStatus || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {selectedAuditProject.assignedStaff && selectedAuditProject.assignedStaff.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assigned Staff</span>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAuditProject.assignedStaff.map((st, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold">
                                                        {st.name || st} {st.designation ? `(${st.designation})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cancellation Details Card */}
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1.5">
                                        <Ban className="w-3.5 h-3.5" /> Cancellation Record
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Cancelled By:</span>
                                                <span className="font-black text-slate-800 dark:text-white">
                                                    {selectedAuditProject.cancelledByName || selectedAuditProject.cancelledBy?.name || 'Administrator'}
                                                    {(selectedAuditProject.cancelledByEmail || selectedAuditProject.cancelledBy?.email) && (
                                                        <span className="text-slate-500 font-normal ml-1">
                                                            ({selectedAuditProject.cancelledByEmail || selectedAuditProject.cancelledBy?.email})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Timestamp:</span>
                                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {selectedAuditProject.cancelledAt ? new Date(selectedAuditProject.cancelledAt).toLocaleString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                                                    }) : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60">
                                            <span className="text-[10px] font-black uppercase text-rose-600 block mb-1">Reason for Cancellation:</span>
                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/40 font-semibold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                                                "{selectedAuditProject.cancellationReason || 'No reason specified'}"
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preserved Financial Data Summary */}
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Preserved Financial Ledger
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600">
                                            {metrics.count} Transactions ({metrics.totalPaid > 0 ? `₹${metrics.totalPaid.toLocaleString()} paid` : '₹0'})
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                        All transaction receipts, ledger updates, advance payments, and customer invoicing remain intact in the system.
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAuditModal(false); setSelectedAuditProject(null); }}
                                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition"
                                    >
                                        Close Audit Record
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default AdminProjects;
