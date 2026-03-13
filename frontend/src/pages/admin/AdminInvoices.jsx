import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { CreditCard, Send, CheckCircle, Clock, Loader2, IndianRupee } from 'lucide-react';

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await api.get('/invoices');
            setInvoices(res.data);
        } catch (err) {
            console.error("Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.put(`/invoices/${id}/status`, { status });
            fetchInvoices();
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    const totalOutstanding = invoices
        .filter(inv => inv.paymentStatus !== 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Financial Oversight</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Accounts Receivable</h2>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl text-right">
                    <div className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Total Outstanding</div>
                    <div className="font-black text-3xl text-indigo-600 flex items-center justify-end gap-1">
                        <IndianRupee className="w-6 h-6" /> {totalOutstanding.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <th className="p-6">Invoice ID</th>
                                <th className="p-6">Client / Project</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-900 divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Generating Financial Ledger</p>
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-slate-400">
                                        No invoices found in the system.
                                    </td>
                                </tr>
                            ) : invoices.map((inv, i) => (
                                <motion.tr
                                    key={inv._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-indigo-50/30 transition-colors"
                                >
                                    <td className="p-6">
                                        <div className="font-black text-slate-900 uppercase">INV-{inv._id.slice(-6).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-400 italic font-medium">{new Date(inv.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className="font-black uppercase text-indigo-600">ID: {inv.customerId?._id?.slice(-8) || 'N/A'}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-slate-400">Project: {inv.projectId?.title || 'Unknown'}</div>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-xl font-black text-slate-900">₹ {inv.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            inv.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            inv.paymentStatus === 'overdue' ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' :
                                            'bg-amber-100 text-amber-700 border-amber-200'
                                        }`}>
                                            {inv.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {inv.paymentStatus !== 'paid' ? (
                                                <button 
                                                    onClick={() => handleUpdateStatus(inv._id, 'paid')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-md"
                                                    title="Mark as Paid"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleUpdateStatus(inv._id, 'unpaid')}
                                                    className="bg-slate-100 text-slate-400 p-2 rounded-xl transition"
                                                    title="Revert to Unpaid"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition shadow-md">
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoices;
