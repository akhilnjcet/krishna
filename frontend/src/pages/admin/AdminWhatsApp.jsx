import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { MessageSquare, RefreshCw, QrCode, ShieldCheck, AlertCircle, Phone, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminWhatsApp = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStatus = async () => {
        setRefreshing(true);
        try {
            const res = await api.get('/health/whatsapp');
            setStatus(res.data);
        } catch (err) {
            console.error("WhatsApp Status Failure:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">Initializing Comms Link...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-10 font-sans min-h-screen bg-[#F8FAFC]">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-slate-900 pb-8">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#25D366] text-white rounded-[1.5rem] flex items-center justify-center shadow-[6px_6px_0px_0px_#075E54] transform -rotate-2">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">WhatsApp Dispatch</h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Industrial Communication Relay System</p>
                    </div>
                </div>
                
                <button 
                    onClick={fetchStatus} 
                    disabled={refreshing}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-[4px_4px_0px_0px_#000]"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Syncing...' : 'Force System Sync'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Status Dashboard */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] p-8 shadow-[10px_10px_0px_0px_#000] relative overflow-hidden group">
                        <div className="relative z-10">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 italic">Signal Integrity</h2>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${status?.connected ? 'bg-green-50 border-green-500' : 'bg-rose-50 border-rose-500'} animate-pulse`}>
                                    {status?.connected ? <Wifi className="w-10 h-10 text-green-500" /> : <WifiOff className="w-10 h-10 text-rose-500" />}
                                </div>
                                <div>
                                    <h3 className={`text-3xl font-black uppercase tracking-tighter ${status?.connected ? 'text-green-600' : 'text-rose-600'}`}>
                                        {status?.connected ? 'ONLINE' : 'OFFLINE'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {status?.connected ? 'Relay Station Active' : 'Waiting for Pairing'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Node Phone</span>
                                    <span className="font-black text-slate-900">{status?.phone || 'N/A'}</span>
                                </div>
                                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Persistent Auth</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${status?.database?.hasCreds ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {status?.database?.hasCreds ? 'SECURED' : 'NOT FOUND'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-blue-900 text-white rounded-[2.5rem] shadow-[10px_10px_0px_0px_#1E3A8A] relative overflow-hidden">
                        <ShieldCheck className="w-20 h-20 absolute -right-6 -bottom-6 text-white/10" />
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Automated Triggers</h3>
                        <p className="text-xs font-medium text-blue-100/70 leading-relaxed mb-6">The system currently relays the following events automatically:</p>
                        <ul className="space-y-3">
                            {['Project Progress Updates', 'Staff Attendance Alerts', 'New Task Assignments', 'Security Login Alerts'].map(item => (
                                <li key={item} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* PAIRING MODULE */}
                <div className="lg:col-span-8">
                    <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-10 md:p-14 shadow-[12px_12px_0px_0px_#000] h-full flex flex-col items-center justify-center">
                        
                        <AnimatePresence mode="wait">
                            {status?.connected ? (
                                <motion.div 
                                    key="connected"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center"
                                >
                                    <div className="w-32 h-32 bg-green-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/20">
                                        <CheckCircle2 className="w-16 h-16" />
                                    </div>
                                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Transmission Ready</h2>
                                    <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                                        Your device is successfully paired. Automation logic will now relay signals through <span className="text-green-600">+{status.phone}</span>.
                                    </p>
                                    
                                    <div className="mt-12 flex gap-4 justify-center">
                                         <div className="px-6 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-pulse flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" /> Heartbeat Monitor Live
                                         </div>
                                    </div>
                                </motion.div>
                            ) : status?.qr ? (
                                <motion.div 
                                    key="qr"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center space-y-8"
                                >
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-brand-accent blur-3xl opacity-10 group-hover:opacity-20 transition-all"></div>
                                        <div className="bg-white p-8 border-4 border-slate-900 rounded-[2.5rem] shadow-[8px_8px_0px_0px_#000] relative z-10">
                                            <QrCode className="w-64 h-64 text-slate-900" />
                                            <div className="mt-6 flex flex-col items-center">
                                                <p className="p-3 bg-green-50 text-green-700 rounded-xl font-mono text-xs break-all border-2 border-green-100 max-w-xs">{status.qr}</p>
                                                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Scan via WhatsApp &gt; Linked Devices</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-amber-50 border-4 border-amber-900/10 p-6 rounded-3xl flex items-start gap-4 text-left">
                                        <AlertCircle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest mb-1">Pairing Protocol</h4>
                                            <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
                                                Keep your phone online for the first 2 minutes after pairing to sync persistent authentication data to the secure cloud node.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="waiting"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center"
                                >
                                    <Loader2 className="w-20 h-20 text-slate-200 animate-spin mx-auto mb-8" />
                                    <h2 className="text-2xl font-black uppercase text-slate-300 italic tracking-tighter">Initializing Relay...</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-4">Generating secure QR handshake</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminWhatsApp;
