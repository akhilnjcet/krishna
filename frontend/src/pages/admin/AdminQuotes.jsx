import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { FileText, Check, X, Loader2, AlertCircle, Phone, MapPin } from 'lucide-react';

const AdminQuotes = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        setLoading(true);
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50">
            <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Sales & Estimation</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Inbound Quotes Log</h2>
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
                            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                                <div>
                                    <span className="font-black uppercase tracking-widest text-indigo-400 text-xs">ID: {quote._id.slice(-8).toUpperCase()}</span>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        Received: {new Date(quote.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    quote.status === 'new' ? 'bg-indigo-500 text-white border-indigo-400' :
                                    quote.status === 'accepted' ? 'bg-emerald-500 text-white border-emerald-400' :
                                    quote.status === 'rejected' ? 'bg-red-500 text-white border-red-400' :
                                    'bg-slate-500 text-white border-slate-400'
                                }`}>
                                    {quote.status}
                                </span>
                            </div>

                            <div className="p-8 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 mb-4">{quote.name}</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-6">
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
        </div>
    );
};

export default AdminQuotes;
