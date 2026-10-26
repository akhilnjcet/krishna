import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import hapticService from '../../services/hapticService';
import { 
    Wallet, Send, History, Download, Info, 
    CreditCard, Building2, QrCode, CheckCircle, 
    Clock, AlertTriangle, Loader2, ArrowRight, ShieldCheck, Smartphone, X,
    Copy, CheckCircle2, AlertCircle, Sparkles, Upload, Image as ImageIcon, Check,
    Lock, HelpCircle, ChevronRight, FileText, ExternalLink, RefreshCw, Search
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import UPIAppPicker from '../../components/UPIAppPicker';
import UPIFallback from '../../components/UPIFallback';
import { getSocket } from '../../utils/socket';
import { initializeCashfree } from '../../utils/cashfreeLoader';

// Cashfree Geometric SVG Logo
const CashfreeLogo = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="#10B981" fillOpacity="0.1" />
        <path d="M12 14H24C26.2091 14 28 15.7909 28 18V18C28 20.2091 26.2091 22 24 22H16" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 22V28" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 28H22" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// UPI Styled Geometric SVG Icon
const UpiIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#F8FAFC" />
        <path d="M16 6L24 16H8L16 6Z" fill="#F97316" />
        <path d="M16 26L8 16H24L16 26Z" fill="#10B981" />
        <circle cx="16" cy="16" r="3" fill="#1E40AF" />
    </svg>
);

// Card Scheme Badges (Visa, Mastercard, RuPay, UPI)
const PaymentMethodLogos = () => (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Visa */}
        <div className="h-6 px-2 bg-white rounded border border-slate-200/80 flex items-center justify-center shadow-2xs">
            <span className="font-black italic text-[11px] text-[#1A1F71] tracking-tight">VISA</span>
        </div>
        {/* Mastercard */}
        <div className="h-6 px-2 bg-white rounded border border-slate-200/80 flex items-center justify-center shadow-2xs">
            <div className="flex items-center -space-x-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-90" />
            </div>
        </div>
        {/* RuPay */}
        <div className="h-6 px-2 bg-white rounded border border-slate-200/80 flex items-center justify-center shadow-2xs">
            <span className="font-black italic text-[10px] text-[#097938] tracking-tighter">
                Ru<span className="text-[#005CA8]">Pay</span>
            </span>
        </div>
        {/* UPI */}
        <div className="h-6 px-2 bg-white rounded border border-slate-200/80 flex items-center justify-center shadow-2xs">
            <span className="font-black text-[10px] text-[#2563EB] tracking-tighter flex items-center gap-0.5">
                <span className="text-emerald-600">UPI</span>
            </span>
        </div>
    </div>
);

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];

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
    const [viewAllModal, setViewAllModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Payment form state: 'cashfree' | 'upi' | 'bank_transfer'
    const [formData, setFormData] = useState({
        amount: '',
        method: 'cashfree',
        referenceId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        name: '',
        notes: '',
        uploadedProof: ''
    });

    const [showPicker, setShowPicker] = useState(false);
    const [showFallback, setShowFallback] = useState(false);

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
        hapticService.light();
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
            
            const sObj = {};
            setRes.data.forEach(s => sObj[s.key] = s.value);
            setSettings(sObj);

            if (cfRes?.data) {
                setCashfreeConfig(cfRes.data);
            }
        } catch (err) {
            console.error("Payment load error:", err);
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

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        const amt = parseFloat(formData.amount);
        if (!amt || amt <= 0) return alert("Please enter a valid amount.");
        if (!formData.referenceId) return alert("Please enter Transaction ID / UTR Number.");
        
        setSubmitting(true);
        try {
            const res = await api.post('/payments/submit', {
                amount: amt,
                method: formData.method === 'upi' ? 'upi' : 'bank_transfer',
                referenceId: formData.referenceId,
                paymentDate: formData.paymentDate || new Date().toISOString().split('T')[0],
                name: formData.name || (formData.method === 'upi' ? 'UPI Remittance' : 'Bank Remittance'),
                notes: formData.notes || (formData.method === 'upi' ? 'UPI Transfer' : 'Direct Bank Transfer'),
                uploadedProof: formData.uploadedProof || undefined
            });

            setFormData({ 
                amount: '', 
                method: formData.method, 
                referenceId: '', 
                paymentDate: new Date().toISOString().split('T')[0], 
                name: '', 
                notes: '',
                uploadedProof: ''
            });
            setScreenshotPreview(null);
            
            generatePaymentReceiptPDF(res.data, user);
            hapticService.success();
            
            setPaymentResult({
                show: true,
                success: true,
                amount: parseFloat(res.data.amount || 0),
                orderId: res.data.referenceId || res.data._id,
                status: 'WAITING_FOR_VERIFICATION',
                message: 'Payment report submitted successfully. Awaiting admin verification. Receipt downloaded.',
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
        pa: settings.payment_upi_id || "9447940835@okbizaxis",
        pn: settings.payment_payee_name || "Krishna Engineering Works",
        am: formData.amount || '0',
        tn: `CRP-${user?.id?.slice(-4) || 'KEW'}`,
        tr: `tr-${Date.now()}`
    };

    const handleQuickAmount = (val) => {
        hapticService.light();
        setFormData(prev => ({ ...prev, amount: val.toString() }));
    };

    // Format transaction date & time
    const formatDateTime = (dateStr) => {
        if (!dateStr) return { date: '—', time: '—' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: dateStr, time: '' };
        const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return { date, time };
    };

    // Filter transactions for View All Modal
    const filteredPayments = payments.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            p._id?.toLowerCase().includes(q) ||
            p.referenceId?.toLowerCase().includes(q) ||
            p.name?.toLowerCase().includes(q) ||
            p.status?.toLowerCase().includes(q) ||
            p.amount?.toString().includes(q)
        );
    });

    // Recent 8 payments for dashboard table
    const recentPayments = payments.slice(0, 8);

    if (loading) {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-semibold text-xs tracking-wider">Loading Financial Terminal...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1360px] mx-auto space-y-6 font-sans">
            {/* Top Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Link to="/customer" className="hover:text-blue-600 transition-colors">Home</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Payments</span>
            </div>

            {/* Header Banner Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs border border-blue-100/60 dark:border-blue-900/40 shrink-0">
                        <CreditCard className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Payments & Transfers
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
                            Manage project payments and track every transaction securely.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 px-4 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200">Need Help?</p>
                        <p className="text-[11px] text-slate-400">For payment related queries</p>
                        <Link to="/customer/support" className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-0.5">
                            Contact Support <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ── LEFT COLUMN: Make a Payment Card ── */}
                <div className="lg:col-span-7">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-6">
                        
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                Make a Payment
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Enter the amount and choose a payment method
                            </p>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Amount to Pay (INR)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-xl font-bold text-slate-400 dark:text-slate-500">₹</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full pl-9 pr-4 py-3.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-lg sm:text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                                {QUICK_AMOUNTS.map((amt) => {
                                    const isSelected = parseFloat(formData.amount) === amt;
                                    return (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => handleQuickAmount(amt)}
                                            className={`min-h-[44px] py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer text-center flex items-center justify-center ${
                                                isSelected 
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500 shadow-2xs' 
                                                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            ₹{amt.toLocaleString()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Select Payment Method */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Select Payment Method
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                
                                {/* 1. Cashfree Gateway Card */}
                                <div
                                    onClick={() => setFormData({ ...formData, method: 'cashfree' })}
                                    className={`relative p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                                        formData.method === 'cashfree'
                                            ? 'border-2 border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-2xs'
                                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                            formData.method === 'cashfree' ? 'border-blue-600' : 'border-slate-300'
                                        }`}>
                                            {formData.method === 'cashfree' && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>
                                        <CashfreeLogo className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                            Cashfree Gateway
                                        </p>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Cards • UPI • Net Banking Wallets
                                        </p>
                                    </div>
                                </div>

                                {/* 2. UPI Payment Card */}
                                <div
                                    onClick={() => setFormData({ ...formData, method: 'upi' })}
                                    className={`relative p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                                        formData.method === 'upi'
                                            ? 'border-2 border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-2xs'
                                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                            formData.method === 'upi' ? 'border-blue-600' : 'border-slate-300'
                                        }`}>
                                            {formData.method === 'upi' && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>
                                        <UpiIcon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                            UPI Payment
                                        </p>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Pay using any UPI app
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Bank Transfer Card */}
                                <div
                                    onClick={() => setFormData({ ...formData, method: 'bank_transfer' })}
                                    className={`relative p-4 rounded-xl cursor-pointer border transition-all flex flex-col justify-between ${
                                        formData.method === 'bank_transfer'
                                            ? 'border-2 border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-2xs'
                                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                            formData.method === 'bank_transfer' ? 'border-blue-600' : 'border-slate-300'
                                        }`}>
                                            {formData.method === 'bank_transfer' && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                            Bank Transfer
                                        </p>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Direct Bank Transfer (NEFT/IMPS)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── METHOD 1: CASHFREE GATEWAY BANNER ── */}
                        {formData.method === 'cashfree' && (
                            <div className="bg-[#ECFDF5]/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <CashfreeLogo className="w-9 h-9 shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                Cashfree Payments
                                            </span>
                                            <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/50">
                                                Official Partner
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            Secure online payments <span className="hidden sm:inline">•</span> Cards • UPI • Net Banking • Wallets
                                        </p>
                                    </div>
                                </div>

                                <PaymentMethodLogos />
                            </div>
                        )}

                        {/* ── METHOD 2: MANUAL UPI DETAILS ── */}
                        {formData.method === 'upi' && (
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Integrated UPI Receiver
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Pay directly via any UPI app or scan the QR code
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowQR(!showQR)}
                                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        <QrCode className="w-3.5 h-3.5" />
                                        {showQR ? 'Hide QR' : 'Show QR'}
                                    </button>
                                </div>

                                {showQR && (
                                    <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=${settings.payment_upi_id || '9447940835@okbizaxis'}&pn=${encodeURIComponent(settings.payment_payee_name || 'Krishna Engineering')}&am=${formData.amount || '0'}&cu=INR`} 
                                            alt="UPI QR Code" 
                                            className="w-36 h-36 rounded-lg mb-2"
                                        />
                                        <p className="text-[10px] text-slate-400">Scan using GPay, PhonePe, Paytm, or BHIM</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">UPI VPA / ID</span>
                                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{settings.payment_upi_id || '9447940835@okbizaxis'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(settings.payment_upi_id || '9447940835@okbizaxis', 'upi')}
                                        className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                                    >
                                        {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedField === 'upi' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                        12-Digit UPI Reference ID / UTR *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.referenceId}
                                        onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                                        placeholder="e.g. 428901234567"
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── METHOD 3: BANK TRANSFER DETAILS ── */}
                        {formData.method === 'bank_transfer' && (
                            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Corporate Bank Remittance Details
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        Transfer funds directly via NEFT, RTGS, or IMPS and enter the UTR below
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Name</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{settings.payment_bank_name || 'State Bank of India'}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Holder</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{settings.payment_payee_name || 'AKHIL N / KEW'}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Number</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{settings.payment_bank_account || '123456789012'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(settings.payment_bank_account || '123456789012', 'acc')}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                                        >
                                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">IFSC Code</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{settings.payment_bank_ifsc || 'SBIN0001234'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(settings.payment_bank_ifsc || 'SBIN0001234', 'ifsc')}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                                        >
                                            {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                        Bank UTR / Transaction Reference Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.referenceId}
                                        onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                                        placeholder="e.g. SBIN42890123456"
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Optional Reference / Note Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Payment Reference / Note (Optional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="e.g. Project Advance, Invoice Payment, Room Rent etc."
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                                />
                            </div>
                        </div>

                        {/* Screenshot proof if manual flow is selected */}
                        {formData.method !== 'cashfree' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Payment Screenshot (Optional)</span>
                                    <span className="text-[10px] text-slate-400">JPG, PNG</span>
                                </label>
                                {screenshotPreview ? (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                        <img src={screenshotPreview} alt="Payment Proof" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Screenshot Attached</p>
                                            <p className="text-[10px] text-emerald-600 font-medium">Ready for verification</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setScreenshotPreview(null); setFormData({ ...formData, uploadedProof: '' }); }}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-400">
                                        <Upload className="w-4 h-4 text-blue-500" />
                                        <span>Upload transfer confirmation image</span>
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                )}
                            </div>
                        )}

                        {/* CTA Button */}
                        <div>
                            {formData.method === 'cashfree' ? (
                                <button
                                    type="button"
                                    onClick={handleCashfreePay}
                                    disabled={cashfreeLoading || verifyingCashfree}
                                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        !formData.amount || parseFloat(formData.amount) <= 0
                                            ? 'bg-blue-500/80 hover:bg-blue-600'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-[0.99]'
                                    }`}
                                >
                                    {cashfreeLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Connecting Cashfree Gateway...</span>
                                        </>
                                    ) : verifyingCashfree ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Verifying Payment Ledger...</span>
                                        </>
                                    ) : !formData.amount || parseFloat(formData.amount) <= 0 ? (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Enter amount to continue</span>
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Pay ₹{parseFloat(formData.amount).toLocaleString()} Securely Now</span>
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleManualSubmit}
                                    disabled={submitting}
                                    className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Submitting for Verification...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Submit Payment for Verification</span>
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Trust badges below button */}
                            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-[11px] font-medium text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    256-bit SSL encrypted
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    Secure payment processing by Cashfree
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── RIGHT COLUMN: Recent Transactions Table ── */}
                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-xs border border-slate-100 dark:border-slate-800/80 space-y-4">
                        
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                Recent Transactions
                            </h2>
                            <button
                                type="button"
                                onClick={() => setViewAllModal(true)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                View All <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Desktop/Tablet Table (sm:block) */}
                        <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                                        <th className="py-3 px-2 whitespace-nowrap">#</th>
                                        <th className="py-3 px-2 whitespace-nowrap">Transaction ID</th>
                                        <th className="py-3 px-2 whitespace-nowrap">Date & Time</th>
                                        <th className="py-3 px-2 whitespace-nowrap">Amount</th>
                                        <th className="py-3 px-2 text-right whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-xs">
                                    {recentPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-slate-400 text-xs">
                                                <History className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                                                No transactions recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentPayments.map((p, index) => {
                                            const { date, time } = formatDateTime(p.createdAt || p.paymentDate);
                                            const isPaid = p.status === 'Completed' || p.status === 'verified' || p.status === 'paid' || p.status === 'PAID';
                                            const isFailed = p.status === 'Failed' || p.status === 'rejected' || p.status === 'FAILED';
                                            
                                            const txId = p.cfOrderId 
                                                ? `#${p.cfOrderId}`
                                                : (p.referenceId ? `#${p.referenceId}` : `#CF${p._id.slice(-8).toUpperCase()}`);

                                            return (
                                                <tr 
                                                    key={p._id}
                                                    onClick={() => isPaid && generatePaymentReceiptPDF(p, user)}
                                                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                                                    title={isPaid ? "Click to download official receipt" : ""}
                                                >
                                                    <td className="py-3 px-2 text-slate-400 font-medium whitespace-nowrap">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-3 px-2 font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                                                        {txId}
                                                    </td>
                                                    <td className="py-3 px-2 whitespace-nowrap">
                                                        <p className="font-semibold text-slate-700 dark:text-slate-300 leading-tight">{date}</p>
                                                        <p className="text-[10px] text-slate-400 leading-tight">{time}</p>
                                                    </td>
                                                    <td className="py-3 px-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                        ₹{p.amount?.toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-2 text-right whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                                            isPaid 
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                                                                : isFailed 
                                                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40' 
                                                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                                                        }`}>
                                                            {isPaid ? 'Paid' : isFailed ? 'Failed' : 'Payment Verification'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List (sm:hidden) */}
                        <div className="block sm:hidden space-y-2.5">
                            {recentPayments.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                                    No transactions recorded yet.
                                </div>
                            ) : (
                                recentPayments.map((p, index) => {
                                    const { date, time } = formatDateTime(p.createdAt || p.paymentDate);
                                    const isPaid = p.status === 'Completed' || p.status === 'verified' || p.status === 'paid' || p.status === 'PAID';
                                    const isFailed = p.status === 'Failed' || p.status === 'rejected' || p.status === 'FAILED';
                                    const txId = p.cfOrderId 
                                        ? `#${p.cfOrderId}`
                                        : (p.referenceId ? `#${p.referenceId}` : `#CF${p._id.slice(-8).toUpperCase()}`);

                                    return (
                                        <div 
                                            key={p._id}
                                            onClick={() => isPaid && generatePaymentReceiptPDF(p, user)}
                                            className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-2 cursor-pointer active:scale-[0.99] transition-all"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0">{txId}</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
                                                    isPaid 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                                                        : isFailed 
                                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40' 
                                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                                                }`}>
                                                    {isPaid ? 'Paid' : isFailed ? 'Failed' : 'Payment Verification'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs gap-2">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{date} • {time}</span>
                                                <span className="font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">₹{p.amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                                                <span className="text-slate-400 font-semibold uppercase">{p.method || 'Online'}</span>
                                                {isPaid && (
                                                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 whitespace-nowrap">
                                                        <Download className="w-3 h-3" /> Download Receipt
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                    </div>
                </div>

            </div>

            {/* ── VIEW ALL TRANSACTIONS MODAL ── */}
            {viewAllModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-3xl w-full max-h-[92vh] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        
                        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                    All Transaction Records
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Complete payment history ({payments.length} total)
                                </p>
                            </div>
                            <button
                                onClick={() => setViewAllModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="py-3 sm:py-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ID, amount, status, notes..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* Mobile Cards for All Transactions (sm:hidden) */}
                        <div className="block sm:hidden flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                            {filteredPayments.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    No transaction records found matching "{searchQuery}"
                                </div>
                            ) : (
                                filteredPayments.map((p, idx) => {
                                    const { date, time } = formatDateTime(p.createdAt || p.paymentDate);
                                    const isPaid = p.status === 'Completed' || p.status === 'verified' || p.status === 'paid' || p.status === 'PAID';
                                    const isFailed = p.status === 'Failed' || p.status === 'rejected' || p.status === 'FAILED';
                                    const txId = p.cfOrderId 
                                        ? `#${p.cfOrderId}`
                                        : (p.referenceId ? `#${p.referenceId}` : `#CF${p._id.slice(-8).toUpperCase()}`);

                                    return (
                                        <div key={p._id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-2 text-xs">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{txId}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{date} • {time}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">₹{p.amount?.toLocaleString()}</p>
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.method || 'Online'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0 ${
                                                    isPaid 
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                                                        : isFailed 
                                                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40' 
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                                                }`}>
                                                    {isPaid ? 'Paid' : isFailed ? 'Failed' : 'Payment Verification'}
                                                </span>

                                                {isPaid && (
                                                    <button
                                                        onClick={() => generatePaymentReceiptPDF(p, user)}
                                                        className="px-2.5 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold transition whitespace-nowrap cursor-pointer"
                                                    >
                                                        <Download className="w-3 h-3" /> Receipt
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Full Table for Desktop & Tablet (hidden sm:block) */}
                        <div className="hidden sm:block flex-1 overflow-y-auto overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[620px]">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                                        <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Transaction ID</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Method</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Amount</th>
                                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {filteredPayments.map((p, idx) => {
                                        const { date, time } = formatDateTime(p.createdAt || p.paymentDate);
                                        const isPaid = p.status === 'Completed' || p.status === 'verified' || p.status === 'paid' || p.status === 'PAID';
                                        const isFailed = p.status === 'Failed' || p.status === 'rejected' || p.status === 'FAILED';
                                        const txId = p.cfOrderId 
                                            ? `#${p.cfOrderId}`
                                            : (p.referenceId ? `#${p.referenceId}` : `#CF${p._id.slice(-8).toUpperCase()}`);

                                        return (
                                            <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{idx + 1}</td>
                                                <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{txId}</td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <p className="font-semibold text-slate-700 dark:text-slate-300 leading-tight">{date}</p>
                                                    <p className="text-[10px] text-slate-400 leading-tight">{time}</p>
                                                </td>
                                                <td className="py-3 px-3 text-slate-500 uppercase font-semibold text-[11px] whitespace-nowrap">{p.method}</td>
                                                <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">₹{p.amount?.toLocaleString()}</td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                                        isPaid 
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                            : isFailed 
                                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                    }`}>
                                                        {isPaid ? 'Paid' : isFailed ? 'Failed' : 'Payment Verification'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                                    {isPaid && (
                                                        <button
                                                            onClick={() => generatePaymentReceiptPDF(p, user)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                                            title="Download Receipt"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            )}

            {/* UPI Deep-link App Picker */}
            <UPIAppPicker 
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                upiData={upiData}
                onFallbackTriggered={() => {
                    setShowPicker(false);
                    setShowFallback(true);
                }}
            />

            {/* Settlement Result Confirmation Modal */}
            {paymentResult && paymentResult.show && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-150">
                        <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
                            paymentResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                            {paymentResult.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        </div>

                        <h3 className={`text-lg font-bold mb-1 ${
                            paymentResult.success ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                            {paymentResult.success ? 'Payment Verified & Confirmed' : 'Payment Incomplete or Cancelled'}
                        </h3>
                        
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            {paymentResult.message}
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 mb-5 text-left text-xs space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500 font-medium">Payment Amount:</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">₹{paymentResult.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Transaction Status:</span>
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wider uppercase ${
                                    paymentResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                    {paymentResult.status}
                                </span>
                            </div>
                            {paymentResult.cfPaymentId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Cashfree Ref ID:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{paymentResult.cfPaymentId}</span>
                                </div>
                            )}
                            {paymentResult.orderId && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Order ID:</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-400">{paymentResult.orderId}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {paymentResult.success && paymentResult.payment && (
                                <button
                                    type="button"
                                    onClick={() => generatePaymentReceiptPDF(paymentResult.payment, user)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                >
                                    <Download className="w-4 h-4" /> Download Official Receipt
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPaymentResult(null)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                Close & View Updated Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPayments;
