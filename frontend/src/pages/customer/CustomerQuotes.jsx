import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
    FileText, Download, Clock, CheckCircle2, 
    XCircle, Loader2, AlertCircle, Phone, MapPin,
    ShieldCheck, Sparkles, Search, Check, Copy,
    Filter, ArrowUpRight, Lock, Eye, CheckCircle,
    ChevronRight, Layers, FileCheck, Cpu, ShieldAlert,
    Activity
} from 'lucide-react';
import { generateQuotePDF } from '../../services/pdfService';
import WorksiteLocationCard from '../../components/WorksiteLocationCard';

const CustomerQuotes = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await api.get('/quotes/my-quotes');
            setQuotes(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch personal quotes', err);
            setQuotes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuoteLocationUpdated = (updatedQuote) => {
        setQuotes(prev => (Array.isArray(prev) ? prev : []).map(q => q._id === updatedQuote._id ? updatedQuote : q));
    };

    const handleCopyId = (id) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownload = (quote) => {
        if (quote.status !== 'accepted') {
            alert("SECURITY: Document is Restricted until Admin Approval.");
            return;
        }
        generateQuotePDF(quote);
    };

    // Derived statistics
    const stats = useMemo(() => {
        const total = quotes.length;
        const accepted = quotes.filter(q => q.status === 'accepted').length;
        const reviewed = quotes.filter(q => q.status === 'reviewed').length;
        const pending = quotes.filter(q => !q.status || q.status === 'pending').length;
        const rejected = quotes.filter(q => q.status === 'rejected').length;
        const totalValue = quotes
            .filter(q => q.status === 'accepted' && q.estimatedCost)
            .reduce((sum, q) => sum + Number(q.estimatedCost || 0), 0);

        return { total, accepted, reviewed, pending, rejected, totalValue };
    }, [quotes]);

    // Filtered quotes based on tab and search
    const filteredQuotes = useMemo(() => {
        return quotes.filter(q => {
            // Tab filter
            if (activeTab === 'accepted' && q.status !== 'accepted') return false;
            if (activeTab === 'reviewed' && q.status !== 'reviewed') return false;
            if (activeTab === 'pending' && q.status && q.status !== 'pending') return false;
            if (activeTab === 'rejected' && q.status !== 'rejected') return false;

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const service = (q.serviceType || '').toLowerCase();
                const loc = (q.location || '').toLowerCase();
                const id = (q._id || '').toLowerCase();
                const desc = (q.description || '').toLowerCase();
                return service.includes(query) || loc.includes(query) || id.includes(query) || desc.includes(query);
            }
            return true;
        });
    }, [quotes, activeTab, searchQuery]);

    // Get stage details and progress % for a quote
    const getProgressInfo = (quote) => {
        const status = (quote.status || 'pending').toLowerCase();
        
        if (status === 'accepted') {
            return {
                percentage: 100,
                stageLabel: 'Admin Approved & Finalized',
                theme: 'emerald',
                stepIndex: 3,
                steps: [
                    { label: 'Application Received', sub: 'Details logged successfully', done: true, current: false },
                    { label: 'Engineering Review', sub: 'Specs & loads assessed', done: true, current: false },
                    { label: 'Admin Finalized', sub: 'Verified & cost locked', done: true, current: true }
                ]
            };
        }

        if (status === 'reviewed') {
            return {
                percentage: 66,
                stageLabel: 'Under Engineering Review',
                theme: 'amber',
                stepIndex: 2,
                steps: [
                    { label: 'Application Received', sub: 'Details logged successfully', done: true, current: false },
                    { label: 'Engineering Review', sub: 'Assessing requirements', done: false, current: true },
                    { label: 'Admin Finalized', sub: 'Pending final sign-off', done: false, current: false }
                ]
            };
        }

        if (status === 'rejected') {
            return {
                percentage: 100,
                stageLabel: 'Application Declined',
                theme: 'rose',
                stepIndex: 3,
                steps: [
                    { label: 'Application Received', sub: 'Details logged', done: true, current: false },
                    { label: 'Engineering Review', sub: 'Review completed', done: true, current: false },
                    { label: 'Application Declined', sub: 'Cannot proceed with request', done: true, current: true }
                ]
            };
        }

        // Default 'pending'
        return {
            percentage: 33,
            stageLabel: 'Application Received',
            theme: 'indigo',
            stepIndex: 1,
            steps: [
                { label: 'Application Received', sub: 'Awaiting engineer review', done: false, current: true },
                { label: 'Engineering Review', sub: 'Specs assessment queue', done: false, current: false },
                { label: 'Admin Finalized', sub: 'Commercial approval', done: false, current: false }
            ]
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Synchronizing Project Applications...
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto font-sans min-h-screen">
            {/* ════════════════════════════════════════════════════════════════
                PAGE HEADER & REAL-TIME STATS
            ════════════════════════════════════════════════════════════════ */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2">
                            <Sparkles className="w-3 h-3" />
                            Client Operations Terminal
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                            My <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Applications</span>
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                            Track real-time engineering review milestones, verify GPS site coordinates, and access finalized project documentation.
                        </p>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total</span>
                            <span className="text-base font-black text-slate-900 dark:text-white">{stats.total}</span>
                        </div>
                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Approved</span>
                            <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{stats.accepted}</span>
                        </div>
                        <div className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">In Review</span>
                            <span className="text-base font-black text-amber-700 dark:text-amber-300">{stats.reviewed + stats.pending}</span>
                        </div>
                        {stats.totalValue > 0 && (
                            <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
                                <span className="text-[9px] uppercase tracking-wider opacity-80 block">Finalized Value</span>
                                <span className="text-sm font-black tracking-tight">₹ {stats.totalValue.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        {[
                            { id: 'all', label: 'All Applications', count: stats.total },
                            { id: 'accepted', label: 'Approved', count: stats.accepted },
                            { id: 'reviewed', label: 'In Review', count: stats.reviewed + stats.pending },
                            { id: 'rejected', label: 'Declined', count: stats.rejected }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    activeTab === tab.id 
                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold' 
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative min-w-[220px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search applications..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                APPLICATION CARDS GRID
            ════════════════════════════════════════════════════════════════ */}
            {filteredQuotes.length === 0 ? (
                <div className="bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-12 sm:p-20 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight mb-1">
                        No Applications Found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                        {searchQuery 
                            ? 'No quotes match your current search query. Try clearing the search.' 
                            : 'There are currently no logged project quote requests for your profile.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {filteredQuotes.map((quote) => {
                        const progress = getProgressInfo(quote);
                        const isAccepted = quote.status === 'accepted';
                        const isRejected = quote.status === 'rejected';
                        const quoteIdShort = quote._id.slice(-8).toUpperCase();

                        return (
                            <motion.div
                                key={quote._id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col relative shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl ${
                                    isAccepted 
                                        ? 'border-emerald-500/30 hover:border-emerald-500/50' 
                                        : isRejected 
                                            ? 'border-rose-500/30 hover:border-rose-500/50'
                                            : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-400/50'
                                }`}
                            >
                                {/* ── CARD TOP HEADER BAR ── */}
                                <div className={`px-5 py-3.5 flex items-center justify-between border-b transition-colors ${
                                    isAccepted
                                        ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20'
                                        : isRejected
                                            ? 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20'
                                            : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-slate-100 dark:border-slate-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyId(quote._id)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 hover:border-amber-400 transition shadow-xs active:scale-95"
                                            title="Click to copy full ID"
                                        >
                                            <ShieldCheck className="w-3 h-3 text-amber-500" />
                                            <span>ID: {quoteIdShort}</span>
                                            {copiedId === quote._id ? (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-2.5 h-2.5 text-slate-400" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Status Pill Badge with pulse */}
                                    <div className="flex items-center gap-2">
                                        {isAccepted ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                Accepted & Finalized
                                            </span>
                                        ) : isRejected ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                                <XCircle className="w-3.5 h-3.5" />
                                                Application Declined
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                </span>
                                                {quote.status === 'reviewed' ? 'In Technical Review' : 'Under Assessment'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* ── CARD CONTENT BODY ── */}
                                <div className="p-5 sm:p-7 flex-1 flex flex-col space-y-6">
                                    {/* Service Title & Date */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {quote.serviceType} <span className="text-amber-500">Report</span>
                                            </h3>
                                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                                Created on {new Date(quote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>

                                        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                            <Layers className="w-5 h-5 text-amber-500" />
                                        </div>
                                    </div>

                                    {/* Site Coordinate Box */}
                                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                                                Registered Site Location
                                            </span>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {quote.location || 'Location details pending'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dedicated Worksite Location (GPS Map Tag) */}
                                    <WorksiteLocationCard 
                                        quote={quote} 
                                        onLocationUpdated={handleQuoteLocationUpdated}
                                        canEdit={true}
                                    />

                                    {/* ════════════════════════════════════════════════════════════════
                                        ANIMATED PROGRESS TRACKER & STEPPER TIMELINE
                                    ════════════════════════════════════════════════════════════════ */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50/80 to-slate-100/40 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-100 dark:border-slate-800/80 space-y-4">
                                        {/* Stepper Header with Completion % */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <Activity className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                                                        Live Work Tracking
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        {progress.stageLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                                isAccepted 
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' 
                                                    : isRejected
                                                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                            }`}>
                                                {progress.percentage}% Completed
                                            </span>
                                        </div>

                                        {/* Animated Shimmer Progress Bar */}
                                        <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden relative">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress.percentage}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                className={`h-full relative overflow-hidden ${
                                                    isAccepted 
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                                        : isRejected
                                                            ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                                                            : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
                                                }`}
                                            >
                                                {/* Shimmer light sweep */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]"></div>
                                            </motion.div>
                                        </div>

                                        {/* Vertical Animated Steps */}
                                        <div className="pt-2 space-y-0 relative">
                                            {/* Dynamic Connecting Line */}
                                            <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700/80 z-0"></div>

                                            {progress.steps.map((step, idx) => {
                                                const isCompleted = step.done && !step.current;
                                                const isCurrent = step.current;

                                                return (
                                                    <div key={idx} className="flex items-start gap-3.5 relative z-10 pb-5 last:pb-0">
                                                        {/* Step Node */}
                                                        <div className="shrink-0 flex items-center justify-center">
                                                            {isCompleted ? (
                                                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                                                                    <Check className="w-4 h-4 stroke-[3]" />
                                                                </div>
                                                            ) : isCurrent ? (
                                                                <div className="relative flex items-center justify-center">
                                                                    <span className={`animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-75 ${
                                                                        isRejected ? 'bg-rose-400' : 'bg-amber-400'
                                                                    }`}></span>
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-950 font-black text-xs shadow-md ${
                                                                        isRejected 
                                                                            ? 'bg-rose-500 text-white shadow-rose-500/30' 
                                                                            : 'bg-amber-400 text-slate-950 shadow-amber-500/30'
                                                                    }`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center text-xs font-bold">
                                                                    {idx + 1}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Step Details */}
                                                        <div className="min-w-0 flex-1 pt-0.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={`text-xs font-black uppercase tracking-tight ${
                                                                    isCurrent 
                                                                        ? (isRejected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white font-extrabold') 
                                                                        : isCompleted 
                                                                            ? 'text-slate-800 dark:text-slate-200' 
                                                                            : 'text-slate-400'
                                                                }`}>
                                                                    {step.label}
                                                                </span>

                                                                {isCurrent && (
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                        isRejected 
                                                                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300' 
                                                                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                                                    }`}>
                                                                        {isRejected ? 'Declined' : 'In Progress'}
                                                                    </span>
                                                                )}
                                                                {isCompleted && (
                                                                    <span className="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                                                                        Done
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[11px] leading-relaxed mt-0.5 font-medium ${
                                                                isCurrent ? 'text-slate-600 dark:text-slate-300 font-semibold' : 'text-slate-400'
                                                            }`}>
                                                                {step.sub}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── CLIENT NOTE / SCOPE OF WORK (CLEAN BOX, NO DANGLING BORDER) ── */}
                                    {quote.description && (
                                        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                                <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                                    Project Scope & Instructions
                                                </span>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                                                    {quote.description}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── CARD FOOTER: COST & ACTION BUTTONS ── */}
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                                                Finalized Quote Cost
                                            </span>
                                            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {isAccepted && quote.estimatedCost ? (
                                                    <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                                                        ₹ {Number(quote.estimatedCost).toLocaleString()}
                                                    </span>
                                                ) : isRejected ? (
                                                    <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                                                        Not Applicable
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider italic">
                                                        Awaiting Admin Finalization
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleDownload(quote)}
                                            disabled={!isAccepted}
                                            className={`px-5 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                                isAccepted
                                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-75'
                                            }`}
                                        >
                                            {isAccepted ? (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    <span>Download PDF</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>Document Locked</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                POLICY BANNER (MODERN GLASS PANEL)
            ════════════════════════════════════════════════════════════════ */}
            <div className="mt-12 sm:mt-16 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-start gap-4 relative z-10">
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-tight mb-1 text-white">
                            Institutional Document & Verification Policy
                        </h4>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-3xl">
                            Formal quotation documents and cost certifications are verified directly through Krishna Engineering Works' administrative terminal. Upon completion of technical engineering review and commercial authorization, certified PDF copies are unlocked for instant extraction.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerQuotes;