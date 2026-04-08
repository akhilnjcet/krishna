import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { 
    Wallet, Send, History, Download, Info, 
    CreditCard, Building, QrCode, CheckCircle, 
    Clock, AlertTriangle, Loader2 
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';

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
        notes: ''
    });

    const [proofFile, setProofFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

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
        setProofFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proofFile) return alert("Please upload a screenshot of your payment proof.");
        
        setSubmitting(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('amount', formData.amount);
            formDataToSend.append('method', formData.method);
            formDataToSend.append('referenceId', formData.referenceId);
            formDataToSend.append('notes', formData.notes);
            formDataToSend.append('image', proofFile);

            const res = await api.post('/payments/submit', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setFormData({ amount: '', method: 'upi', referenceId: '', notes: '' });
            setProofFile(null);
            
            // Automatically generate and download receipt
            generatePaymentReceiptPDF(res.data, user);
            
            alert("Payment Acknowledgement Submitted. Receipt Downloaded. Awaiting Admin Verification.");
            fetchData();
        } catch (err) {
            console.error("Payment Submission Error:", err);
            alert("Submission error: " + (err.response?.data?.message || "Connection interrupted."));
        } finally {
            setSubmitting(false);
        }
    };

    const getUPILink = () => {
        if (!settings.payment_upi_id || !formData.amount) return null;
        return `upi://pay?pa=${settings.payment_upi_id}&am=${formData.amount}&cu=INR`;
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
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900">Payments & <span className="text-slate-400 font-light">Transfers</span></h2>
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
                                        className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl font-black text-blue-400 placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'upi'})}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.method === 'upi' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        <QrCode className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">UPI Portal</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, method: 'bank_transfer'})}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.method === 'bank_transfer' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        <Building className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Bank Node</span>
                                    </button>
                                </div>

                                {/* Dynamic QR and UPI Redirection */}
                                {formData.method === 'upi' && formData.amount > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 border-b-4 border-blue-600"
                                    >
                                        <div className="p-2 border-2 border-slate-100 rounded-xl">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getUPILink())}`}
                                                alt="Payment QR"
                                                className="w-32 h-32"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 italic">Scan to Pay ₹{formData.amount}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">{settings.payment_upi_id}</p>
                                        </div>
                                        <a 
                                            href={getUPILink()}
                                            className="w-full py-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-xl hover:bg-slate-900 transition-colors"
                                        >
                                            Open in UPI App
                                        </a>
                                    </motion.div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reference ID / UTR Number</label>
                                        <input 
                                            required
                                            value={formData.referenceId}
                                            onChange={(e) => setFormData({...formData, referenceId: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-blue-500 transition-all"
                                            placeholder="Enter UPI Ref / Bank UTR"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Screenshot (Proof)</label>
                                        <div className="relative group/file">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center gap-2 transition-all ${proofFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5 group-hover/file:border-blue-500'}`}>
                                                {proofFile ? (
                                                    <>
                                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase truncate max-w-full px-4">{proofFile.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-5 h-5 text-blue-400 rotate-180" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Drop Screenshot or Click</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    disabled={submitting}
                                    type="submit"
                                    className="w-full py-5 bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit Transaction Node
                                </button>
                            </form>
                        </div>
                    </section>

                    {/* Channel Intel */}
                    <div className="bg-white border-4 border-slate-900 p-8 shadow-solid">
                        <h4 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" /> Authorized Channels
                        </h4>
                        
                        <div className="space-y-6">
                            {settings.payment_upi_id && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Integrated UPI Address</p>
                                    <p className="text-sm font-black text-slate-900 tracking-tight">{settings.payment_upi_id}</p>
                                </div>
                            )}
                            
                            {settings.payment_bank_name && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Corporate Bank Details</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <p className="text-xs font-black text-slate-900">{settings.payment_bank_name}</p>
                                        <p className="text-xs font-bold text-slate-600">ACC: {settings.payment_bank_account}</p>
                                        <p className="text-xs font-bold text-slate-600 uppercase">IFSC: {settings.payment_bank_ifsc}</p>
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

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-2 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                        <th className="px-6 py-5">Verified ID</th>
                                        <th className="px-6 py-5">Amt / Method</th>
                                        <th className="px-6 py-5 text-center">Status</th>
                                        <th className="px-6 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-20 text-center">
                                                <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No financial history logged.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        payments.map((p) => (
                                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-6">
                                                    <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">#{p._id.slice(-8).toUpperCase()}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <p className="text-sm font-black text-slate-900 italic">₹ {p.amount?.toLocaleString()}</p>
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">{p.method}</p>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex justify-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                            p.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 
                                                            p.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {p.status === 'verified' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <button 
                                                        disabled={p.status !== 'verified'}
                                                        onClick={() => generatePaymentReceiptPDF(p, user)}
                                                        className={`p-3 rounded-xl border transition-all ${p.status === 'verified' ? 'border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm' : 'opacity-20 cursor-not-allowed'}`}
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
        </div>
    );
};

export default CustomerPayments;
