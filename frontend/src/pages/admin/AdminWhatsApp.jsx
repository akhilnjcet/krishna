import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { MessageSquare, RefreshCw, ShieldCheck, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

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
        const interval = setInterval(fetchStatus, 4000); // Poll faster (4s) for QR updates
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs tracking-[0.3em]">Initializing Comms Link...</p>
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
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">WhatsApp Dispatch</h1>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Industrial Communication Relay System</p>
                    </div>
                </div>
                
                <button 
                    onClick={fetchStatus} 
                    disabled={refreshing}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-[4px_4px_0px_0px_#000]"
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
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Signal Integrity</h2>
                            
                            <div className="flex items-center gap-6 mb-8">
                                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center border-4 ${status?.connected ? 'bg-green-50 border-green-500' : 'bg-rose-50 border-rose-500'} transition-all duration-500`}>
                                    {status?.connected ? <Wifi className="w-10 h-10 text-green-500" /> : <WifiOff className="w-10 h-10 text-rose-500" />}
                                </div>
                                <div>
                                    <h3 className={`text-3xl font-black uppercase tracking-tighter ${status?.connected ? 'text-green-600' : 'text-rose-600'}`}>
                                        {status?.connected ? 'ONLINE' : 'OFFLINE'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {status?.connected ? 'Relay Station Active' : 'Waiting for Pairing'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Node Phone</span>
                                    <span className="font-black text-slate-900 tracking-tighter tabular-nums">{status?.phone || 'UNIDENTIFIED'}</span>
                                </div>
                                <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Persistent Auth</span>
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${status?.database?.hasCreds ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-200 text-slate-600'}`}>
                                        {status?.database?.hasCreds ? 'SECURED' : 'NOT FOUND'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-[#0F172A] text-white rounded-[2.5rem] shadow-[10px_10px_0px_0px_#1E293B] relative overflow-hidden">
                        <ShieldCheck className="w-24 h-24 absolute -right-6 -top-6 text-white/5 rotate-12" />
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Automated Triggers</h3>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed mb-6 uppercase tracking-widest">Active Relay Protocols:</p>
                        <ul className="space-y-3">
                            {['Project Progress Updates', 'Staff Attendance Alerts', 'New Task Assignments', 'Security Login Alerts'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-200">
                                    <div className="w-1.5 h-1.5 bg-[#25D366] rounded-full shadow-[0_0_8px_#25D366]" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* PAIRING MODULE */}
                <div className="lg:col-span-8">
                    <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-10 md:p-14 shadow-[12px_12px_0px_0px_#000] h-full flex flex-col items-center justify-center relative overflow-hidden">
                        
                        <AnimatePresence mode="wait">
                            {status?.connected ? (
                                <motion.div 
                                    key="connected"
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    className="text-center relative z-10"
                                >
                                    <div className="w-32 h-32 bg-[#25D366] text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_50px_rgba(37,211,102,0.3)] transform -rotate-1 hover:rotate-0 transition-transform">
                                        <CheckCircle2 className="w-16 h-16" />
                                    </div>
                                    <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 leading-none">Transmission Ready</h2>
                                    <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed text-[11px] uppercase tracking-widest">
                                        Device successfully paired. Automation logic will now relay signals through <span className="text-green-600 px-2 py-0.5 bg-green-50 rounded-lg">{status.phone}</span>.
                                    </p>
                                    
                                    <div className="mt-12 flex flex-col items-center gap-4">
                                         <div className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                            <div className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse shadow-[0_0_10px_#25D366]" /> Heartbeat Monitor Live
                                         </div>
                                    </div>
                                </motion.div>
                            ) : status?.qr ? (
                                <motion.div 
                                    key="qr"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="text-center space-y-10 relative z-10"
                                >
                                    <div className="relative group">
                                        <div className="absolute -inset-10 bg-[#25D366] blur-[50px] opacity-10 group-hover:opacity-20 transition-all duration-1000"></div>
                                        <div className="bg-white p-10 border-4 border-slate-900 rounded-[3rem] shadow-[10px_10px_0px_0px_#000] relative z-10 hover:-translate-y-2 transition-transform duration-500">
                                            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block overflow-hidden">
                                                <QRCodeSVG 
                                                    value={status.qr} 
                                                    size={220} 
                                                    bgColor="#FFFFFF"
                                                    fgColor="#0F172A"
                                                    level="H"
                                                    includeMargin={false}
                                                />
                                            </div>
                                            <div className="mt-8 flex flex-col items-center">
                                                <div className="px-5 py-2 bg-slate-50 border-2 border-slate-100 rounded-full mb-4">
                                                    <p className="font-mono text-[9px] font-black text-slate-400 break-all max-w-[240px] truncate">{status.qr}</p>
                                                </div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Scan via WhatsApp &gt; Linked Devices</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-blue-50 border-4 border-blue-900/10 p-8 rounded-[2rem] flex items-start gap-5 text-left max-w-sm mx-auto shadow-sm">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <AlertCircle className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-blue-900 uppercase text-[10px] tracking-widest mb-2 leading-none">Authentication Link</h4>
                                            <p className="text-[9px] font-bold text-blue-800 leading-relaxed uppercase tracking-wider">
                                                This QR updates every 20s. Keep your phone online during the first handshake to secure the persistent cloud session.
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
                                    <div className="relative inline-block mb-10">
                                        <div className="w-24 h-24 border-8 border-slate-100 rounded-full animate-pulse"></div>
                                        <Loader2 className="w-24 h-24 text-[#2563EB] animate-spin absolute inset-0" />
                                    </div>
                                    <h2 className="text-3xl font-black uppercase text-slate-900 italic tracking-tighter leading-none mb-4">Establishing Uplink</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Generating secure QR handshake...</p>
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
