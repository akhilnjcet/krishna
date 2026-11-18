import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { 
    Bot, Send, Sparkles, AlertTriangle, CheckCircle2, Clock, 
    FileText, Download, Copy, Check, ShieldCheck, RefreshCw, 
    Layers, Activity, DollarSign, Package, ChevronRight, History
} from 'lucide-react';

const SUGGESTED_QUERIES = [
    'Which projects are delayed?',
    'What is the total pending customer payment?',
    'Which machines had the highest downtime this month?',
    'Which raw materials are running low?',
    'What were this month\'s total expenses?',
    'Which production jobs are pending?',
    'Summarize this week\'s business performance.'
];

const AdminAIErpAssistant = () => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState([
        {
            sender: 'ai',
            text: `👋 **Welcome to Krishna Engineering AI ERP Assistant**!\n\nI am your intelligent industrial copilot, directly connected to live production databases, project milestones, equipment logs, and finance ledgers.\n\nYou can ask me natural-language queries about project delays, production orders, inventory shortages, machine downtime, and financial health.`,
            timestamp: new Date()
        }
    ]);
    const [inputQuery, setInputQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState(null);
    const [liveSnapshot, setLiveSnapshot] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [showAuditModal, setShowAuditModal] = useState(false);

    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendQuery = async (queryText) => {
        const query = queryText || inputQuery;
        if (!query || !query.trim() || loading) return;

        const userMsg = {
            sender: 'user',
            text: query.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputQuery('');
        setLoading(true);

        try {
            const res = await api.post('/ai-erp/query', { query: query.trim() });
            const aiReply = {
                sender: 'ai',
                text: res.data?.response || 'No insight could be derived from ERP records.',
                timestamp: new Date(res.data?.generatedAt || Date.now())
            };
            setMessages(prev => [...prev, aiReply]);
            if (res.data?.dataSnapshot) {
                setLiveSnapshot(res.data.dataSnapshot);
            }
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    sender: 'ai',
                    text: `❌ **Error**: ${err.response?.data?.message || err.message || 'Failed to query ERP databases.'}`,
                    timestamp: new Date(),
                    isError: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await api.get('/ai-erp/audit-logs');
            if (res.data?.logs) setAuditLogs(res.data.logs);
            setShowAuditModal(true);
        } catch (err) {
            console.warn('Audit logs fetch error:', err);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/30 border border-blue-400/40 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            Live ERP Ground-Truth Intelligence
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                            user?.role === 'admin' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-slate-500/30 text-slate-200'
                        }`}>
                            {user?.role === 'admin' ? '🛡️ Full Financial Clearance' : '👷 Operational Access'}
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">AI ERP Assistant & Smart Analytics</h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
                        Ask natural-language questions to analyze delayed projects, production tasks, material inventory shortages, machine downtime, and company financial health with zero hallucinations.
                    </p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        type="button"
                        onClick={fetchAuditLogs}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start md:self-auto shrink-0"
                    >
                        <History className="w-4 h-4" />
                        Query Audit Log
                    </button>
                )}
            </div>

            {/* Live ERP Snapshot Pills */}
            {liveSnapshot && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Active Projects</span>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{liveSnapshot.activeProjects}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-[10px] text-rose-500 font-bold uppercase">Delayed Projects</span>
                        <p className="text-lg font-black text-rose-600">{liveSnapshot.delayedProjects}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-[10px] text-amber-500 font-bold uppercase">Low Stock Materials</span>
                        <p className="text-lg font-black text-amber-600">{liveSnapshot.lowStockCount}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                        <span className="text-[10px] text-indigo-500 font-bold uppercase">Machinery Downtime</span>
                        <p className="text-lg font-black text-indigo-600">{liveSnapshot.downtimeHours} hrs</p>
                    </div>
                </div>
            )}

            {/* Quick Suggestion Chips */}
            <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Suggested ERP Queries:</span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {SUGGESTED_QUERIES.map((q, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendQuery(q)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 whitespace-nowrap transition shadow-2xs flex-shrink-0"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Conversation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[580px] overflow-hidden">
                {/* Message Log */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                    <Bot className="w-4 h-4" />
                                </div>
                            )}

                            <div
                                className={`rounded-2xl p-4 max-w-2xl text-xs sm:text-sm leading-relaxed ${
                                    msg.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-xs font-medium'
                                        : msg.isError
                                        ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs shadow-2xs'
                                }`}
                            >
                                <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap">
                                    {msg.text}
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] opacity-75">
                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.sender === 'ai' && !msg.isError && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(msg.text, idx)}
                                                className="hover:underline flex items-center gap-1 font-bold"
                                            >
                                                {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                {copiedIdx === idx ? 'Copied' : 'Copy Report'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3 justify-start items-center">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Bot className="w-4 h-4 animate-pulse" />
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-xs font-bold text-slate-500 flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                Analyzing ERP database records and calculating metrics...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendQuery();
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Ask any question about projects, materials, machines, or business performance..."
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            disabled={loading}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-medium outline-none text-slate-900 dark:text-white focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputQuery.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition shrink-0"
                        >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Ask AI</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* ═══════════ MODAL: AI QUERY AUDIT LOG ═══════════ */}
            {showAuditModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">AI Assistant Query Audit Log</h3>
                                <p className="text-xs text-slate-500">Security log of natural-language ERP inquiries and authorized actions</p>
                            </div>
                            <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {auditLogs.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                {auditLogs.map((log, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-900 dark:text-white">{log.user} ({log.userRole})</span>
                                            <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-300 italic font-medium">"{log.query}"</p>
                                        <span className="text-[10px] text-emerald-600 font-bold">Answered ({log.responseLength} characters)</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowAuditModal(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAIErpAssistant;
