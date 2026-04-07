import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Send, History, AlertCircle, CheckCircle, XCircle, ChevronRight, Plus, Info } from 'lucide-react';

const StaffLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApplyModalOpen, setApplyModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/applications?type=leave');
            setLeaves(res.data);
        } catch (err) {
            console.error('Failed to fetch leave history:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/applications', {
                type: 'leave',
                title: `Leave: ${formData.startDate} to ${formData.endDate}`,
                startDate: formData.startDate,
                endDate: formData.endDate,
                description: formData.reason
            });
            alert("Leave application submitted successfully!");
            setFormData({ startDate: '', endDate: '', reason: '' });
            setApplyModalOpen(false);
            fetchLeaves();
        } catch (err) {
            console.error("Submission error:", err);
            alert("Administrative Error: Failed to submit leave application.");
        }
    };

    const getStatusStyles = (status) => {
        switch(status?.toLowerCase()) {
            case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Time Off & Leaves</h1>
                    <p className="text-sm text-slate-500">Track your leave status and apply for new authorizations.</p>
                </div>
                <button 
                    onClick={() => setApplyModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Plus className="w-4 h-4" /> Apply for Leave
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Leave Balance / Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-800">Leave Balance</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Sick Leave</span>
                                <span className="text-sm font-bold text-slate-800">08 Days</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Casual Leave</span>
                                <span className="text-sm font-bold text-slate-800">04 Days</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Total Available</span>
                                <span className="text-sm font-black text-indigo-600">12 Days</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100">
                        <div className="flex items-start gap-4">
                            <Info className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <h4 className="text-amber-800 font-bold text-sm">Policy Notice</h4>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium uppercase tracking-tight">Apply at least 48 hours in advance for planned leaves. Emergency leaves require immediate supervisor contact.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col min-h-[500px]">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-600" /> Request Timeline
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-30">
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest italic">Scanning logs...</span>
                            </div>
                        ) : leaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-slate-300 italic font-bold">
                                No prior requests found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {leaves.map((leave) => (
                                    <div key={leave._id} className="p-6 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="text-center w-12 flex-shrink-0">
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{new Date(leave.startDate).toLocaleString('default', { month: 'short' })}</div>
                                                <div className="text-xl font-black text-slate-800 leading-none">{new Date(leave.startDate).getDate()}</div>
                                            </div>
                                            <div className="h-10 w-[1px] bg-slate-100 hidden sm:block"></div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-slate-800">
                                                    {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                                                </h4>
                                                <p className="text-xs text-slate-400 font-medium truncate max-w-xs md:max-w-md">{leave.reason}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${getStatusStyles(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Apply Leave Modal */}
            <AnimatePresence>
                {isApplyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setApplyModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-8 text-white">
                                <h3 className="text-2xl font-bold mb-1">New Leave Request</h3>
                                <p className="text-indigo-100 text-sm font-medium tracking-tight uppercase tracking-widest italic">Authorization Required</p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Starts From</label>
                                        <input 
                                            type="date" 
                                            required
                                            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 font-bold text-sm"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Ends At</label>
                                        <input 
                                            type="date" 
                                            required
                                            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 font-bold text-sm"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Reason for Absence</label>
                                    <textarea 
                                        required
                                        rows="4" 
                                        placeholder="Briefly explain the reason for this request..." 
                                        className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 font-medium text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setApplyModalOpen(false)}
                                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                    >
                                        Submit Authorization
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

export default StaffLeave;
