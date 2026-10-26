import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, XCircle, Clock, Filter, Search, Loader2, User } from 'lucide-react';

const AdminLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const res = await api.get('/leave');
            setLeaves(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.put(`/leave/${id}/status`, { status });
            fetchLeaves();
        } catch (err) {
            alert("Failed to update leave status.");
        }
    };

    const filteredLeaves = filterStatus 
        ? leaves.filter(l => l.status === filterStatus)
        : leaves;

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 bg-slate-50 dark:bg-slate-800 min-h-screen">
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Human Resources</div>
                    <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Staff Absence Log</h1>
                </div>
                <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                        {['', 'pending', 'approved', 'rejected'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterStatus === s ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'
                                }`}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                {/* Mobile View: Cards */}
                <div className="block md:hidden p-3 sm:p-4 space-y-3">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing Absence Registry</p>
                        </div>
                    ) : filteredLeaves.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold uppercase italic text-sm">
                            No leave requests matching criteria.
                        </div>
                    ) : (
                        filteredLeaves.map((leave, i) => (
                            <div key={leave._id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase shrink-0">
                                            {leave.staffId?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 dark:text-white leading-tight truncate">{leave.staffId?.name}</div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">{leave.staffId?.email}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 whitespace-nowrap ${
                                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                                        leave.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' :
                                        'bg-amber-100 text-amber-700 border-amber-200 animate-pulse dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                    }`}>
                                        {leave.status}
                                    </span>
                                </div>

                                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-black uppercase">To {new Date(leave.endDate).toLocaleDateString()}</span>
                                </div>

                                {leave.reason && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-3">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Reason: </span>{leave.reason}
                                    </p>
                                )}

                                {leave.status === 'pending' && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <button 
                                            onClick={() => handleUpdateStatus(leave._id, 'approved')}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2 px-3 rounded-xl transition font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(leave._id, 'rejected')}
                                            className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white py-2 px-3 rounded-xl transition font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="p-4 lg:p-6">Staff Member</th>
                                <th className="p-4 lg:p-6">Requested Period</th>
                                <th className="p-4 lg:p-6">Reason / Vindication</th>
                                <th className="p-4 lg:p-6">Status</th>
                                <th className="p-4 lg:p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing Absence Registry</p>
                                    </td>
                                </tr>
                            ) : filteredLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-slate-400 font-bold uppercase italic">
                                        No leave requests matching criteria.
                                    </td>
                                </tr>
                            ) : filteredLeaves.map((leave, i) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={leave._id} 
                                    className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
                                >
                                    <td className="p-4 lg:p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase shrink-0">
                                                {leave.staffId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white leading-none mb-1">{leave.staffId?.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{leave.staffId?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-6 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                {new Date(leave.startDate).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To {new Date(leave.endDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-6">
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 max-w-xs line-clamp-2">{leave.reason}</p>
                                    </td>
                                    <td className="p-4 lg:p-6 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                                            leave.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' :
                                            'bg-amber-100 text-amber-700 border-amber-200 animate-pulse dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                        }`}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td className="p-4 lg:p-6 text-right whitespace-nowrap">
                                        {leave.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleUpdateStatus(leave._id, 'approved')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-sm hover:scale-105 active:scale-95"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(leave._id, 'rejected')}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition shadow-sm hover:scale-105 active:scale-95"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 uppercase font-black tracking-widest">Completed</span>
                                        )}
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

export default AdminLeave;
