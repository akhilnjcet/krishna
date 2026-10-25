import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, CreditCard, Smartphone, CheckCircle2, 
    ShieldCheck, IndianRupee, Zap, Droplets, Info, Wifi, Wrench, Sparkles, ArrowRight,
    Building2, Copy, Check, Upload, Camera, AlertCircle, X, RefreshCcw
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';
import api from '../../services/api';
import { initializeCashfree } from '../../utils/cashfreeLoader';

const PaymentSystem = () => {
    const { roomNumber, type } = useParams();
    const navigate = useNavigate();
    const room = useLodgeStore(state => state.getRoomByNumber(roomNumber));
    const addPayment = useLodgeStore(state => state.addPayment);
    const markBillPaid = useLodgeStore(state => state.markBillPaid);
    const appSettings = useLodgeStore(state => state.appSettings);
    
    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('cashfree'); // 'cashfree' | 'bank_transfer'
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [referenceId, setReferenceId] = useState('');
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    
    // Result modal for web/mobile Cashfree verification
    const [paymentResult, setPaymentResult] = useState(null);

    useEffect(() => {
        if (room) {
            if (type === 'rent') setAmount(room.rent.toString());
            else if (type === 'electricity') setAmount((room.electricityBill || 0).toString());
            else if (type === 'water') setAmount((room.waterBill || 0).toString());
            else if (type === 'wifi') setAmount((room.wifiBill || 0).toString());
            else if (type === 'maintenance') setAmount((room.maintenanceBill || 0).toString());
            else if (type === 'advanceRent') setAmount((room.advanceRentBill || 0).toString());
        }
    }, [room, type]);

    // Check for return redirect from Cashfree (web / mobile web return)
    useEffect(() => {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const searchParams = new URLSearchParams(window.location.search || hashQuery);
        const cfOrderId = searchParams.get('cf_order_id') || searchParams.get('order_id');
        
        if (cfOrderId) {
            verifyCashfreeReturn(cfOrderId);
        }
    }, []);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const verifyCashfreeReturn = async (orderId) => {
        setProcessing(true);
        try {
            const verifyRes = await api.post('/payments/cashfree/verify', { orderId });
            if (verifyRes.data.success) {
                const verifiedAmt = verifyRes.data.verifiedAmount || parseFloat(amount) || 0;
                addPayment({
                    roomNumber,
                    type,
                    amount: verifiedAmt,
                    method: 'Cashfree Gateway (Cards/UPI/NetBanking)',
                    status: 'Completed'
                });
                if (['electricity', 'water', 'wifi', 'maintenance', 'advanceRent'].includes(type)) {
                    markBillPaid(room?.id, type, verifiedAmt);
                }

                setPaymentResult({
                    show: true,
                    success: true,
                    amount: verifiedAmt,
                    orderId,
                    cfPaymentId: verifyRes.data.cfPaymentId,
                    status: verifyRes.data.paymentStatus || 'PAID',
                    remainingBalance: verifyRes.data.remainingBillBalance,
                    message: verifyRes.data.message || 'Payment successfully verified by Cashfree and applied to ledger.'
                });
            } else {
                setPaymentResult({
                    show: true,
                    success: false,
                    amount: parseFloat(amount) || 0,
                    orderId,
                    status: verifyRes.data.orderStatus || 'INCOMPLETE',
                    message: verifyRes.data.message || `Cashfree reported status: ${verifyRes.data.orderStatus}.`
                });
            }
        } catch (err) {
            console.error('Redirect Verification Error:', err);
            setPaymentResult({
                show: true,
                success: false,
                amount: parseFloat(amount) || 0,
                orderId,
                status: 'VERIFY_ERROR',
                message: err.response?.data?.message || err.message || 'Failed to verify Cashfree payment.'
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setScreenshotPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const takeNativePicture = async () => {
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
            
            await Haptics.impact({ style: ImpactStyle.Light });
            
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Prompt
            });
            
            if (image && image.dataUrl) {
                setScreenshotPreview(image.dataUrl);
            }
        } catch (e) {
            console.error('Native Camera Error:', e);
            document.getElementById('file-upload-input')?.click();
        }
    };

    const handleCashfreePayment = async () => {
        const payAmt = parseFloat(amount);
        if (!payAmt || payAmt <= 0) {
            alert('Please specify a valid payment amount.');
            return;
        }
        setProcessing(true);
        try {
            const orderRes = await api.post('/payments/cashfree/create-order', {
                amount: payAmt,
                roomId: room?.id,
                bookingId: room?.id,
                name: room?.tenant || 'Guest Tenant',
                paymentType: type === 'rent' ? 'Rent' : 'Additional Charge',
                chargeCategory: type,
                orderNote: `${type.toUpperCase()} payment for Room ${roomNumber}`
            });

            const { paymentSessionId, orderId, environment } = orderRes.data;
            if (!paymentSessionId) throw new Error('Could not acquire payment session from Cashfree.');

            const cashfree = await initializeCashfree(environment || 'production');
            
            cashfree.checkout({
                paymentSessionId,
                redirectTarget: '_modal'
            }).then(async (result) => {
                if (result.error) {
                    console.warn('Cashfree checkout modal closed or error:', result.error);
                    setPaymentResult({
                        show: true,
                        success: false,
                        amount: payAmt,
                        orderId,
                        status: 'CANCELLED_OR_FAILED',
                        message: result.error.message || 'Payment checkout was cancelled or closed.'
                    });
                } else if (result.paymentDetails) {
                    // Always verify on the backend directly with Cashfree
                    await verifyCashfreeReturn(orderId);
                }
            });
        } catch (err) {
            console.error('Cashfree Checkout Error:', err);
            setPaymentResult({
                show: true,
                success: false,
                amount: payAmt,
                orderId: 'N/A',
                status: 'INIT_ERROR',
                message: err.response?.data?.message || err.message || 'Failed to initialize Cashfree Gateway.'
            });
        } finally {
            setProcessing(false);
        }
    };

    const submitDirectBankPayment = async () => {
        const payAmt = parseFloat(amount);
        if (!payAmt || payAmt <= 0) {
            alert('Please specify a valid payment amount.');
            return;
        }

        setProcessing(true);
        try {
            await api.post('/payments/submit', {
                amount: payAmt,
                method: 'Bank Transfer / UPI',
                referenceId: referenceId.trim() || `TXN-${Date.now().toString(36).toUpperCase()}`,
                notes: `${type.toUpperCase()} direct settlement for Room ${roomNumber}`,
                name: room?.tenant || 'Guest Tenant',
                bookingId: room?.id || undefined,
                roomId: room?.id || undefined,
                uploadedProof: screenshotPreview || undefined,
                status: 'WAITING_FOR_VERIFICATION'
            });

            // Local store update
            addPayment({
                roomNumber,
                type,
                amount: payAmt,
                method: 'Direct Bank / UPI',
                screenshot: screenshotPreview,
                status: 'Waiting for Approval'
            });

            setSuccess('approval');
            setTimeout(() => navigate(`/lodge/room/${roomNumber}`), 3000);
        } catch (err) {
            console.error('Payment submission failed:', err);
            alert('Failed to register payment report: ' + (err.response?.data?.message || err.message));
        } finally {
            setProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 bg-amber-50 border-amber-100"
                >
                    <CheckCircle2 className="w-12 h-12 text-amber-500" />
                </motion.div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-2 font-poppins text-center">
                    Submitted for Admin Verification
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-center text-sm max-w-sm">
                    Your payment details have been recorded in the ledger awaiting administrator verification. Redirecting...
                </p>
            </div>
        );
    }

    const bankDetails = {
        upiId: appSettings?.upiId || 'krishnaengineering@upi',
        bankName: appSettings?.bankName || 'Axis Bank',
        accountNumber: appSettings?.bankAccountNumber || '924020012345678',
        ifscCode: appSettings?.bankIfsc || 'UTIB0001234',
        accountName: appSettings?.bankAccountName || 'Krishna Engineering & Lodge'
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
            {/* Header */}
            <div className="bg-[#2D5BE3] pt-6 pb-12 px-6 relative flex-shrink-0">
                <div className="relative z-10 flex items-center gap-4 max-w-lg mx-auto">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 bg-white/10 dark:bg-slate-800/50 rounded-xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10 hover:bg-white/20 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white font-poppins capitalize tracking-tight leading-none">
                            {type} Settlement
                        </h1>
                        <p className="text-xs text-blue-100 mt-1 font-medium">Room {roomNumber} • Krishna Residency</p>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-6 max-w-lg mx-auto space-y-5">
                {/* Amount Due Card */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950/40 text-[#2D5BE3] dark:text-blue-400 rounded-2xl mb-3">
                        {type === 'rent' ? <CreditCard className="w-6 h-6"/> : 
                         type === 'electricity' ? <Zap className="w-6 h-6"/> : 
                         type === 'water' ? <Droplets className="w-6 h-6"/> : 
                         type === 'wifi' ? <Wifi className="w-6 h-6"/> : 
                         type === 'maintenance' ? <Wrench className="w-6 h-6"/> : <IndianRupee className="w-6 h-6"/>}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outstanding Due</p>
                    <div className="flex items-center justify-center gap-1 mb-2">
                        <span className="text-2xl font-bold text-slate-400">₹</span>
                        <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-4xl font-black text-slate-900 dark:text-white w-full max-w-[200px] text-center bg-transparent border-0 focus:ring-0 p-0 outline-none"
                            placeholder="0"
                        />
                    </div>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                        {room?.tenant || 'Tenant'} • Room {roomNumber}
                    </p>
                </div>

                {/* Method Selection Tabs: ONLY Cashfree & Bank Details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-800 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setSelectedMethod('cashfree')}
                        className={`py-3 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                            selectedMethod === 'cashfree'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Cashfree Gateway</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedMethod('bank_transfer')}
                        className={`py-3 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                            selectedMethod === 'bank_transfer'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span>Bank / UPI Details</span>
                    </button>
                </div>

                {/* OPTION 1: CASHFREE GATEWAY */}
                {selectedMethod === 'cashfree' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Official Cashfree Gateway
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Cards • UPI • NetBanking • Instant Ledger</p>
                            </div>
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                Realtime Verification
                            </span>
                        </div>

                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>Item:</span>
                                <span className="font-bold text-slate-900 dark:text-white capitalize">{type} Settlement</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>Amount to Pay:</span>
                                <span className="font-black text-slate-900 dark:text-white text-sm">₹{parseFloat(amount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCashfreePayment}
                            disabled={processing || !amount || parseFloat(amount) <= 0}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-600/25 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span>Processing Cashfree...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-amber-300" />
                                    <span>Pay ₹{parseFloat(amount || 0).toLocaleString()} via Cashfree</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2">
                            <span>🔒 256-Bit SSL Encrypted</span>
                            <span>🛡️ RBI Authorized PG</span>
                        </div>
                    </div>
                )}

                {/* OPTION 2: DIRECT BANK ACCOUNT & UPI DETAILS */}
                {selectedMethod === 'bank_transfer' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                            <div>
                                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-blue-500" /> Bank & UPI Details
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Transfer directly using UPI or NEFT/IMPS</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQR(!showQR)}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {showQR ? 'Hide QR' : 'Show QR'}
                            </button>
                        </div>

                        {/* QR Code toggle */}
                        {showQR && (
                            <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${bankDetails.upiId}&pn=KrishnaLodge&am=${amount || '0'}&cu=INR`} 
                                    alt="UPI QR Code" 
                                    className="w-40 h-40 rounded-xl border border-slate-200 dark:border-slate-700 mb-2"
                                />
                                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Scan using any UPI App</p>
                            </div>
                        )}

                        {/* Bank Details Display Card */}
                        <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-3 font-medium">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">UPI ID / VPA</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{bankDetails.upiId}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(bankDetails.upiId, 'upi')}
                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100"
                                >
                                    {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedField === 'upi' ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Bank Account Number</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{bankDetails.accountNumber}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(bankDetails.accountNumber, 'acc')}
                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100"
                                >
                                    {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedField === 'acc' ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">IFSC Code</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{bankDetails.ifscCode}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(bankDetails.ifscCode, 'ifsc')}
                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100"
                                >
                                    {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedField === 'ifsc' ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                <span>Beneficiary: <strong className="text-slate-700 dark:text-slate-300">{bankDetails.accountName}</strong></span>
                                <span>Bank: <strong className="text-slate-700 dark:text-slate-300">{bankDetails.bankName}</strong></span>
                            </div>
                        </div>

                        {/* Reference / UTR input */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Transaction ID / UTR Number
                            </label>
                            <input
                                type="text"
                                value={referenceId}
                                onChange={(e) => setReferenceId(e.target.value)}
                                placeholder="Enter 12-digit UTR or Transaction Ref"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Optional Screenshot Upload */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Payment Screenshot Upload
                                </label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                    Optional
                                </span>
                            </div>

                            <input
                                id="file-upload-input"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={takeNativePicture}
                                className="w-full py-3.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100/50 transition"
                            >
                                <Camera className="w-4 h-4" />
                                <span>{screenshotPreview ? 'Change Screenshot' : 'Upload / Capture Screenshot (Optional)'}</span>
                            </button>

                            {screenshotPreview && (
                                <div className="relative mt-2">
                                    <img 
                                        src={screenshotPreview} 
                                        alt="Payment Proof" 
                                        className="w-full max-h-36 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-black/5" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setScreenshotPreview(null)}
                                        className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full shadow"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={submitDirectBankPayment}
                            disabled={processing || !amount || parseFloat(amount) <= 0}
                            className="w-full py-4 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span>Submitting Report...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Submit Transfer for Admin Verification</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* CASHFREE PAYMENT RESULT POPUP (WEB / MOBILE REDIRECT & MODAL) */}
            {paymentResult && paymentResult.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center">
                        <button
                            onClick={() => setPaymentResult(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                            paymentResult.success 
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                        }`}>
                            {paymentResult.success ? (
                                <CheckCircle2 className="w-10 h-10" />
                            ) : (
                                <AlertCircle className="w-10 h-10" />
                            )}
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
                                <span className="text-slate-500 dark:text-slate-400 font-semibold">Gateway Status:</span>
                                <span className={`px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase ${
                                    paymentResult.success 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
                                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Order ID:</span>
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{paymentResult.orderId}</span>
                                </div>
                            )}
                            {paymentResult.remainingBalance !== undefined && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">Remaining Due:</span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{paymentResult.remainingBalance?.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setPaymentResult(null);
                                navigate(`/lodge/room/${roomNumber}`);
                            }}
                            className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition ${
                                paymentResult.success
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                            }`}
                        >
                            {paymentResult.success ? 'View Updated Room Dues' : 'Dismiss'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentSystem;
