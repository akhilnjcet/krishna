import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Award, CheckCircle2, AlertCircle, FileDown, ShieldCheck, 
    Clock, Star, CheckSquare, Square, X, Loader2, Sparkles, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { generateProjectCompletionCertificatePDF } from '../../services/pdfService';

const CHECKLIST_ITEMS = [
    { key: 'fabricationCompleted', label: 'Fabrication & Structural Assembly', desc: 'Fabricated per approved engineering drawings and tolerance benchmarks' },
    { key: 'installationCompleted', label: 'Site Erection & Installation', desc: 'Completed on-site structural erection and bolt-down anchoring' },
    { key: 'qualityInspectionPassed', label: 'Quality & Weld Inspection Passed', desc: 'NDE / visual weld examination and dimensional tolerances verified' },
    { key: 'defectsResolved', label: 'Punchlist & Defects Resolved', desc: 'Zero outstanding defects, reworks, or alignment non-conformances' },
    { key: 'siteCleared', label: 'Site Clearance & Demobilization', desc: 'All scrap offcuts, tools, and heavy machinery cleared from premises' },
    { key: 'deliveryCompleted', label: 'Material & Final Delivery Verified', desc: 'All contract bill of quantities physically handed over' },
    { key: 'customerInspectionCompleted', label: 'Customer Joint Inspection', desc: 'Walkthrough completed with customer authorized representative' },
    { key: 'customerAcceptanceReceived', label: 'Customer Acceptance & Sign-off', desc: 'Customer signed off on contract delivery and quality acceptance' }
];

export default function ProjectHandoverModal({ project, isOpen, onClose, isCustomer = false, onUpdated }) {
    const [handover, setHandover] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

    // Checklist state
    const [checklist, setChecklist] = useState({
        fabricationCompleted: false,
        installationCompleted: false,
        qualityInspectionPassed: false,
        defectsResolved: false,
        siteCleared: false,
        deliveryCompleted: false,
        customerInspectionCompleted: false,
        customerAcceptanceReceived: false
    });

    const [qualityStatus, setQualityStatus] = useState('Pending');
    const [handoverNotes, setHandoverNotes] = useState('');
    const [pendingWorkNotes, setPendingWorkNotes] = useState('');

    // Customer Feedback state
    const [customerRating, setCustomerRating] = useState(5);
    const [customerComments, setCustomerComments] = useState('');
    const [acceptedByName, setAcceptedByName] = useState('');

    useEffect(() => {
        if (project?._id && isOpen) {
            fetchHandover();
        }
    }, [project?._id, isOpen]);

    const fetchHandover = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/handover/projects/${project._id}/handover`);
            if (res.data.success) {
                const h = res.data.handover || {};
                setHandover(h);
                if (h.checklist) {
                    setChecklist(prev => ({ ...prev, ...h.checklist }));
                }
                setQualityStatus(h.qualityInspectionStatus || 'Pending');
                setHandoverNotes(h.handoverNotes || '');
                setPendingWorkNotes(h.pendingWorkNotes || '');
                if (h.customerFeedback) {
                    setCustomerRating(h.customerFeedback.rating || 5);
                    setCustomerComments(h.customerFeedback.comments || '');
                    setAcceptedByName(h.customerFeedback.acceptedBy || '');
                }
            }
        } catch (err) {
            console.error('Error fetching handover:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleChecklistItem = async (key) => {
        if (isCustomer) return; // Customers only sign acceptance
        const updated = { ...checklist, [key]: !checklist[key] };
        setChecklist(updated);
        try {
            await api.put(`/handover/projects/${project._id}/handover/checklist`, {
                checklist: updated,
                qualityInspectionStatus: qualityStatus,
                handoverNotes,
                pendingWorkNotes
            });
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error('Checklist update error:', err);
        }
    };

    const handleSaveVerification = async () => {
        setSubmitting(true);
        try {
            const res = await api.put(`/handover/projects/${project._id}/handover/checklist`, {
                checklist,
                qualityInspectionStatus: qualityStatus,
                handoverNotes,
                pendingWorkNotes
            });
            if (res.data.success) {
                setActionMsg({ type: 'success', text: 'Verification criteria and notes saved successfully.' });
                if (onUpdated) onUpdated();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: 'Failed to save checklist.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCustomerSignoff = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.post(`/handover/projects/${project._id}/handover/acceptance`, {
                rating: customerRating,
                comments: customerComments,
                acceptedBy: acceptedByName || (isCustomer ? 'Valued Client' : 'Client Representative')
            });
            if (res.data.success) {
                setActionMsg({ type: 'success', text: 'Customer sign-off and rating recorded.' });
                fetchHandover();
                if (onUpdated) onUpdated();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: 'Failed to record customer sign-off.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveHandover = async () => {
        setSubmitting(true);
        try {
            const res = await api.post(`/handover/projects/${project._id}/handover/approve`, {
                approvalNotes: handoverNotes,
                handoverDate: new Date()
            });
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                fetchHandover();
                if (onUpdated) onUpdated();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Approval blocked: checklist criteria unmet.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadCertificate = () => {
        generateProjectCompletionCertificatePDF(project, handover);
    };

    if (!isOpen || !project) return null;

    const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
    const isReadyForApproval = completedChecklistCount >= 4 && checklist.fabricationCompleted && checklist.qualityInspectionPassed && checklist.defectsResolved;
    const isCompleted = handover?.status === 'Completed';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8 text-xs max-h-[92vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                Official Project Handover System
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isCompleted
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                                {isCompleted ? 'Certified & Handed Over' : (handover?.status || 'In Progress')}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            {project.title}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Client: {project.clientName || project.customerId?.name || 'Valued Client'} • Contract ID: {String(project._id).slice(-8).toUpperCase()}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                </div>

                {/* Banner */}
                {actionMsg.text && (
                    <div className={`mt-3 p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
                        actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        <span>{actionMsg.text}</span>
                        <button onClick={() => setActionMsg({ type: '', text: '' })} className="font-bold underline ml-3">Dismiss</button>
                    </div>
                )}

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto space-y-5 pr-1 mt-4">
                    {/* Completion Certificate Banner if Approved */}
                    {isCompleted && (
                        <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-2 border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Official Certificate Issued</span>
                                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                                        Certificate #{handover.certificateNumber}
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Issued on {new Date(handover.certificateIssuedAt || handover.approvedAt).toLocaleDateString()} by {handover.approvedByName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadCertificate}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                            >
                                <FileDown className="w-4 h-4" /> Download Certified PDF
                            </button>
                        </div>
                    )}

                    {/* Progress Checklist Matrix */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                                Handover Checklist ({completedChecklistCount} of {CHECKLIST_ITEMS.length} Satisfied)
                            </h4>
                            <span className="text-[11px] font-bold text-slate-500">
                                {Math.round((completedChecklistCount / CHECKLIST_ITEMS.length) * 100)}% Complete
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {CHECKLIST_ITEMS.map(item => {
                                const isChecked = !!checklist[item.key];
                                return (
                                    <div
                                        key={item.key}
                                        onClick={() => handleToggleChecklistItem(item.key)}
                                        className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                                            isCustomer ? 'cursor-default' : 'cursor-pointer hover:border-blue-400'
                                        } ${
                                            isChecked 
                                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {isChecked ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <Square className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[11px] leading-tight">{item.label}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Engineering & Verification Observations (Staff/Admin) */}
                    {!isCustomer && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Quality Inspection Status</label>
                                <select
                                    disabled={isCompleted}
                                    value={qualityStatus}
                                    onChange={e => setQualityStatus(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                                >
                                    <option value="Pending">Pending Inspection</option>
                                    <option value="Passed">Passed (100% Quality Conformance)</option>
                                    <option value="Conditional Pass">Conditional Pass (Minor Snags)</option>
                                    <option value="Failed">Failed (Rework Required)</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pending Work / Snaglist Notes</label>
                                <input
                                    type="text"
                                    disabled={isCompleted}
                                    placeholder="e.g. None - Zero defects identified"
                                    value={pendingWorkNotes}
                                    onChange={e => setPendingWorkNotes(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Handover & Site Clearance Notes</label>
                                <textarea
                                    rows={2}
                                    disabled={isCompleted}
                                    placeholder="Enter observations on site demobilization, customer key handover, or structural inspection..."
                                    value={handoverNotes}
                                    onChange={e => setHandoverNotes(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                />
                            </div>
                        </div>
                    )}

                    {/* Customer Acceptance & Sign-off Section */}
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-blue-600" /> Customer Acceptance & Rating
                            </h4>
                            {checklist.customerAcceptanceReceived && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                                    Signed Off by Client
                                </span>
                            )}
                        </div>

                        {checklist.customerAcceptanceReceived ? (
                            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl space-y-1">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    {'★'.repeat(customerRating)}{'☆'.repeat(5 - customerRating)} ({customerRating}/5.0)
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 italic">
                                    "{customerComments || 'Work accepted per contract standards.'}"
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Signatory: <strong>{acceptedByName || 'Customer Representative'}</strong>
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleCustomerSignoff} className="space-y-3">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Satisfaction Rating</label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setCustomerRating(star)}
                                                className={`p-1.5 rounded-lg text-lg transition-transform ${
                                                    customerRating >= star ? 'text-amber-400 scale-110' : 'text-slate-300'
                                                }`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                        <span className="font-bold text-slate-600 ml-2">{customerRating} of 5 Stars</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Client Signatory Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Er. Rajiv Menon / Project Head"
                                            value={acceptedByName}
                                            onChange={e => setAcceptedByName(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Client Feedback Comments</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Excellent fabrication quality and punctual delivery."
                                            value={customerComments}
                                            onChange={e => setCustomerComments(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                                >
                                    {submitting ? 'Recording...' : 'Submit Customer Acceptance & Rating'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                    >
                        Close
                    </button>

                    <div className="flex items-center gap-2">
                        {!isCustomer && !isCompleted && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSaveVerification}
                                    disabled={submitting}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                >
                                    Save Checklist
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApproveHandover}
                                    disabled={submitting || !isReadyForApproval}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-1.5"
                                    title={!isReadyForApproval ? 'Complete mandatory items: Fabrication, Quality, Defects & Delivery' : 'Approve handover and issue completion certificate'}
                                >
                                    <ShieldCheck className="w-4 h-4" /> Approve Handover & Issue Certificate
                                </button>
                            </>
                        )}
                        {isCompleted && (
                            <button
                                onClick={handleDownloadCertificate}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                            >
                                <FileDown className="w-4 h-4" /> Download Certificate PDF
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
