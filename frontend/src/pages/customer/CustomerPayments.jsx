import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import hapticService from '../../services/hapticService';
import { 
    Wallet, Send, History, Download, Info, 
    CreditCard, Building, QrCode, CheckCircle, 
    Clock, AlertTriangle, Loader2, ArrowRight, ShieldCheck, Smartphone, X
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import UPIAppPicker from '../../components/UPIAppPicker';
import UPIFallback from '../../components/UPIFallback';
import { getSocket } from '../../utils/socket';

const CustomerPayments = () => {
    const { user } = useAuthStore();
    const [payments, setPayments] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        amount: '',
        method: 'upi',
        referenceId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        name: '',
        notes: ''
    });

    const [showPicker, setShowPicker] = useState(false);
    const [showFallback, setShowFallback] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);

    const addLog = (msg) => {
        console.log(`[UPI DEBUG] ${msg}`);
        setDebugLogs(prev => [...prev.slice(-4), `> ${msg}`]);
    };

    useEffect(() => {
        fetchData();

        const socket = getSocket();
        socket.connect();
        
        const userId = user?._id || user?.id;
        if (userId) {
            socket.emit('join-room', userId);
        }

        socket.on('payment-status-changed', (updatedPayment) => {
            setPayments(prev => {
                const exists = prev.some(p => p._id === updatedPayment._id);
                if (exists) {
                    return prev.map(p => p._id === updatedPayment._id ? updatedPayment : p);
                } else {
                    return [updatedPayment, ...prev];
                }
            });
            fetchData();
        });

        return () => {
            socket.off('payment-status-changed');
            socket.disconnect();
        };
    }, [user]);

    const fetchData = async () => {
        try {
            const [payRes, setRes] = await Promise.all([
                api.get('/payments/my-payments'),
                api.get('/settings/public')
            ]);
            setPayments(payRes.data);
            
            // Map settings array to object
            const sObj = {};
            setRes.data.forEach(s => sObj[s.key] = s.value);
            setSettings(sObj);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        // Removed proof screenshot handling
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert("Please enter payment name.");
        if (!formData.amount || parseFloat(formData.amount) <= 0) return alert("Please enter a valid amount.");
        if (!formData.referenceId) return alert("Please enter Transaction ID/UTR Number.");
        if (!formData.paymentDate) return alert("Please select a Payment Date.");
        if (!formData.notes) return alert("Please enter payment details.");
        
        setSubmitting(true);
        try {
            const res = await api.post('/payments/submit', {
                amount: parseFloat(formData.amount),
                method: formData.method,
                referenceId: formData.referenceId,
                paymentDate: formData.paymentDate,
                name: formData.name,
                notes: formData.notes
            });

            setFormData({ 
                amount: '', 
                method: 'upi', 
                referenceId: '', 
                paymentDate: new Date().toISOString().split('T')[0], 
                name: '', 
                notes: '' 
            });
            
            // Automatically generate and download receipt
            generatePaymentReceiptPDF(res.data, user);
            hapticService.success();
            
            alert("Payment Acknowledgement Submitted. Receipt Downloaded. Awaiting Admin Verification.");
            fetchData();
        } catch (err) {
            console.error("Payment Submission Error:", err);
            hapticService.error();
            alert("Submission error: " + (err.response?.data?.message || "Connection interrupted."));
        } finally {
            setSubmitting(false);
        }
    };

    const upiData = {
        pa: settings.payment_upi_id,
        pn: settings.payment_payee_name || "AKHIL N",
        am: formData.amount || '0',
        tn: `CRP-${user?.id?.slice(-4)}`,
        tr: `tr-${Date.now()}`
    };

    const handlePayInitiate = () => {
        if (!upiData.pa || !upiData.am || parseFloat(upiData.am) <= 0) {
            return alert("Validated parameters required. Enter amount.");
        }
        hapticService.light();
        addLog(`Initiating payment for ${upiData.am} INR`);
        setShowPicker(true);
    };

    if (loading) return (
        <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Financial Terminal...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
            <div className="flex flex-col mb-10 border-l-8 border-blue-600 pl-6 md:pl-8">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2 italic">Official Ledger Interface</div>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Payments & <span className="text-slate-400 font-light">Transfers</span></h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Payment Gateway Form */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                    <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <Send className="text-blue-400" /> Remittance Node
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction Amount (INR)</label>
                                    <input 
                                        type="number" required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        className="w-full bg-white dark:bg-slate-900/5 border border-white/10 p-5 rounded-2xl text-xl font-black text-blue-400 placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'upi'})}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.method === 'upi' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white dark:bg-slate-900/5 border-white/10 text-slate-400 hover:bg-white dark:bg-slate-900/10'}`}
                                    >
                                        <QrCode className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">UPI Portal</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'bank_transfer'})}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.method === 'bank_transfer' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white dark:bg-slate-900/5 border-white/10 text-slate-400 hover:bg-white dark:bg-slate-900/10'}`}
                                    >
                                        <Building className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Bank Node</span>
                                    </button>
                                </div>

                                {/* TARGETED INTENT HUB v3.0 - High Resilience */}
                                {formData.method === 'upi' && formData.amount > 0 && (
                                    <div className="space-y-6">
                                        {!showFallback ? (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-b-[8px] border-blue-600 shadow-2xl space-y-8"
                                            >
                                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6 text-slate-900 dark:text-white">
                                                    <div className="w-14 h-14 bg-blue-50 rounded-[1.5rem] flex items-center justify-center">
                                                        <Smartphone className="w-7 h-7 text-blue-600" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Recipient</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{upiData.pn}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <button 
                                                        type="button"
                                                        onClick={handlePayInitiate}
                                                        className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                                                    >
                                                        <Send className="w-4 h-4 text-blue-400" /> Open UPI Apps
                                                    </button>
                                                    
                                                    <div className="flex items-center justify-center gap-4">
                                                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 flex-1" />
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                                                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 flex-1" />
                                                    </div>

                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            hapticService.light();
                                                            setShowFallback(true);
                                                        }}
                                                        className="w-full py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 dark:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <QrCode className="w-4 h-4" /> Show Static QR
                                                    </button>
                                                </div>

                                                {/* Debug Log Trace */}
                                                {debugLogs.length > 0 && (
                                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[8px] text-slate-400">
                                                        {debugLogs.map((log, i) => (
                                                            <div key={i}>{log}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <UPIFallback upiData={upiData} />
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Name</label>
                                        <input 
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-900/5 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                            placeholder="e.g. Initial Deposit, Weld Phase 2"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction ID / UTR Number</label>
                                            <input 
                                                required
                                                value={formData.referenceId}
                                                onChange={(e) => setFormData({...formData, referenceId: e.target.value})}
                                                className="w-full bg-white dark:bg-slate-900/5 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                                placeholder="Enter UPI Ref / Bank UTR"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Date</label>
                                            <input 
                                                type="date" required
                                                value={formData.paymentDate}
                                                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                                                className="w-full bg-white dark:bg-slate-900/5 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Details</label>
                                        <textarea 
                                            required
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-900/5 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                            placeholder="Enter reference details or description..."
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                <button 
                                    disabled={submitting}
                                    type="submit"
                                    className="w-full py-5 bg-blue-600 hover:bg-white dark:bg-slate-900 hover:text-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit Transaction Node
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* Channel Intel */}
                    <div className="bg-white dark:bg-slate-900 border-4 border-slate-900 p-8 shadow-solid">
                        <h4 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" /> Authorized Channels
                        </h4>
                        
                        <div className="space-y-6">
                            {settings.payment_upi_id && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Integrated UPI Address</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{settings.payment_upi_id}</p>
                                </div>
                            )}
                            
                            {settings.payment_bank_name && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Corporate Bank Details</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{settings.payment_bank_name}</p>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">ACC: {settings.payment_bank_account}</p>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">IFSC: {settings.payment_bank_ifsc}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment History Table */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 italic">
                             <History className="text-blue-600" /> Transaction Audit Log
                        </h3>
                        {payments.length > 0 && (
                             <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-full">
                                {payments.length} Total Logs
                             </span>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-2 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-5">Verified ID</th>
                                        <th className="px-6 py-5">Payment / Details</th>
                                        <th className="px-6 py-5">Amt / Method</th>
                                        <th className="px-6 py-5 text-center">Status</th>
                                        <th className="px-6 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center">
                                                <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No financial history logged.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((p) => (
                                            <tr key={p._id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-6">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">#{p._id.slice(-8).toUpperCase()}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                                                    {p.paymentDate && (
                                                        <p className="text-[8px] font-semibold text-indigo-500 mt-0.5">Paid On: {new Date(p.paymentDate).toLocaleDateString()}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{p.name || 'General Payment'}</p>
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate max-w-xs">{p.notes || '—'}</p>
                                                    
                                                    {/* Payment Status Message / Reason */}
                                                    {(p.status === 'Waiting for Verification' || p.status === 'pending') && (
                                                        <p className="text-[9px] font-bold text-amber-600 mt-1.5 uppercase tracking-wider">
                                                            Your payment is awaiting admin verification.
                                                        </p>
                                                    )}
                                                    {(p.status === 'Failed' || p.status === 'rejected') && (
                                                        <p className="text-[9px] font-bold text-rose-500 mt-1.5 uppercase tracking-wider">
                                                            Your payment verification was rejected{p.rejectionReason ? `: ${p.rejectionReason}` : ''}
                                                        </p>
                                                    )}
                                                    {(p.status === 'Completed' || p.status === 'verified') && (
                                                        <p className="text-[9px] font-bold text-emerald-600 mt-1.5 uppercase tracking-wider">
                                                            Your payment has been verified and completed successfully{p.verifiedByName ? ` by ${p.verifiedByName}` : ''}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white italic">₹ {p.amount?.toLocaleString()}</p>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{p.method}</p>
                                                    {p.referenceId && (
                                                        <p className="text-[8px] font-semibold text-slate-400 mt-0.5">UTR: {p.referenceId}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                            p.status === 'Completed' || p.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                            p.status === 'Failed' || p.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                                        }`}>
                                                            {(p.status === 'Completed' || p.status === 'verified') ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : 
                                                             (p.status === 'Failed' || p.status === 'rejected') ? <X className="w-3 h-3 text-rose-500" /> : 
                                                             <Clock className="w-3 h-3 text-amber-500" />}
                                                            {p.status === 'verified' ? 'Completed' : (p.status === 'rejected' ? 'Failed' : p.status)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <button 
                                                        disabled={p.status !== 'Completed' && p.status !== 'verified'}
                                                        onClick={() => generatePaymentReceiptPDF(p, user)}
                                                        className={`p-3 rounded-xl border transition-all ${p.status === 'Completed' || p.status === 'verified' ? 'border-slate-200 dark:border-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm' : 'opacity-20 cursor-not-allowed'}`}
                                                        title="Extract Official Receipt"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <UPIAppPicker 
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                upiData={upiData}
                onFallbackTriggered={() => {
                    setShowPicker(false);
                    setShowFallback(true);
                    addLog("Switched to fallback manual flow");
                }}
            />
        </div>
    );
};

export default CustomerPayments;
