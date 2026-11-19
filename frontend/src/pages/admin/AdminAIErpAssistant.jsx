import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { 
    Bot, Send, Sparkles, AlertTriangle, CheckCircle2, Clock, 
    FileText, Download, Copy, Check, ShieldCheck, RefreshCw, 
    Layers, Activity, DollarSign, Package, ChevronRight, History,
    Truck, X
} from 'lucide-react';

const SUGGESTED_QUERIES = [
    'How many employees are on leave today?',
    'driver',
    'Which vehicles are available?',
    'Which projects are delayed?',
    'Which materials are running low?',
    'Pending payment ethra und?',
    'Innu ethra per leave aanu?',
    'Driver details kaanikk',
    'Ethra vehicle tripil und?',
    'Which E-Way Bills are expiring?',
    'How much was spent on transport this month?',
    'What is today\'s production?',
    'Which machines are under maintenance?',
    'Summarize business performance'
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFE MARKDOWN & TABLE RENDERER
 * Formats Markdown headers, tables, lists, quotes, and bold text without raw tags.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SafeMarkdownRenderer = ({ content }) => {
    if (!content) return null;

    // Helper: Safely renders inline elements (bold, italic, code, plain text)
    // and strips any raw HTML tags (e.g. <strong style="...">, <span>, etc.)
    const renderInline = (rawText) => {
        if (!rawText) return null;

        // Strip any HTML markup so raw tags are never shown as text
        const text = rawText.replace(/<[^>]*>/g, '');

        // Tokenize for **bold** and `code`
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

        return parts.map((part, idx) => {
            if (!part) return null;
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const inner = part.slice(2, -2).trim();
                return (
                    <strong key={idx} className="font-extrabold text-slate-900 dark:text-white">
                        {inner}
                    </strong>
                );
            }
            if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                const codeInner = part.slice(1, -1);
                return (
                    <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]">
                        {codeInner}
                    </code>
                );
            }
            return part;
        });
    };

    // Parse text into logical blocks (tables, headers, blockquotes, lists, paragraphs)
    const lines = content.split('\n');
    const blocks = [];
    let currentTable = null;
    let currentList = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Table Detection
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (currentList) {
                blocks.push(currentList);
                currentList = null;
            }
            if (!currentTable) {
                currentTable = { type: 'table', rows: [] };
            }
            currentTable.rows.push(trimmed);
            continue;
        } else if (currentTable) {
            blocks.push(currentTable);
            currentTable = null;
        }

        // 2. Empty line
        if (!trimmed) {
            if (currentList) {
                blocks.push(currentList);
                currentList = null;
            }
            continue;
        }

        // 3. Headings (###, ##, #)
        if (/^#{1,4}\s+/.test(trimmed)) {
            if (currentList) {
                blocks.push(currentList);
                currentList = null;
            }
            const level = trimmed.match(/^#+/)[0].length;
            const headingText = trimmed.replace(/^#+\s*/, '').trim();
            blocks.push({ type: 'heading', level, text: headingText });
            continue;
        }

        // 4. Blockquotes (> ...)
        if (trimmed.startsWith('>')) {
            if (currentList) {
                blocks.push(currentList);
                currentList = null;
            }
            const quoteText = trimmed.replace(/^>\s*/, '').trim();
            blocks.push({ type: 'blockquote', text: quoteText });
            continue;
        }

        // 5. Unordered List Items (- , * , • )
        if (/^[\*\-\•]\s+/.test(trimmed)) {
            const itemText = trimmed.replace(/^[\*\-\•]\s+/, '').trim();
            if (!currentList || currentList.subtype !== 'bullet') {
                if (currentList) blocks.push(currentList);
                currentList = { type: 'list', subtype: 'bullet', items: [] };
            }
            currentList.items.push(itemText);
            continue;
        }

        // 6. Ordered List Items (1. , 2. )
        if (/^\d+\.\s+/.test(trimmed)) {
            const num = trimmed.match(/^\d+/)[0];
            const itemText = trimmed.replace(/^\d+\.\s+/, '').trim();
            if (!currentList || currentList.subtype !== 'number') {
                if (currentList) blocks.push(currentList);
                currentList = { type: 'list', subtype: 'number', items: [] };
            }
            currentList.items.push({ num, text: itemText });
            continue;
        }

        // 7. Regular Paragraph
        if (currentList) {
            blocks.push(currentList);
            currentList = null;
        }
        blocks.push({ type: 'paragraph', text: trimmed });
    }

    if (currentTable) blocks.push(currentTable);
    if (currentList) blocks.push(currentList);

    return (
        <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
            {blocks.map((block, bIdx) => {
                // Render Headings
                if (block.type === 'heading') {
                    if (block.level === 1) {
                        return (
                            <h2 key={bIdx} className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-3 pb-1 border-b border-slate-200 dark:border-slate-700">
                                {renderInline(block.text)}
                            </h2>
                        );
                    }
                    if (block.level === 2) {
                        return (
                            <h3 key={bIdx} className="font-black text-sm sm:text-base text-slate-900 dark:text-white mt-3 pb-1 border-b border-slate-200 dark:border-slate-700">
                                {renderInline(block.text)}
                            </h3>
                        );
                    }
                    return (
                        <h4 key={bIdx} className="font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-2.5 pt-0.5">
                            {renderInline(block.text)}
                        </h4>
                    );
                }

                // Render Table
                if (block.type === 'table') {
                    const rawRows = block.rows.filter(r => !r.includes('---')); // filter separator row
                    if (rawRows.length === 0) return null;

                    const headerRow = rawRows[0]
                        .split('|')
                        .map(c => c.trim())
                        .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);

                    const dataRows = rawRows.slice(1).map(rowStr => 
                        rowStr
                            .split('|')
                            .map(c => c.trim())
                            .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1)
                    );

                    return (
                        <div key={bIdx} className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 shadow-2xs">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {headerRow.map((h, i) => (
                                            <th key={i} className="px-3 py-2">
                                                {renderInline(h)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {dataRows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-3 py-2 font-medium">
                                                    {renderInline(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                // Render Blockquote / Tip Callout
                if (block.type === 'blockquote') {
                    return (
                        <div key={bIdx} className="my-2.5 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-500 text-xs text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
                            {renderInline(block.text)}
                        </div>
                    );
                }

                // Render Lists
                if (block.type === 'list') {
                    if (block.subtype === 'number') {
                        return (
                            <ol key={bIdx} className="space-y-1.5 my-1.5 pl-1">
                                {block.items.map((it, idx) => (
                                    <li key={idx} className="flex items-start gap-2 py-0.5">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-xs">
                                            {it.num}.
                                        </span>
                                        <span className="flex-1">{renderInline(it.text)}</span>
                                    </li>
                                ))}
                            </ol>
                        );
                    }
                    return (
                        <ul key={bIdx} className="space-y-1 my-1 pl-1">
                            {block.items.map((it, idx) => (
                                <li key={idx} className="flex items-start gap-2 py-0.5">
                                    <span className="text-indigo-500 dark:text-indigo-400 font-black mt-0.5 text-xs shrink-0">•</span>
                                    <span className="flex-1">{renderInline(it)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                // Render Paragraph
                return (
                    <p key={bIdx} className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {renderInline(block.text)}
                    </p>
                );
            })}
        </div>
    );
};

const AdminAIErpAssistant = () => {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            sender: 'ai',
            text: `👋 **Welcome to Krishna Engineering AI ERP Copilot**!\n\nI am your intelligent industrial copilot, directly connected to live production databases, project milestones, equipment logs, fleet transport, and finance ledgers.\n\nYou can ask me natural-language queries about:\n- **Delayed Projects & Progress**\n- **Material Inventory Shortages**\n- **My Vehicle Details & Fleet Status**\n- **Production Job Orders**\n- **Machine Downtime Analytics**\n- **Financial Health & Receivables** *(Admin)*`,
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
    }, [messages, loading]);

    const handleSendQuery = async (queryText) => {
        const query = (queryText || inputQuery || '').trim();
        if (!query || loading) return;

        const userMsg = {
            id: Date.now().toString(),
            sender: 'user',
            text: query,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputQuery('');
        setLoading(true);

        const historyPayload = messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }));

        try {
            const res = await api.post('/ai-erp/query', { 
                query,
                conversationHistory: historyPayload
            });
            const aiReply = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: res.data?.response || 'No information could be derived from live ERP records.',
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
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: `❌ **Error**: ${err.response?.data?.message || err.message || 'Failed to query live ERP databases.'}`,
                    timestamp: new Date(),
                    isError: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, idx) => {
        // Strip markdown before copying clean text to clipboard
        const cleanText = text
            .replace(/###\s+/g, '')
            .replace(/##\s+/g, '')
            .replace(/#\s+/g, '')
            .replace(/\*\*/g, '')
            .replace(/<[^>]*>/g, '');
        navigator.clipboard.writeText(cleanText);
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
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">AI ERP Copilot & Smart Assistant</h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
                        Natural-language queries directly grounded in live MongoDB records for delayed projects, raw material shortages, assigned vehicles, machinery downtime, and financial health.
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
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Active Projects</span>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{liveSnapshot.activeProjects ?? 0}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
                        <span className="text-[10px] text-rose-500 font-bold uppercase">Delayed Projects</span>
                        <p className="text-lg font-black text-rose-600">{liveSnapshot.delayedProjects ?? 0}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
                        <span className="text-[10px] text-amber-500 font-bold uppercase">Low Stock Materials</span>
                        <p className="text-lg font-black text-amber-600">{liveSnapshot.lowStockCount ?? 0}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
                        <span className="text-[10px] text-indigo-500 font-bold uppercase">Fleet Vehicles</span>
                        <p className="text-lg font-black text-indigo-600">{liveSnapshot.totalVehicles ?? 0}</p>
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
                            disabled={loading}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 whitespace-nowrap transition shadow-2xs flex-shrink-0 disabled:opacity-50"
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
                            key={msg.id || idx}
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
                                {msg.sender === 'user' ? (
                                    <div className="font-medium whitespace-pre-wrap">{msg.text}</div>
                                ) : (
                                    <SafeMarkdownRenderer content={msg.text} />
                                )}

                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] opacity-75">
                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.sender === 'ai' && !msg.isError && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(msg.text, idx)}
                                                className="hover:underline flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                                            >
                                                {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                {copiedIdx === idx ? 'Copied' : 'Copy'}
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
                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-xs font-bold text-slate-500 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                Querying live ERP databases and computing metrics...
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
                            placeholder="Ask any question about project delays, inventory shortages, my vehicle details, or machine downtime..."
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            disabled={loading}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm font-medium outline-none text-slate-900 dark:text-white focus:border-indigo-500 disabled:opacity-50"
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
                                <h3 className="text-base font-black text-slate-900 dark:text-white">AI Copilot Query Audit Log</h3>
                                <p className="text-xs text-slate-500">Security log of natural-language ERP inquiries and authorized actions</p>
                            </div>
                            <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
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
