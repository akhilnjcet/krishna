import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
    FileText, Check, X, Loader2, AlertCircle, Phone, MapPin, 
    Trash2, Edit, Save, Terminal, ShieldAlert, Download 
} from 'lucide-react';
import { generateQuotePDF } from '../../services/pdfService';

const AdminQuotes = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingQuote, setEditingQuote] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await api.get('/quotes');
            setQuotes(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.put(`/quotes/${id}`, { status: newStatus });
            fetchQuotes();
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("CRITICAL: Permanent Deletion requested. Proceed?")) return;
        try {
            await api.delete(`/quotes/${id}`);
            fetchQuotes();
        } catch (err) {
            alert("Deletion failure: Record is currently locked by system.");
        }
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/quotes/${editingQuote._id}`, editingQuote);
            setEditingQuote(null);
            fetchQuotes();
        } catch (err) {
            alert("Edit failure: Database refused synchronization.");
        } finally {
            setSaving(false);
        }
    };

    const editField = (key, val) => {
        setEditingQuote(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Sales & Estimation</div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Inbound Quotes Log</h2>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Scanning Quote Database</p>
                </div>
            ) : quotes.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] text-center border border-slate-200">
                     <FileText className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                     <p className="text-slate-400 font-bold uppercase tracking-widest">No quote requests recorded.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {quotes.map((quote, i) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={quote._id}
                            className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col hover:border-indigo-200 transition-all group"
                        >
                            <div className="bg-slate-900 text-white p-6 flex justify-between items-center relative overflow-hidden">
                                {/* Grid texture */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                                
                                <div className="relative z-10">
                                    <span className="font-black uppercase tracking-widest text-indigo-400 text-[10px]">ID: {quote._id.slice(-8).toUpperCase()}</span>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        Received: {new Date(quote.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    <button 
                                        onClick={() => setEditingQuote(quote)}
                                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-400/20"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(quote._id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <span className={`ml-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                        quote.status === 'new' ? 'bg-indigo-500 text-white border-indigo-400' :
                                        quote.status === 'accepted' ? 'bg-emerald-500 text-white border-emerald-400' :
                                        quote.status === 'rejected' ? 'bg-red-500 text-white border-red-400' :
                                        'bg-slate-500 text-white border-slate-400'
                                    }`}>
                                        {quote.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-8 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 mb-4">{quote.name}</h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Contact Details</div>
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><Phone className="w-3 h-3"/> {quote.phone}</span>
                                                <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><MapPin className="w-3 h-3"/> {quote.location}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Service Type</div>
                                            <div className="font-black text-slate-900 uppercase">{quote.serviceType}</div>
                                        </div>
                                    </div>

                                    <div className="mb-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
                                            Description Override
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 line-clamp-2">{quote.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                        <div className="text-sm font-black text-slate-500 uppercase tracking-widest">Base Estimate</div>
                                        <div className="text-3xl font-black text-indigo-600">₹ {quote.estimatedCost?.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {(quote.status === 'new' || quote.status === 'reviewed') && (
                                        <>
                                            <button 
                                                onClick={() => handleUpdateStatus(quote._id, 'accepted')}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-4 h-4" /> Accept
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateStatus(quote._id, 'rejected')}
                                                className="flex-1 bg-white hover:bg-red-50 text-red-600 font-black uppercase tracking-widest text-xs py-4 rounded-2xl border-2 border-red-100 transition flex items-center justify-center gap-2"
                                            >
                                                <X className="w-4 h-4" /> Reject
                                            </button>
                                        </>
                                    )}
                                    {quote.status === 'accepted' && (
                                        <button 
                                            onClick={() => generateQuotePDF(quote)}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Download Quote
                                        </button>
                                    )}
                                    {quote.status === 'new' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(quote._id, 'reviewed')}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition"
                                        >
                                            Mark Reviewed
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {editingQuote && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden"
                        >
                            <div className="bg-slate-900 p-8 flex justify-between items-center border-b-4 border-indigo-500">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                                        <Terminal className="text-indigo-400" /> Override Protocol
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refining Inbound Data Log</p>
                                </div>
                                <button onClick={() => setEditingQuote(null)} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSave} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Identifier</label>
                                        <input 
                                            value={editingQuote.name}
                                            onChange={(e) => editField('name', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Frequency</label>
                                        <input 
                                            value={editingQuote.phone}
                                            onChange={(e) => editField('phone', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Site Coordinates (Location)</label>
                                        <input 
                                            value={editingQuote.location}
                                            onChange={(e) => editField('location', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Category</label>
                                        <select 
                                            value={editingQuote.serviceType}
                                            onChange={(e) => editField('serviceType', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none uppercase"
                                        >
                                            <option value="welding">Welding Service</option>
                                            <option value="roofing">Metal Roofing</option>
                                            <option value="truss">Truss Assembly</option>
                                            <option value="fabrication">Fabrication</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operation Specifications</label>
                                    <textarea 
                                        rows={4}
                                        value={editingQuote.description}
                                        onChange={(e) => editField('description', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                    />
                                </div>

                                <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-indigo-600">
                                        <ShieldAlert className="w-6 h-6" />
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest">Pricing Index</h4>
                                            <p className="text-[10px] font-bold opacity-60">Manual Cost Override</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-black text-indigo-600">₹</span>
                                        <input 
                                            type="number"
                                            value={editingQuote.estimatedCost}
                                            onChange={(e) => editField('estimatedCost', parseFloat(e.target.value))}
                                            className="w-32 bg-white border border-indigo-200 p-3 rounded-xl font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-xs py-6 rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Synchronizing Database...' : 'Finalize Specification Override'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminQuotes;
