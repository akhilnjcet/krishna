import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, FileText, CheckCircle2, Clock, AlertTriangle, 
    RefreshCw, Send, Plus, Users, Search, Download, Eye,
    Check, X, ChevronRight, Filter, AlertCircle,
    Phone, Mail, MapPin, Save, MessageCircle, Truck, RotateCcw
} from 'lucide-react';
import api from '../../services/api';

const AdminLegalPolicies = () => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'publish' | 'acceptances' | 'requests'
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [policies, setPolicies] = useState([]);
    const [acceptances, setAcceptances] = useState([]);
    const [acceptanceStats, setAcceptanceStats] = useState({ totalUsers: 0, currentPrivacyAccepted: 0, currentTermsAccepted: 0 });
    const [requests, setRequests] = useState([]);
    const [requestFilter, setRequestFilter] = useState('all');

    // Contact details state (support emails, phone numbers, addresses editable by admin)
    const [contactSettings, setContactSettings] = useState({
        footer_phone: '',
        footer_email: '',
        footer_address: '',
        floating_whatsapp: ''
    });
    const [savingContacts, setSavingContacts] = useState(false);
    const [contactSaveMessage, setContactSaveMessage] = useState(null);

    // Publish form state
    const [publishForm, setPublishForm] = useState({
        policyType: 'privacy',
        version: '',
        title: '',
        content: '',
        summary: '',
        effectiveDate: new Date().toISOString().split('T')[0]
    });
    const [showConfirmPublish, setShowConfirmPublish] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // Process request modal state
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processModalOpen, setProcessModalOpen] = useState(false);
    const [reviewStatus, setReviewStatus] = useState('Under Review');
    const [resolutionNote, setResolutionNote] = useState('');
    const [processingAction, setProcessingAction] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            const [sumRes, polRes, accRes, reqRes, setRes] = await Promise.all([
                api.get('/policies/summary').catch(() => ({ data: { success: false } })),
                api.get('/policies/admin/all').catch(() => ({ data: { success: false } })),
                api.get('/policies/admin/acceptances').catch(() => ({ data: { success: false } })),
                api.get('/policies/admin/privacy-requests').catch(() => ({ data: { success: false } })),
                api.get('/settings').catch(() => ({ data: [] }))
            ]);

            if (sumRes.data?.success) setSummary(sumRes.data.data);
            if (polRes.data?.success) setPolicies(polRes.data.data || []);
            if (accRes.data?.success) {
                setAcceptances(accRes.data.data?.acceptances || []);
                setAcceptanceStats(accRes.data.data?.stats || {});
            }
            if (reqRes.data?.success) setRequests(reqRes.data.data || []);
            if (setRes.data && Array.isArray(setRes.data)) {
                const map = {};
                setRes.data.forEach(s => { map[s.key] = s.value; });
                setContactSettings({
                    footer_phone: map.footer_phone || '+91 9447940835',
                    footer_email: map.footer_email || 'contact@krishnaengg.com',
                    footer_address: map.footer_address || 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
                    floating_whatsapp: map.floating_whatsapp || '919447940835'
                });
            }
        } catch (err) {
            console.error('Failed to load legal admin data', err);
            setStatusMessage({ type: 'error', text: 'Error loading compliance telemetry from server.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveContacts = async (e) => {
        e.preventDefault();
        setSavingContacts(true);
        setContactSaveMessage(null);
        try {
            await api.put('/settings', {
                settings: {
                    footer_phone: contactSettings.footer_phone,
                    footer_email: contactSettings.footer_email,
                    footer_address: contactSettings.footer_address,
                    floating_whatsapp: contactSettings.floating_whatsapp
                }
            });
            setContactSaveMessage({ type: 'success', text: 'Support emails, contact numbers & addresses updated successfully! Changes reflect on all public policy pages.' });
            setTimeout(() => setContactSaveMessage(null), 5000);
        } catch (err) {
            console.error('Failed to update support contact details:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update support contact details.';
            setContactSaveMessage({ type: 'error', text: msg });
        } finally {
            setSavingContacts(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePreFillForPublish = (type) => {
        const cur = policies.find(p => p.policyType === type && p.isCurrent);
        const titles = {
            privacy: 'Privacy Policy - Krishna Engineering Works',
            terms: 'Terms of Service - Krishna Engineering Works',
            refund: 'Cancellation & Refund Policy - Krishna Engineering Works',
            shipping: 'Shipping & Delivery Policy - Krishna Engineering Works',
            contact: 'Contact Us & Corporate Details - Krishna Engineering Works'
        };

        if (cur) {
            // Suggest next version e.g. 1.0 -> 1.1 or 2.0
            const parts = (cur.version || '1.0').split('.');
            const nextSub = parseInt(parts[1] || '0', 10) + 1;
            const nextVersion = `${parts[0] || '1'}.${nextSub}`;

            setPublishForm({
                policyType: type,
                version: nextVersion,
                title: cur.title,
                content: cur.content,
                summary: `Updated revision for ${cur.title}`,
                effectiveDate: new Date().toISOString().split('T')[0]
            });
        } else {
            setPublishForm({
                policyType: type,
                version: '1.0',
                title: titles[type] || 'Company Policy Directive',
                content: '',
                summary: 'Initial baseline revision',
                effectiveDate: new Date().toISOString().split('T')[0]
            });
        }
        setActiveTab('publish');
    };

    const handlePublishSubmit = async (e) => {
        e.preventDefault();
        if (!publishForm.version.trim() || !publishForm.title.trim() || !publishForm.content.trim()) {
            setStatusMessage({ type: 'error', text: 'Please fill in all mandatory fields (version, title, and content).' });
            return;
        }
        setShowConfirmPublish(true);
    };

    const confirmAndExecutePublish = async () => {
        setPublishing(true);
        setStatusMessage(null);
        try {
            const res = await api.post('/policies/admin/publish', publishForm);
            if (res.data?.success) {
                setStatusMessage({ type: 'success', text: `Successfully published ${publishForm.title} (v${publishForm.version})!` });
                setShowConfirmPublish(false);
                await loadData();
                setActiveTab('overview');
            } else {
                setStatusMessage({ type: 'error', text: res.data?.message || 'Publication failed.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to publish policy revision.' });
        } finally {
            setPublishing(false);
        }
    };

    const handleOpenProcessModal = (req) => {
        setSelectedRequest(req);
        setReviewStatus(req.status || 'Under Review');
        setResolutionNote(req.resolutionNote || '');
        setProcessModalOpen(true);
    };

    const handleSaveProcessRequest = async () => {
        if (!selectedRequest) return;
        setProcessingAction(true);
        try {
            const res = await api.put(`/policies/admin/privacy-requests/${selectedRequest._id}`, {
                status: reviewStatus,
                resolutionNote
            });
            if (res.data?.success) {
                setStatusMessage({ type: 'success', text: `Request #${selectedRequest._id.slice(-6)} updated to status: ${reviewStatus}` });
                setProcessModalOpen(false);
                setSelectedRequest(null);
                await loadData();
            } else {
                setStatusMessage({ type: 'error', text: res.data?.message || 'Failed to update request.' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Error processing request.' });
        } finally {
            setProcessingAction(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        if (requestFilter === 'all') return true;
        return r.status === requestFilter || r.requestType === requestFilter;
    });

    return (
        <div className="space-y-8 font-sans pb-20">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Legal Compliance & Governance
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tight">
                            Legal & Privacy Management
                        </h1>
                        <p className="text-slate-400 text-xs md:text-sm font-medium mt-2 max-w-2xl">
                            Version-controlled Terms of Service, Privacy Policies, audit-grade user acceptance records, and statutory data requests management for Krishna ERP.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={loadData}
                            disabled={loading}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Sync Feed
                        </button>
                        <a 
                            href="#/privacy-policy" 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            Live Public Pages
                        </a>
                    </div>
                </div>

                {/* Status Notice */}
                {statusMessage && (
                    <div className={`mt-6 p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
                        statusMessage.type === 'success' 
                            ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-200' 
                            : 'bg-rose-950/80 border border-rose-500/30 text-rose-200'
                    }`}>
                        <span>{statusMessage.text}</span>
                        <button onClick={() => setStatusMessage(null)} className="opacity-60 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex overflow-x-auto sm:flex-wrap gap-2 p-2 bg-slate-900/60 dark:bg-slate-800/80 rounded-2xl border border-slate-800 scrollbar-none">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                        activeTab === 'overview' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Current Policies ({policies.length})
                </button>
                <button
                    onClick={() => setActiveTab('publish')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                        activeTab === 'publish' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Plus className="w-4 h-4" />
                    Publish New Revision
                </button>
                <button
                    onClick={() => setActiveTab('acceptances')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                        activeTab === 'acceptances' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Acceptance Audit Log ({acceptances.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                        activeTab === 'requests' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <AlertCircle className="w-4 h-4" />
                    Privacy & Data Requests ({requests.length})
                    {requests.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Metrics Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Registered Users</span>
                            <span className="text-3xl font-black text-white">{acceptanceStats.totalUsers || 0}</span>
                            <span className="text-[10px] text-slate-400 block mt-2">Active system accounts</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Privacy Current Accepted</span>
                            <span className="text-3xl font-black text-emerald-400">{acceptanceStats.currentPrivacyAccepted || 0}</span>
                            <span className="text-[10px] text-slate-400 block mt-2">v{summary?.privacy?.version || '1.0'} compliant</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block mb-1">Terms Current Accepted</span>
                            <span className="text-3xl font-black text-blue-400">{acceptanceStats.currentTermsAccepted || 0}</span>
                            <span className="text-[10px] text-slate-400 block mt-2">v{summary?.terms?.version || '1.0'} compliant</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Pending Privacy Requests</span>
                            <span className="text-3xl font-black text-amber-400">
                                {requests.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-2">Requires administrator review</span>
                        </div>
                    </div>

                    {/* SUPPORT CONTACT & NUMBERS DIRECTORY (LIVE ADMIN EDIT) */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 block mb-1">
                                    Direct Support & Contact Relay
                                </span>
                                <h3 className="text-xl font-black text-white">Support Emails, Phone Numbers & Addresses</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Changes saved here dynamically update the footer, contact section, and compliance notices on all public policy pages.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider self-start md:self-auto">
                                Live Sync
                            </span>
                        </div>

                        {contactSaveMessage && (
                            <div className={`p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-2 ${
                                contactSaveMessage.type === 'success' 
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                            }`}>
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                {contactSaveMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleSaveContacts} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Support Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={contactSettings.footer_phone}
                                    onChange={(e) => setContactSettings({ ...contactSettings, footer_phone: e.target.value })}
                                    placeholder="+91 9447940835"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-blue-400" /> Support & Grievance Email
                                </label>
                                <input
                                    type="email"
                                    value={contactSettings.footer_email}
                                    onChange={(e) => setContactSettings({ ...contactSettings, footer_email: e.target.value })}
                                    placeholder="contact@krishnaengg.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <MessageCircle className="w-3.5 h-3.5 text-green-400" /> WhatsApp Hotline (91...)
                                </label>
                                <input
                                    type="text"
                                    value={contactSettings.floating_whatsapp}
                                    onChange={(e) => setContactSettings({ ...contactSettings, floating_whatsapp: e.target.value })}
                                    placeholder="919447940835"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Operational / Registered Address
                                </label>
                                <input
                                    type="text"
                                    value={contactSettings.footer_address}
                                    onChange={(e) => setContactSettings({ ...contactSettings, footer_address: e.target.value })}
                                    placeholder="Thiruvazhiyode, Sreekrishnapuram, Kerala 679514"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={savingContacts}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {savingContacts ? 'Saving Changes...' : 'Save Support Contact Details'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Active Policies Cards Grid (All 5 Policies) */}
                    <div>
                        <div className="mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">Published Documents</span>
                            <h3 className="text-xl font-black text-white">Active Policy Directives</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* 1. Privacy Policy */}
                            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Active Policy
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v{summary?.privacy?.version || '1.0'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-1.5">Privacy Policy</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {summary?.privacy?.title || 'Data protection and telemetry disclosure guidelines'}
                                    </p>
                                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mb-5">
                                        <div className="flex justify-between">
                                            <span>Effective Date:</span>
                                            <span className="text-white font-medium">{summary?.privacy?.effectiveDate ? new Date(summary.privacy.effectiveDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Updated:</span>
                                            <span className="text-white font-medium">{summary?.privacy?.lastUpdated ? new Date(summary.privacy.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href="#/privacy-policy"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-center text-xs font-bold transition"
                                    >
                                        View Page
                                    </a>
                                    <button
                                        onClick={() => handlePreFillForPublish('privacy')}
                                        className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Edit / Revise
                                    </button>
                                </div>
                            </div>

                            {/* 2. Terms of Service */}
                            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Active Policy
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v{summary?.terms?.version || '1.0'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-1.5">Terms of Service</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {summary?.terms?.title || 'Contractual terms and operational protocols'}
                                    </p>
                                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mb-5">
                                        <div className="flex justify-between">
                                            <span>Effective Date:</span>
                                            <span className="text-white font-medium">{summary?.terms?.effectiveDate ? new Date(summary.terms.effectiveDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Updated:</span>
                                            <span className="text-white font-medium">{summary?.terms?.lastUpdated ? new Date(summary.terms.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href="#/terms-of-service"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-center text-xs font-bold transition"
                                    >
                                        View Page
                                    </a>
                                    <button
                                        onClick={() => handlePreFillForPublish('terms')}
                                        className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Edit / Revise
                                    </button>
                                </div>
                            </div>

                            {/* 3. Refund Policy */}
                            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Active Policy
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v{summary?.refund?.version || '1.0'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-1.5">Cancellation & Refund</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {summary?.refund?.title || 'Order cancellation and refund turnaround terms'}
                                    </p>
                                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mb-5">
                                        <div className="flex justify-between">
                                            <span>Effective Date:</span>
                                            <span className="text-white font-medium">{summary?.refund?.effectiveDate ? new Date(summary.refund.effectiveDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Updated:</span>
                                            <span className="text-white font-medium">{summary?.refund?.lastUpdated ? new Date(summary.refund.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href="#/refund-policy"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-center text-xs font-bold transition"
                                    >
                                        View Page
                                    </a>
                                    <button
                                        onClick={() => handlePreFillForPublish('refund')}
                                        className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Edit / Revise
                                    </button>
                                </div>
                            </div>

                            {/* 4. Shipping Policy */}
                            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Active Policy
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v{summary?.shipping?.version || '1.0'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-1.5">Shipping & Delivery</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {summary?.shipping?.title || 'Material dispatch and on-site assembly milestones'}
                                    </p>
                                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mb-5">
                                        <div className="flex justify-between">
                                            <span>Effective Date:</span>
                                            <span className="text-white font-medium">{summary?.shipping?.effectiveDate ? new Date(summary.shipping.effectiveDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Updated:</span>
                                            <span className="text-white font-medium">{summary?.shipping?.lastUpdated ? new Date(summary.shipping.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href="#/shipping-policy"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-center text-xs font-bold transition"
                                    >
                                        View Page
                                    </a>
                                    <button
                                        onClick={() => handlePreFillForPublish('shipping')}
                                        className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Edit / Revise
                                    </button>
                                </div>
                            </div>

                            {/* 5. Contact Us */}
                            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Active Policy
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            v{summary?.contact?.version || '1.0'}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-1.5">Contact Us & Grievance</h4>
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {summary?.contact?.title || 'Corporate address, helplines and grievance redressal'}
                                    </p>
                                    <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mb-5">
                                        <div className="flex justify-between">
                                            <span>Effective Date:</span>
                                            <span className="text-white font-medium">{summary?.contact?.effectiveDate ? new Date(summary.contact.effectiveDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Updated:</span>
                                            <span className="text-white font-medium">{summary?.contact?.lastUpdated ? new Date(summary.contact.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href="#/contact-us"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-center text-xs font-bold transition"
                                    >
                                        View Page
                                    </a>
                                    <button
                                        onClick={() => handlePreFillForPublish('contact')}
                                        className="px-3.5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition"
                                    >
                                        Edit / Revise
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All Historical Versions Table */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Policy Version History</h3>
                                <p className="text-xs text-slate-400">Archived and published policy iterations (immutable records)</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                        <th className="pb-3 px-4">Type</th>
                                        <th className="pb-3 px-4">Version</th>
                                        <th className="pb-3 px-4">Title</th>
                                        <th className="pb-3 px-4">Effective Date</th>
                                        <th className="pb-3 px-4">Published By</th>
                                        <th className="pb-3 px-4">Status</th>
                                        <th className="pb-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {policies.map(p => (
                                        <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-4 font-black uppercase tracking-wider">
                                                {p.policyType === 'privacy' ? (
                                                    <span className="text-emerald-400">Privacy</span>
                                                ) : p.policyType === 'terms' ? (
                                                    <span className="text-blue-400">Terms</span>
                                                ) : p.policyType === 'refund' ? (
                                                    <span className="text-purple-400">Refund</span>
                                                ) : p.policyType === 'shipping' ? (
                                                    <span className="text-amber-400">Shipping</span>
                                                ) : (
                                                    <span className="text-cyan-400">Contact</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 font-mono font-bold text-white">v{p.version}</td>
                                            <td className="py-4 px-4 max-w-xs truncate font-medium text-white">{p.title}</td>
                                            <td className="py-4 px-4 text-slate-400">
                                                {p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-4 px-4 text-slate-400">{p.publishedByName || 'Admin'}</td>
                                            <td className="py-4 px-4">
                                                {p.isCurrent ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-400">
                                                        Archived
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setPublishForm({
                                                            policyType: p.policyType,
                                                            version: p.version + '.1',
                                                            title: p.title,
                                                            content: p.content,
                                                            summary: `Revision derived from v${p.version}`,
                                                            effectiveDate: new Date().toISOString().split('T')[0]
                                                        });
                                                        setActiveTab('publish');
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 font-bold"
                                                >
                                                    Fork / Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {policies.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="py-8 text-center text-slate-500">
                                                No policy records found. Baseline policies are being established.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PUBLISH FORM */}
            {activeTab === 'publish' && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-4xl mx-auto">
                    <div className="mb-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Policy Governance</div>
                        <h2 className="text-2xl font-black text-white">Publish Revised Policy Version</h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Publishing creates an immutable historical version and automatically marks it as the active version for Krishna ERP.
                        </p>
                    </div>

                    <form onSubmit={handlePublishSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Policy Type *
                                </label>
                                <select
                                    value={publishForm.policyType}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        handlePreFillForPublish(type);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-500"
                                >
                                    <option value="privacy">Privacy Policy</option>
                                    <option value="terms">Terms of Service</option>
                                    <option value="refund">Cancellation & Refund Policy</option>
                                    <option value="shipping">Shipping & Delivery Policy</option>
                                    <option value="contact">Contact Us & Grievance Directives</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Version Number * (e.g. 1.1, 2.0)
                                </label>
                                <input
                                    type="text"
                                    value={publishForm.version}
                                    onChange={(e) => setPublishForm({ ...publishForm, version: e.target.value })}
                                    placeholder="1.1"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-mono font-bold outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Effective Date *
                                </label>
                                <input
                                    type="date"
                                    value={publishForm.effectiveDate}
                                    onChange={(e) => setPublishForm({ ...publishForm, effectiveDate: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Official Policy Title *
                            </label>
                            <input
                                type="text"
                                value={publishForm.title}
                                onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                                placeholder="Privacy Policy - Krishna Engineering Works"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Revision Summary / Changelog Note
                            </label>
                            <input
                                type="text"
                                value={publishForm.summary}
                                onChange={(e) => setPublishForm({ ...publishForm, summary: e.target.value })}
                                placeholder="Added Section 4 regarding statutory tax invoice retention."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-medium outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                Full Policy Content (Markdown / Plain Text) *
                            </label>
                            <textarea
                                rows={14}
                                value={publishForm.content}
                                onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })}
                                placeholder="Paste or type complete policy articles here..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white text-xs font-mono leading-relaxed outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setActiveTab('overview')}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-blue-600/30 flex items-center gap-2"
                            >
                                Review & Publish Revision
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 3: ACCEPTANCE AUDIT LOG */}
            {activeTab === 'acceptances' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Audit Acceptance Logs</h3>
                                <p className="text-xs text-slate-400">Tamper-evident timestamped policy consent records</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                        <th className="pb-3 px-4">User</th>
                                        <th className="pb-3 px-4">Policy Type</th>
                                        <th className="pb-3 px-4">Accepted Version</th>
                                        <th className="pb-3 px-4">Consent Timestamp</th>
                                        <th className="pb-3 px-4">IP Address</th>
                                        <th className="pb-3 px-4">Status vs Current</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {acceptances.map(acc => {
                                        const currentVer = acc.policyType === 'privacy' 
                                            ? summary?.privacy?.version 
                                            : summary?.terms?.version;
                                        const isUpToDate = acc.policyVersion === currentVer;

                                        return (
                                            <tr key={acc._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="font-bold text-white">{acc.userName || 'User'}</div>
                                                    <div className="text-[10px] text-slate-400">{acc.userEmail || acc.userId}</div>
                                                </td>
                                                <td className="py-4 px-4 font-black uppercase tracking-wider">
                                                    {acc.policyType === 'privacy' ? (
                                                        <span className="text-emerald-400">Privacy Policy</span>
                                                    ) : (
                                                        <span className="text-blue-400">Terms of Service</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-mono font-bold text-white">v{acc.policyVersion}</td>
                                                <td className="py-4 px-4 text-slate-400">
                                                    {acc.acceptedAt ? new Date(acc.acceptedAt).toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="py-4 px-4 font-mono text-[10px] text-slate-500">
                                                    {acc.ipAddress || 'Client Node'}
                                                </td>
                                                <td className="py-4 px-4">
                                                    {isUpToDate ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                            Up to date
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                            Outdated (v{currentVer})
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {acceptances.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-8 text-center text-slate-500">
                                                No acceptance records recorded yet. Acceptance is captured upon user registration or re-consent.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: PRIVACY & DATA REQUESTS */}
            {activeTab === 'requests' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">User Data & Privacy Requests</h3>
                                <p className="text-xs text-slate-400">Process Data Access, Correction, and Account Deletion filings</p>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex flex-wrap gap-2">
                                {['all', 'Submitted', 'Under Review', 'Approved', 'Completed', 'Rejected'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setRequestFilter(status)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                            requestFilter === status 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                        <th className="pb-3 px-4">User</th>
                                        <th className="pb-3 px-4">Request Type</th>
                                        <th className="pb-3 px-4">Description</th>
                                        <th className="pb-3 px-4">Submitted At</th>
                                        <th className="pb-3 px-4">Current Status</th>
                                        <th className="pb-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {filteredRequests.map(r => (
                                        <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-white">{r.userName}</div>
                                                <div className="text-[10px] text-slate-400">{r.userEmail}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {r.requestType === 'account_deletion' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                        Account Deletion
                                                    </span>
                                                )}
                                                {r.requestType === 'data_access' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                                        Personal Data Copy
                                                    </span>
                                                )}
                                                {r.requestType === 'data_correction' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                        Data Correction
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 max-w-sm truncate text-slate-300">
                                                {r.description || 'No user note provided.'}
                                            </td>
                                            <td className="py-4 px-4 text-slate-400">
                                                {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    r.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                    r.status === 'Approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                    r.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                                    r.status === 'Under Review' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                    'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => handleOpenProcessModal(r)}
                                                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg font-bold text-xs transition-all"
                                                >
                                                    Process
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-8 text-center text-slate-500">
                                                No privacy requests found matching this filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION DIALOG FOR PUBLISHING */}
            {showConfirmPublish && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-amber-400 text-xs font-black uppercase tracking-widest">
                            <AlertTriangle className="w-5 h-5" />
                            Confirm Policy Publication
                        </div>
                        <h3 className="text-xl font-black text-white">Publish Version {publishForm.version}?</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            You are about to publish a new active <strong>{publishForm.policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</strong>.
                            Historical versions and user acceptance records will be strictly preserved. Existing users will see this newly required version.
                        </p>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
                            <div><span className="text-slate-500">Title:</span> <span className="text-white font-bold">{publishForm.title}</span></div>
                            <div><span className="text-slate-500">Version:</span> <span className="text-blue-400 font-mono font-bold">v{publishForm.version}</span></div>
                            <div><span className="text-slate-500">Effective Date:</span> <span className="text-white">{publishForm.effectiveDate}</span></div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmPublish(false)}
                                disabled={publishing}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmAndExecutePublish}
                                disabled={publishing}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                            >
                                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Confirm & Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROCESS PRIVACY REQUEST MODAL */}
            {processModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest">
                                <ShieldCheck className="w-4 h-4" />
                                Process Privacy Request
                            </div>
                            <button onClick={() => setProcessModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
                            <div><span className="text-slate-500">User:</span> <span className="text-white font-bold">{selectedRequest.userName}</span> ({selectedRequest.userEmail})</div>
                            <div><span className="text-slate-500">Type:</span> <span className="text-blue-400 uppercase font-black">{selectedRequest.requestType}</span></div>
                            <div><span className="text-slate-500">User Description:</span> <span className="text-slate-200">{selectedRequest.description || 'N/A'}</span></div>
                        </div>

                        {selectedRequest.requestType === 'account_deletion' && (
                            <div className="p-4 bg-rose-950/40 border border-rose-900/40 rounded-2xl text-[11px] text-rose-300">
                                <strong>Notice for Account Deletion:</strong> Processing as <em>Completed</em> applies soft-anonymization to the user account while retaining legally mandated tax invoices and transaction logs.
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Set Status *
                                </label>
                                <select
                                    value={reviewStatus}
                                    onChange={(e) => setReviewStatus(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-blue-500"
                                >
                                    <option value="Under Review">Under Review</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Administrative Resolution Note (Visible to User)
                                </label>
                                <textarea
                                    rows={3}
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                    placeholder="e.g. Account data exported and encrypted backup forwarded; personal data scrubbed."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setProcessModalOpen(false)}
                                disabled={processingAction}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleSaveProcessRequest}
                                disabled={processingAction}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                            >
                                {processingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Update Request Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLegalPolicies;
