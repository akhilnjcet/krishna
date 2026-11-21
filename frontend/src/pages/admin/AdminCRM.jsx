import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Users, Plus, Search, Filter, Phone, Mail, MapPin, 
    Calendar, ArrowRight, CheckCircle2, Clock, DollarSign, 
    AlertTriangle, X, RefreshCw, MessageSquare, ChevronLeft, ChevronRight, UserPlus, Briefcase
} from 'lucide-react';

const PIPELINE_STAGES = [
    'New Enquiry',
    'Contacted',
    'Site Visit Required',
    'Site Inspection Completed',
    'Quotation Preparation',
    'Quotation Sent',
    'Negotiation',
    'Won',
    'Lost'
];

const STAGE_COLORS = {
    'New Enquiry': 'border-t-blue-500 bg-blue-50/20',
    'Contacted': 'border-t-indigo-500 bg-indigo-50/20',
    'Site Visit Required': 'border-t-amber-500 bg-amber-50/20',
    'Site Inspection Completed': 'border-t-purple-500 bg-purple-50/20',
    'Quotation Preparation': 'border-t-cyan-500 bg-cyan-50/20',
    'Quotation Sent': 'border-t-teal-500 bg-teal-50/20',
    'Negotiation': 'border-t-orange-500 bg-orange-50/20',
    'Won': 'border-t-emerald-500 bg-emerald-50/20',
    'Lost': 'border-t-rose-500 bg-rose-50/20'
};

const AdminCRM = () => {
    const [leads, setLeads] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'
    const [selectedStage, setSelectedStage] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [draggedLeadId, setDraggedLeadId] = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    // Form states
    const [createForm, setCreateForm] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        source: 'Walk-in customers',
        requiredService: 'General Fabrication',
        projectDescription: '',
        estimatedBudget: 0,
        expectedCompletionDate: '',
        notes: ''
    });

    const [followUpForm, setFollowUpForm] = useState({
        scheduledDate: '',
        followUpType: 'Call',
        notes: '',
        ownerName: 'Sales Staff'
    });

    const [convertWithQuote, setConvertWithQuote] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, [selectedStage, overdueOnly]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = {};
            if (selectedStage !== 'All') params.stage = selectedStage;
            if (overdueOnly) params.overdueOnly = 'true';
            if (searchQuery) params.search = searchQuery;

            const res = await api.get('/leads', { params });
            if (res.data.success) {
                setLeads(res.data.leads || []);
                setSummary(res.data.summary);
            }
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/leads/manual', createForm);
            if (res.data.success) {
                setShowCreateModal(false);
                fetchLeads();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating lead');
        }
    };

    const handleStageAdvance = async (leadId, newStage) => {
        if (!leadId || !newStage) return;
        // Optimistic update so cards move smoothly and instantly
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, pipelineStage: newStage } : l));
        try {
            const res = await api.put(`/leads/${leadId}`, { pipelineStage: newStage });
            if (res.data?.success) {
                fetchLeads();
            }
        } catch (err) {
            console.error('Failed to update stage:', err);
            alert(err.response?.data?.message || 'Failed to update stage');
            fetchLeads();
        }
    };

    const handleScheduleFollowUp = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/leads/${selectedLead._id}/follow-up`, followUpForm);
            if (res.data.success) {
                setShowFollowUpModal(false);
                fetchLeads();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to schedule follow up');
        }
    };

    const handleConvertLead = async () => {
        try {
            const res = await api.post(`/leads/${selectedLead._id}/convert`, {
                createQuote: convertWithQuote
            });
            if (res.data.success) {
                alert(res.data.message);
                setShowConvertModal(false);
                fetchLeads();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to convert lead');
        }
    };

    const filteredLeads = leads.filter(l => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                l.name.toLowerCase().includes(q) ||
                l.phone.toLowerCase().includes(q) ||
                (l.email && l.email.toLowerCase().includes(q)) ||
                (l.requiredService && l.requiredService.toLowerCase().includes(q))
            );
        }
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                        <Users className="w-4 h-4" /> CRM & Sales Pipeline
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Lead & Opportunity Management
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Track multi-channel client enquiries, schedule follow-ups, and convert leads into existing ERP customer & quotation records.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchLeads}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            setCreateForm({
                                name: '',
                                phone: '',
                                email: '',
                                location: '',
                                source: 'Walk-in customers',
                                requiredService: 'General Fabrication',
                                projectDescription: '',
                                estimatedBudget: 0,
                                expectedCompletionDate: '',
                                notes: ''
                            });
                            setShowCreateModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add New Lead
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Pipeline Value</span>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{summary.totalPipelineValue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Quotes in negotiation</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Enquiries</span>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{leads.length}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{summary.stageCounts?.['New Enquiry'] || 0} uncontacted</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Overdue Follow-ups</span>
                        <p className="text-2xl font-black text-rose-600">{summary.overdueFollowUpsCount}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Requires immediate callback</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Deals Won</span>
                        <p className="text-2xl font-black text-emerald-600">{summary.stageCounts?.['Won'] || 0}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Converted into ERP customers</p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search leads by customer name, phone, email, service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setOverdueOnly(!overdueOnly)}
                        className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                            overdueOnly 
                                ? 'bg-rose-600 text-white shadow-sm' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" /> Overdue Only
                    </button>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition ${viewMode === 'board' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600' : 'text-slate-500'}`}
                        >
                            Board
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600' : 'text-slate-500'}`}
                        >
                            List
                        </button>
                    </div>
                </div>
            </div>

            {/* Pipeline Board View */}
            {viewMode === 'board' ? (
                <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.pipelineStage === stage);

                        return (
                            <div 
                                key={stage} 
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverStage !== stage) setDragOverStage(stage);
                                }}
                                onDragLeave={(e) => {
                                    if (e.currentTarget.contains(e.relatedTarget)) return;
                                    if (dragOverStage === stage) setDragOverStage(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverStage(null);
                                    const leadId = e.dataTransfer.getData('text/plain');
                                    if (leadId) {
                                        handleStageAdvance(leadId, stage);
                                    }
                                }}
                                className={`w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-t-4 border border-slate-200 dark:border-slate-800 p-3 shadow-xs transition-colors ${STAGE_COLORS[stage]} ${dragOverStage === stage ? 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30' : ''}`}
                            >
                                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-700">
                                    <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                                        {stage}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-xs">
                                        {stageLeads.length}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {stageLeads.map(lead => {
                                        const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date() && !['Won', 'Lost'].includes(lead.pipelineStage);
                                        const currentStageIdx = PIPELINE_STAGES.indexOf(lead.pipelineStage);
                                        const canShiftPrev = currentStageIdx > 0;
                                        const canShiftNext = currentStageIdx < PIPELINE_STAGES.length - 1;

                                        return (
                                            <div 
                                                key={lead._id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', lead._id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setDraggedLeadId(lead._id);
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedLeadId(null);
                                                    setDragOverStage(null);
                                                }}
                                                className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-indigo-400 transition space-y-2 text-xs cursor-grab active:cursor-grabbing ${draggedLeadId === lead._id ? 'opacity-40 ring-2 ring-indigo-400' : ''}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{lead.name}</h4>
                                                    {lead.estimatedBudget > 0 && (
                                                        <span className="font-black text-indigo-600 dark:text-indigo-400 text-[11px]">
                                                            ₹{lead.estimatedBudget.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                                    <div className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 text-slate-400" /> {lead.phone}</div>
                                                    <div className="flex items-center gap-1 truncate"><Briefcase className="w-3 h-3 text-slate-400" /> {lead.requiredService}</div>
                                                    <div className="text-[10px] text-slate-400">Src: {lead.source}</div>
                                                </div>

                                                {lead.nextFollowUpDate && (
                                                    <div className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between ${
                                                        isOverdue ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40' : 'bg-slate-50 text-slate-600 dark:bg-slate-800'
                                                    }`}>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {new Date(lead.nextFollowUpDate).toLocaleDateString()}
                                                        </span>
                                                        {isOverdue && <span className="text-[9px] uppercase font-black text-rose-600">Overdue</span>}
                                                    </div>
                                                )}

                                                {/* Pipeline Stage Selector & Quick Step Controls */}
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center justify-between gap-1 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Stage</span>
                                                        <select
                                                            value={lead.pipelineStage}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                handleStageAdvance(lead._id, e.target.value);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-0 flex-1 truncate"
                                                        >
                                                            {PIPELINE_STAGES.map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>

                                                        {/* Quick shift left / right buttons */}
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={!canShiftPrev}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (canShiftPrev) handleStageAdvance(lead._id, PIPELINE_STAGES[currentStageIdx - 1]);
                                                                }}
                                                                title={canShiftPrev ? `Move back to: ${PIPELINE_STAGES[currentStageIdx - 1]}` : 'First stage'}
                                                                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                                                            >
                                                                <ChevronLeft className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!canShiftNext}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (canShiftNext) handleStageAdvance(lead._id, PIPELINE_STAGES[currentStageIdx + 1]);
                                                                }}
                                                                title={canShiftNext ? `Advance to: ${PIPELINE_STAGES[currentStageIdx + 1]}` : 'Final stage'}
                                                                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                                                            >
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Toolbar */}
                                                <div className="flex items-center justify-between gap-1 pt-1">
                                                    <button
                                                        onClick={() => {
                                                             setSelectedLead(lead);
                                                             setFollowUpForm({
                                                                 scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                                                 followUpType: 'Call',
                                                                 notes: '',
                                                                 ownerName: 'Sales Staff'
                                                             });
                                                             setShowFollowUpModal(true);
                                                         }}
                                                         className="text-[10px] text-indigo-600 font-bold hover:underline"
                                                     >
                                                         + Follow Up
                                                     </button>

                                                     {lead.pipelineStage !== 'Won' ? (
                                                         <button
                                                             onClick={() => {
                                                                 setSelectedLead(lead);
                                                                 setShowConvertModal(true);
                                                             }}
                                                             className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black hover:bg-emerald-100"
                                                         >
                                                             Convert →
                                                         </button>
                                                     ) : (
                                                         <span className="text-[9px] font-black text-emerald-600">Converted ✓</span>
                                                     )}
                                                 </div>
                                             </div>
                                         );
                                     })}

                                     {stageLeads.length === 0 && (
                                         <div className={`p-4 border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl text-center text-[10px] text-slate-400 font-medium ${dragOverStage === stage ? 'border-indigo-400 bg-indigo-50/20 text-indigo-500 font-bold' : ''}`}>
                                             Drag & drop leads here
                                         </div>
                                     )}
                                 </div>
                             </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-black">
                            <tr>
                                <th className="p-3">Customer / Lead</th>
                                <th className="p-3">Contact</th>
                                <th className="p-3">Service</th>
                                <th className="p-3">Source</th>
                                <th className="p-3">Pipeline Stage</th>
                                <th className="p-3 text-right">Est. Budget</th>
                                <th className="p-3 text-center">Next Follow-Up</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLeads.map(l => (
                                <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="p-3 font-bold text-slate-900 dark:text-white">{l.name}</td>
                                    <td className="p-3 text-slate-500 font-mono">{l.phone}</td>
                                    <td className="p-3 text-slate-700 dark:text-slate-300">{l.requiredService}</td>
                                    <td className="p-3 text-slate-500">{l.source}</td>
                                    <td className="p-3">
                                        <select
                                            value={l.pipelineStage}
                                            onChange={(e) => handleStageAdvance(l._id, e.target.value)}
                                            className="p-1 text-[11px] rounded bg-slate-50 dark:bg-slate-800 border font-bold"
                                        >
                                            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 text-right font-black text-indigo-600">
                                        ₹{(l.estimatedBudget || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3 text-center text-slate-500">
                                        {l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="p-3 text-right">
                                        {l.pipelineStage !== 'Won' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedLead(l);
                                                    setShowConvertModal(true);
                                                }}
                                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px]"
                                            >
                                                Convert
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal: Add Lead */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Record New Lead</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Customer / Company Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Reliance Logistics / Mr. Suresh"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9846012345"
                                        value={createForm.phone}
                                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="client@gmail.com"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Lead Source</label>
                                    <select
                                        value={createForm.source}
                                        onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    >
                                        <option value="Walk-in customers">Walk-in customers</option>
                                        <option value="Phone calls">Phone calls</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Website">Website</option>
                                        <option value="Referrals">Referrals</option>
                                        <option value="Social media">Social media</option>
                                        <option value="AI Chatbot">AI Chatbot</option>
                                        <option value="Other sources">Other sources</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Required Service</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Heavy Shed Truss / Mezzanine Floor"
                                        value={createForm.requiredService}
                                        onChange={(e) => setCreateForm({ ...createForm, requiredService: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Estimated Budget (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="50000"
                                        value={createForm.estimatedBudget}
                                        onChange={(e) => setCreateForm({ ...createForm, estimatedBudget: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Project Description & Requirements</label>
                                <textarea
                                    rows="2"
                                    placeholder="Scope of work, site dimensions, expected completion timeline..."
                                    value={createForm.projectDescription}
                                    onChange={(e) => setCreateForm({ ...createForm, projectDescription: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md">Create Opportunity</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Schedule Follow Up */}
            {showFollowUpModal && selectedLead && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">Schedule Follow-Up</h2>
                            <button onClick={() => setShowFollowUpModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleScheduleFollowUp} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Follow-up Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={followUpForm.scheduledDate}
                                    onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Follow-up Channel</label>
                                <select
                                    value={followUpForm.followUpType}
                                    onChange={(e) => setFollowUpForm({ ...followUpForm, followUpType: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                >
                                    <option value="Call">Phone Call</option>
                                    <option value="WhatsApp">WhatsApp</option>
                                    <option value="Site Visit">Site Inspection Visit</option>
                                    <option value="Meeting">Office Meeting</option>
                                    <option value="Email">Email</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Notes / Discussion Agenda</label>
                                <textarea
                                    rows="2"
                                    placeholder="Discuss revised fabrication quotation, site drawing approval..."
                                    value={followUpForm.notes}
                                    onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md">Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Convert to Customer & Quote */}
            {showConvertModal && selectedLead && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-emerald-600" /> Convert Lead to Customer
                            </h2>
                            <button onClick={() => setShowConvertModal(false)} className="text-slate-400 p-1.5"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <p className="text-slate-600 dark:text-slate-300">
                                This will convert <strong>{selectedLead.name}</strong> ({selectedLead.phone}) into an active ERP Customer. 
                                The system automatically checks existing records to <strong>prevent duplicate customers</strong>.
                            </p>

                            <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={convertWithQuote}
                                    onChange={(e) => setConvertWithQuote(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                />
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    Automatically create Draft Quotation (₹{selectedLead.estimatedBudget || 0})
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 border rounded-xl font-bold">Cancel</button>
                            <button onClick={handleConvertLead} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md">
                                Confirm & Convert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCRM;
