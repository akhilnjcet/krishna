import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Calendar, CheckCircle2, 
    AlertCircle, Loader2, FileText, Download,
    Wallet, TrendingUp, History, Send,
    Info, CreditCard
} from 'lucide-react';
import { generateSalaryPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const StaffFinance = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdvanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
    const { user } = useAuthStore();

    useEffect(() => {
        fetchSalary();
    }, []);

    const fetchSalary = async () => {
        try {
            const res = await api.get('/finance/staff-salary');
            setHistory(res.data);
        } catch (err) {
            console.error('Salary sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSlip = (sal) => {
        if (sal.paymentStatus !== 'paid') return;
        generateSalaryPDF({
            month: sal.month,
            year: sal.year || new Date().getFullYear(),
            amount: sal.salaryAmount,
            status: sal.paymentStatus
        }, user);
    };

    const handleAdvanceRequest = (e) => {
        e.preventDefault();
        alert(`Advance request of ₹${advanceForm.amount} submitted successfully for review.`);
        setAdvanceModalOpen(false);
        setAdvanceForm({ amount: '', reason: '' });
    };

    const totalPaid = history.filter(s => s.paymentStatus === 'paid').reduce((acc, s) => acc + s.salaryAmount, 0);
    const pendingAmount = history.filter(s => s.paymentStatus !== 'paid').reduce((acc, s) => acc + s.salaryAmount, 0);

    const stats = [
        { label: 'Total Earned', value: `₹ ${(totalPaid + pendingAmount).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Cleared Amount', value: `₹ ${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pending Payout', value: `₹ ${pendingAmount.toLocaleString()}`, icon: History, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Syncing Payroll Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Finances & Payroll</h1>
                    <p className="text-sm text-slate-500">Manage your earnings, request advances, and download payslips.</p>
                </div>
                <button 
                    onClick={() => setAdvanceModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Send className="w-4 h-4" /> Request Advance Salary
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Salary History Table */}
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" /> Payment History
                    </h3>
                    <div className="text-[10px] font-black uppercase text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                        Total Records: {history.length}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Month / Year</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Base Salary</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Deductions</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Net Payable</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.length > 0 ? history.map((sal) => (
                                <tr key={sal._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                                {sal.month?.substring(0, 3)}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{sal.month}, 2026</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-600 italic">₹ {sal.salaryAmount?.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-sm font-medium text-slate-400 italic">₹ 0.00</td>
                                    <td className="px-6 py-5 text-sm font-black text-slate-800 tracking-tight">₹ {sal.salaryAmount?.toLocaleString()}</td>
                                    <td className="px-6 py-5">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                                            sal.paymentStatus === 'paid' 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {sal.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <button 
                                            onClick={() => handleDownloadSlip(sal)}
                                            disabled={sal.paymentStatus !== 'paid'}
                                            className={`p-2 rounded-lg border transition-all ${
                                                sal.paymentStatus === 'paid' 
                                                ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm' 
                                                : 'border-slate-100 text-slate-300 cursor-not-allowed grayscale'
                                            }`}
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic">No financial history logged yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Advance Salary Modal */}
            <AnimatePresence>
                {isAdvanceModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAdvanceModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-8 text-white relative">
                                <div className="absolute top-0 right-0 p-8 opacity-20"><Wallet className="w-24 h-24 rotate-12" /></div>
                                <h3 className="text-2xl font-bold mb-1">Request Advance</h3>
                                <p className="text-indigo-100 text-sm font-medium tracking-tight uppercase tracking-wider">Salary Advance Submission Form</p>
                            </div>
                            
                            <form onSubmit={handleAdvanceRequest} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Request Amount (₹)</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-slate-300" />
                                            <input 
                                                type="number" 
                                                required
                                                placeholder="e.g. 5000" 
                                                className="bg-transparent w-full outline-none text-slate-700 font-bold"
                                                value={advanceForm.amount}
                                                onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Reason for Advance</label>
                                        <textarea 
                                            required
                                            rows="4" 
                                            placeholder="Please describe why you need the advance..." 
                                            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 font-medium text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                                            value={advanceForm.reason}
                                            onChange={(e) => setAdvanceForm({...advanceForm, reason: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">Advance approvals are subject to prior monthly attendance scores and current work progress status.</p>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setAdvanceModalOpen(false)}
                                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffFinance;
