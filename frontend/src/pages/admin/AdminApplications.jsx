import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, CheckCircle, XCircle, Clock, Filter, 
    Search, Loader2, User, Landmark, Calendar,
    Banknote, Sparkle, BadgeCheck, AlertCircle
} from 'lucide-react';

const AdminApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [adminRemark, setAdminRemark] = useState('');
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/applications?status=${filterStatus}&type=${filterType}`);
            setApplications(res.data);
        } catch (err) {
            console.error("Failed to fetch applications:", err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleUpdateStatus = async () => {
        if (!adminRemark && pendingAction === 'rejected') {
            return alert("Please provide a remark for rejection.");
        }
        try {
            await api.put(`/applications/${selectedApp._id}/status`, { 
                status: pendingAction, 
                adminRemark 
            });
            fetchApplications();
            setShowRemarkModal(false);
            setAdminRemark('');
            setSelectedApp(null);
            setPendingAction(null);
        } catch (err) {
            console.error("Status update error:", err);
            alert("Failed to update application status.");
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'advance_salary': return <Banknote className="w-5 h-5 text-emerald-600" />;
            case 'leave': return <Calendar className="w-5 h-5 text-indigo-600" />;
            case 'emergency_leave': return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'salary_request': return <Landmark className="w-5 h-5 text-amber-600" />;
            default: return <FileText className="w-5 h-5 text-slate-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl gap-4">
                <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Human Capital Registry</div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic">Application Portal</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Managing Leaves, Advance Salaries & Special Requests</p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <div className="flex bg-slate-100 p-1 rounded-2xl flex-1 overflow-x-auto">
                        {['', 'pending', 'approved', 'rejected'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterStatus === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {s || 'All Status'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 overflow-x-auto">
                    <div className="flex bg-slate-50/50 p-1 rounded-2xl flex-1 justify-around">
                        {['', 'advance_salary', 'leave', 'emergency_leave', 'salary_request'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterType === t ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {t ? t.replace('_', ' ') : 'All Types'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                                <th className="p-8">Staff & Identity</th>
                                <th className="p-8">Application Type</th>
                                <th className="p-8">Details / Reasoning</th>
                                <th className="p-8">Financial / Timeline</th>
                                <th className="p-8">Current Phase</th>
                                <th className="p-8 text-right">Intervention</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-24 text-center">
                                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[11px] italic">Synchronizing Application Database...</p>
                                    </td>
                                </tr>
                            ) : applications.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-32 text-center text-slate-400 font-black uppercase italic tracking-[0.2em] opacity-40">
                                        No authorized applications found in this sector.
                                    </td>
                                </tr>
                            ) : applications.map((app, i) => (
                                <motion.tr 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={app._id} 
                                    className="hover:bg-indigo-50/20 transition-colors group"
                                >
                                    <td className="p-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-slate-100 rounded-3xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 uppercase shadow-inner text-xl">
                                                {app.staffId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 leading-none mb-1.5 text-lg uppercase tracking-tight">{app.staffId?.name}</div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                    {app.staffId?.role} Registry
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                                                {getTypeIcon(app.type)}
                                            </div>
                                            <span className="font-black text-slate-700 text-xs uppercase tracking-widest">{app.type.replace('_', ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="max-w-xs space-y-1">
                                            <p className="font-black text-slate-900 uppercase text-xs tracking-tight leading-tight">{app.title}</p>
                                            <p className="text-[11px] font-bold text-slate-400 italic line-clamp-2 leading-relaxed">"{app.description}"</p>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col gap-1.5">
                                            {app.amount ? (
                                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 w-fit">
                                                    <Banknote className="w-3.5 h-3.5" />
                                                    <span className="text-sm font-black italic">₹{app.amount}</span>
                                                </div>
                                            ) : app.startDate ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-tighter">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(app.startDate).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End: {new Date(app.endDate).toLocaleDateString()}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Standard Protocol</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border text-center ${getStatusColor(app.status)}`}>
                                                {app.status}
                                            </span>
                                            {app.adminRemark && (
                                                <div className="text-[9px] font-bold text-slate-400 italic flex items-center gap-1">
                                                    <Sparkle className="w-3 h-3" /> "{app.adminRemark}"
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        {app.status === 'pending' ? (
                                            <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                <button 
                                                    onClick={() => { setSelectedApp(app); setPendingAction('approved'); setShowRemarkModal(true); }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl transition shadow-xl shadow-emerald-600/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <BadgeCheck className="w-4 h-4" /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedApp(app); setPendingAction('rejected'); setShowRemarkModal(true); }}
                                                    className="bg-slate-900 hover:bg-red-600 text-white px-5 py-3 rounded-2xl transition shadow-xl shadow-slate-900/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <XCircle className="w-4 h-4" /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end pr-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
                                                    <CheckCircle className="w-5 h-5 opacity-40" />
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Remark Modal */}
            <AnimatePresence>
                {showRemarkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 md:p-12 border-4 border-indigo-50"
                        >
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic">Official Verdict</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-8">
                                Application ID: {selectedApp._id.slice(-8).toUpperCase()} | Action: <span className={pendingAction === 'approved' ? 'text-emerald-500' : 'text-red-500'}>{pendingAction}</span>
                            </p>
                            
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-2 italic">Admin Observation / Feedback</label>
                                    <textarea 
                                        rows="4"
                                        value={adminRemark}
                                        onChange={(e) => setAdminRemark(e.target.value)}
                                        placeholder="Enter your justified remarks here..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 tracking-tight"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => { setShowRemarkModal(false); setAdminRemark(''); }}
                                        className="flex-1 px-8 py-5 rounded-3xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px] transition"
                                    >
                                        Cancel Protocol
                                    </button>
                                    <button 
                                        onClick={handleUpdateStatus}
                                        className={`flex-[2] px-8 py-5 rounded-3xl text-white font-black uppercase tracking-widest text-[10px] shadow-2xl transition active:scale-95 ${
                                            pendingAction === 'approved' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-slate-900 shadow-slate-900/30'
                                        }`}
                                    >
                                        Confirm & Process Application
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminApplications;
