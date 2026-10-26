import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import hapticService from '../../services/hapticService';
import { 
    Wallet, Send, History, Download, Info, 
    CreditCard, Building, QrCode, CheckCircle, 
    Clock, AlertTriangle, Loader2, ArrowRight, ShieldCheck, Smartphone, X,
    Copy, CheckCircle2, AlertCircle, Sparkles, Upload, Image as ImageIcon, Building2, Check
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import UPIAppPicker from '../../components/UPIAppPicker';
import UPIFallback from '../../components/UPIFallback';
import { getSocket } from '../../utils/socket';
import { initializeCashfree } from '../../utils/cashfreeLoader';

const CustomerPayments = () => {
    const { user } = useAuthStore();
    const [payments, setPayments] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cashfreeLoading, setCashfreeLoading] = useState(false);
    const [verifyingCashfree, setVerifyingCashfree] = useState(false);
    const [cashfreeConfig, setCashfreeConfig] = useState({ enabled: true, env: 'sandbox' });
    const [copiedField, setCopiedField] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);
    
    const [formData, setFormData] = useState({
        amount: '',
        method: 'cashfree', // 'cashfree' | 'bank_transfer'
        referenceId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        name: '',
        notes: '',
        uploadedProof: ''
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

    useEffect(() => {
        // Check for return redirect from Cashfree (if user paid via redirect mode)
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const searchParams = new URLSearchParams(window.location.search || hashQuery);
        const cfOrderId = searchParams.get('cf_order_id') || searchParams.get('order_id');
        if (cfOrderId) {
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname + (window.location.hash ? window.location.hash.split('?')[0] : '');
                window.history.replaceState({}, document.title, cleanUrl);
            }
            verifyAndCompleteCashfreePayment(cfOrderId);
        }
    }, []);

    const copyToClipboard = (text, field) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setScreenshotPreview(event.target.result);
            setFormData(prev => ({ ...prev, uploadedProof: event.target.result }));
        };
        reader.readAsDataURL(file);
    };

    const fetchData = async () => {
        try {
            const [payRes, setRes, cfRes] = await Promise.all([
                api.get('/payments/my-payments'),
                api.get('/settings/public'),
                api.get('/payments/cashfree/config').catch(() => ({ data: { enabled: true, env: 'sandbox' } }))
            ]);
            setPayments(payRes.data);
            
            // Map settings array to object
            const sObj = {};
            setRes.data.forEach(s => sObj[s.key] = s.value);
            setSettings(sObj);

            if (cfRes?.data) {
                setCashfreeConfig(cfRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const verifyAndCompleteCashfreePayment = async (orderId) => {
        setVerifyingCashfree(true);
        try {
            const res = await api.post('/payments/cashfree/verify', { orderId });
            if (res.data.success) {
                hapticService.success();
                if (res.data.payment) {
                    try {
                        generatePaymentReceiptPDF(res.data.payment, user);
                    } catch (e) {
                        console.warn("Receipt generate error:", e);
                    }
                }
                fetchData();
                const vAmt = res.data.verifiedAmount || parseFloat(formData.amount) || 0;
                setFormData(prev => ({ ...prev, amount: '', notes: '', referenceId: '', uploadedProof: '' }));
                setScreenshotPreview(null);
                setPaymentResult({
                    show: true,
                    success: true,
                    amount: vAmt,
                    orderId: orderId,
                    cfPaymentId: res.data.cfPaymentId,
                    status: res.data.paymentStatus || 'PAID',
                    message: res.data.message || 'Payment successfully verified by Cashfree and recorded in your ledger.',
                    payment: res.data.payment
                });
            } else {
                setPaymentResult({
                    show: true,
                    success: false,
                    amount: parseFloat(formData.amount) || 0,
                    orderId: orderId,
                    status: res.data.orderStatus || 'INCOMPLETE',
                    message: res.data.message || `Cashfree reported status: ${res.data.orderStatus}. Payment could not be confirmed.`
                });
            }
        } catch (err) {
            console.error("Cashfree Verification Error:", err);
            setPaymentResult({
                show: true,
                success: false,
                amount: parseFloat(formData.amount) || 0,
                orderId: orderId,
                status: 'VERIFICATION_ERROR',
                message: err.response?.data?.message || err.message || 'Failed to verify Cashfree payment.'
            });
        } finally {
            setVerifyingCashfree(false);
        }
    };

    const handleCashfreePay = async (e) => {
        if (e) e.preventDefault();
        const amt = parseFloat(formData.amount);
        if (!amt || amt <= 0) {
            return alert("Please enter a valid payment amount in INR.");
        }

        setCashfreeLoading(true);
        try {
            const returnUrl = typeof window !== 'undefined'
                ? `${window.location.origin}${window.location.pathname}#/customer/payments?cf_order_id={order_id}`
                : undefined;

            // 1. Create order on backend
            const orderRes = await api.post('/payments/cashfree/create-order', {
                amount: amt,
                name: formData.name || user?.name || 'Customer',
                orderNote: formData.notes || formData.name || `Payment from ${user?.name || 'Customer'}`,
                returnUrl
            });

            const { paymentSessionId, orderId, environment } = orderRes.data;

            if (!paymentSessionId) {
                throw new Error("Payment session ID not received from Cashfree.");
            }

            // 2. Initialize official Cashfree JS SDK
            const cashfree = await initializeCashfree(environment || cashfreeConfig.env || 'production');

            // 3. Launch Checkout Modal
            cashfree.checkout({
                paymentSessionId: paymentSessionId,
                redirectTarget: "_modal"
            }).then(async (result) => {
                if (result.error) {
                    console.warn("Cashfree checkout error:", result.error);
                    setPaymentResult({
                        show: true,
                        success: false,
                        amount: amt,
                        orderId,
                        status: 'CANCELLED_OR_FAILED',
                        message: result.error.message || 'Payment cancelled or could not be completed.'
                    });
                } else if (result.paymentDetails) {
                    // Modal completed successfully, verify on backend
                    await verifyAndCompleteCashfreePayment(orderId);
                }
            });
        } catch (err) {
            console.error("Cashfree Order Initiation Error:", err);
            setPaymentResult({
                show: true,
                success: false,
                amount: amt,
                orderId: 'N/A',
                status: 'INITIATION_ERROR',
                message: err.response?.data?.message || err.message || 'Could not connect to Cashfree Gateway.'
            });
        } finally {
            setCashfreeLoading(false);
        }
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
                notes: formData.notes,
                uploadedProof: formData.uploadedProof || undefined
            });

            setFormData({ 
                amount: '', 
                method: 'bank_transfer', 
                referenceId: '', 
                paymentDate: new Date().toISOString().split('T')[0], 
                name: '', 
                notes: '',
                uploadedProof: ''
            });
            setScreenshotPreview(null);
            
            // Automatically generate and download receipt
            generatePaymentReceiptPDF(res.data, user);
            hapticService.success();
            
            setPaymentResult({
                show: true,
                success: true,
                amount: parseFloat(res.data.amount || 0),
                orderId: res.data.referenceId || res.data._id,
                status: 'WAITING_FOR_VERIFICATION',
                message: 'Payment report submitted successfully with reference details. Receipt downloaded. Awaiting admin approval.',
                payment: res.data
            });
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
                                        className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-5 rounded-2xl text-xl font-black text-blue-400 placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* 2-OPTION SELECTOR: ONLY Cashfree Gateway vs Bank Details & UPI */}
                                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'cashfree'})}
                                        className={`py-3.5 px-3 rounded-xl font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                                            formData.method === 'cashfree' 
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        <span className="uppercase tracking-wider">Cashfree Gateway</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'bank_transfer'})}
                                        className={`py-3.5 px-3 rounded-xl font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
                                            formData.method === 'bank_transfer' 
                                                ? 'bg-blue-600 text-white shadow-lg' 
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4 text-blue-300" />
                                        <span className="uppercase tracking-wider">Bank Details & UPI</span>
                                    </button>
                                </div>

                                {/* OPTION 1: CASHFREE ONLINE CHECKOUT NODE */}
                                {formData.method === 'cashfree' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5"
                                    >
                                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                                                    <ShieldCheck className="w-4 h-4" /> Official Cashfree Gateway
                                                </span>
                                                <p className="text-xs text-white/80 font-bold mt-1">Cards • UPI (GPay/PhonePe) • NetBanking • Wallets</p>
                                            </div>
                                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider">
                                                Instant Verification
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Reference / Note (Optional)</label>
                                            <input 
                                                value={formData.notes}
                                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                                className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-indigo-500 transition-all"
                                                placeholder="e.g. Project Milestone, Advance Payment"
                                            />
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={handleCashfreePay}
                                            disabled={cashfreeLoading || verifyingCashfree || !formData.amount || parseFloat(formData.amount) <= 0}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                                        >
                                            {cashfreeLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Connecting Cashfree Gateway...
                                                </>
                                            ) : verifyingCashfree ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Verifying Transaction...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Pay ₹{parseFloat(formData.amount || 0).toLocaleString()} Securely via Cashfree
                                                </>
                                            )}
                                        </button>

                                        <div className="grid grid-cols-2 gap-2 text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                                            <span className="flex items-center justify-center gap-1">🔒 256-Bit SSL Encrypted</span>
                                            <span className="flex items-center justify-center gap-1">🛡️ RBI Authorized Gateway</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* OPTION 2: DIRECT BANK DETAILS & UPI TRANSFER WITH OPTIONAL SCREENSHOT */}
                                {formData.method === 'bank_transfer' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6"
                                    >
                                        {/* Display Bank & UPI Details Card */}
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                                                        <Building2 className="w-4 h-4" /> Official Bank & UPI Details
                                                    </span>
                                                    <p className="text-xs text-white/80 font-bold mt-0.5">Transfer directly and enter UTR / Reference ID below</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQR(!showQR)}
                                                    className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-blue-500/30 transition-colors"
                                                >
                                                    {showQR ? 'Hide QR' : 'Show QR'}
                                                </button>
                                            </div>

                                            {/* QR Code Display Toggle */}
                                            {showQR && (
                                                <div className="flex flex-col items-center p-4 bg-white/10 rounded-2xl border border-white/10">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=${settings.payment_upi_id || '9447940835@okbizaxis'}&pn=${encodeURIComponent(settings.payment_payee_name || 'Krishna Engineering')}&am=${formData.amount || '0'}&cu=INR`} 
                                                        alt="UPI QR Code" 
                                                        className="w-36 h-36 rounded-xl border border-white/20 mb-2 bg-white p-2"
                                                    />
                                                    <p className="text-[10px] font-mono text-slate-300">Scan using any UPI App (GPay, PhonePe, Paytm)</p>
                                                </div>
                                            )}

                                            {/* Bank & UPI Information Rows */}
                                            <div className="space-y-2.5 text-xs">
                                                {/* UPI ID */}
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">UPI ID / VPA</span>
                                                        <span className="font-mono font-bold text-white text-xs">{settings.payment_upi_id || '9447940835@okbizaxis'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(settings.payment_upi_id || '9447940835@okbizaxis', 'upi')}
                                                        className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 hover:bg-white/20"
                                                    >
                                                        {copiedField === 'upi' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedField === 'upi' ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                </div>

                                                {/* Bank Account Number */}
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Bank Account Number</span>
                                                        <span className="font-mono font-bold text-white text-xs">{settings.payment_bank_account || '123456789012'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(settings.payment_bank_account || '123456789012', 'acc')}
                                                        className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 hover:bg-white/20"
                                                    >
                                                        {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                </div>

                                                {/* IFSC Code */}
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">IFSC Code</span>
                                                        <span className="font-mono font-bold text-white text-xs">{settings.payment_bank_ifsc || 'SBIN0001234'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(settings.payment_bank_ifsc || 'SBIN0001234', 'ifsc')}
                                                        className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 hover:bg-white/20"
                                                    >
                                                        {copiedField === 'ifsc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedField === 'ifsc' ? 'Copied' : 'Copy'}</span>
                                                    </button>
                                                </div>

                                                {/* Account Holder & Bank Name */}
                                                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400">
                                                    <div>
                                                        <span className="block font-bold">Account Holder:</span>
                                                        <span className="text-white font-medium">{settings.payment_payee_name || 'AKHIL N'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold">Bank Name:</span>
                                                        <span className="text-white font-medium">{settings.payment_bank_name || 'State Bank of India'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remittance Submission Inputs */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction ID / UTR Number *</label>
                                                <input 
                                                    required
                                                    value={formData.referenceId}
                                                    onChange={(e) => setFormData({...formData, referenceId: e.target.value})}
                                                    className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/20 outline-none focus:border-blue-500 transition-all font-mono"
                                                    placeholder="Enter 12-digit UPI Ref / Bank UTR"
                                                />
                                            </div>

                                            {/* OPTIONAL PAYMENT SCREENSHOT UPLOAD */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                        <Upload className="w-3.5 h-3.5 text-blue-400" />
                                                        Payment Screenshot
                                                    </label>
                                                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded">Optional</span>
                                                </div>
                                                
                                                {screenshotPreview ? (
                                                    <div className="relative p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                                                        <img src={screenshotPreview} alt="Payment Proof" className="w-16 h-16 object-cover rounded-xl border border-white/20" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-white truncate">Screenshot Attached</p>
                                                            <p className="text-[9px] text-slate-400">Ready for admin verification</p>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setScreenshotPreview(null); setFormData({...formData, uploadedProof: ''}); }}
                                                            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
                                                        <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                                                        <span className="text-xs font-bold text-white">Upload Payment Screenshot</span>
                                                        <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG (Optional proof)</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            onChange={handleFileUpload} 
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Name *</label>
                                                    <input 
                                                        required
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                        className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-blue-500 transition-all"
                                                        placeholder="e.g. Project Advance, Service Payment"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Date *</label>
                                                    <input 
                                                        type="date" required
                                                        value={formData.paymentDate}
                                                        onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                                                        className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Notes / Remarks</label>
                                                <textarea 
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                                    className="w-full bg-white/5 dark:bg-slate-800/30 border border-white/10 p-4 rounded-2xl text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-blue-500 transition-all"
                                                    placeholder="Enter any additional reference details..."
                                                    rows="2"
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            disabled={submitting}
                                            type="submit"
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Submit Transaction for Verification
                                        </button>
                                    </motion.div>
                                )}
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
                                            <tr key={p._id} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition-colors group">
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

            {/* VERIFICATION & SETTLEMENT RESULT MODAL */}
            {paymentResult && paymentResult.show && (
                <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                            paymentResult.success ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                        }`}>
                            {paymentResult.success ? <CheckCircle2 className="w-9 h-9" /> : <AlertCircle className="w-9 h-9" />}
                        </div>

                        <h3 className={`text-xl font-black mb-1 ${
                            paymentResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                            {paymentResult.success ? 'Payment Verified & Confirmed' : 'Payment Incomplete or Failed'}
                        </h3>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                            {paymentResult.message}
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 mb-5 text-left text-xs space-y-2.5">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold">Payment Amount:</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">₹{paymentResult.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold">Transaction Status:</span>
                                <span className={`px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase ${
                                    paymentResult.success ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                    {paymentResult.status}
                                </span>
                            </div>
                            {paymentResult.cfPaymentId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Cashfree Ref ID:</span>
                                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{paymentResult.cfPaymentId}</span>
                                </div>
                            )}
                            {paymentResult.orderId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Order / Ref ID:</span>
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{paymentResult.orderId}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {paymentResult.success && paymentResult.payment && (
                                <button
                                    type="button"
                                    onClick={() => generatePaymentReceiptPDF(paymentResult.payment, user)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                                >
                                    <Download className="w-4 h-4" /> Download Official Receipt
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPaymentResult(null)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                Dismiss & View Updated Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPayments;
