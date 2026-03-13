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
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Human Resources</div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Staff Absence Log</h1>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        {['', 'pending', 'approved', 'rejected'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filterStatus === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                                <th className="p-8">Staff Member</th>
                                <th className="p-8">Requested Period</th>
                                <th className="p-8">Reason / Vindication</th>
                                <th className="p-8">Status</th>
                                <th className="p-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing Absence Registry</p>
                                    </td>
                                </tr>
                            ) : filteredLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase italic">
                                        No leave requests matching criteria.
                                    </td>
                                </tr>
                            ) : filteredLeaves.map((leave, i) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={leave._id} 
                                    className="hover:bg-indigo-50/30 transition-colors group"
                                >
                                    <td className="p-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase">
                                                {leave.staffId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 leading-none mb-1">{leave.staffId?.name}</div>
                                                <div className="text-xs text-slate-500 font-bold">{leave.staffId?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                {new Date(leave.startDate).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To {new Date(leave.endDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-sm font-bold text-slate-600 max-w-xs line-clamp-2">{leave.reason}</p>
                                    </td>
                                    <td className="p-8">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            leave.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                                        }`}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td className="p-8 text-right">
                                        {leave.status === 'pending' && (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleUpdateStatus(leave._id, 'approved')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-lg"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(leave._id, 'rejected')}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition shadow-lg"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
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
