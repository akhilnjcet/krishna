import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, Clock, CheckCircle2, XCircle, 
    ChevronRight, Calendar, Wallet, History,
    Search, Filter, Plus, Info, AlertCircle
} from 'lucide-react';

const StaffApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const res = await api.get('/applications');
            setApplications(res.data);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyles = (status) => {
        switch(status?.toLowerCase()) {
            case 'approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'leave': return <Calendar className="w-4 h-4" />;
            case 'advance_salary': return <Wallet className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const filtered = applications.filter(app => {
        const matchesType = filterType === 'all' || app.type === filterType;
        const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             app.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="mobile-p-reset space-y-8 animate-in fade-in duration-500 force-full-width">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        My Applications
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Track your submitted leave and salary requests in real-time.</p>
                </div>
            </header>

            {/* Application Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 flex flex-wrap gap-2">
                    {['all', 'leave', 'advance_salary'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                filterType === type 
                                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-lg shadow-slate-200' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                            }`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="md:col-span-4 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search applications..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* Application Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4 mobile-table-scroll">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 opacity-50">
                            <Clock className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Registry...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100">
                            <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold italic">No matching applications found.</p>
                        </div>
                    ) : (
                        filtered.map((app, index) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={app._id}
                                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                            >
                                <div className="flex items-start gap-5">
                                    <div className={`p-4 rounded-2xl ${
                                        app.type === 'leave' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {getTypeIcon(app.type)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{app.title}</h3>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">#{app._id.slice(-6)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md">{app.description}</p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 ring-1 ring-slate-100 px-2 py-0.5 rounded-md">
                                                <History className="w-3 h-3" /> {new Date(app.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 self-end md:self-center">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest ${getStatusStyles(app.status)}`}>
                                        {app.status}
                                    </span>
                                    <div className="p-2 transition-transform group-hover:translate-x-1">
                                        <ChevronRight className="w-5 h-5 text-slate-200" />
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                    <div className="bg-[#0F172A] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 filter blur-[80px] opacity-20"></div>
                        <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-400" /> Processing Status
                        </h4>
                        <div className="space-y-6 relative z-10">
                            {[
                                { status: 'Pending', desc: 'Application is awaiting administrative review.', color: 'bg-amber-400' },
                                { status: 'Approved', desc: 'Request authorized and scheduled.', color: 'bg-emerald-400' },
                                { status: 'Rejected', desc: 'Request declined by operations lead.', color: 'bg-rose-400' }
                            ].map(s => (
                                <div key={s.status} className="flex gap-4">
                                    <div className={`w-1.5 h-auto ${s.color} rounded-full`}></div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest mb-1">{s.status}</p>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-[2.5rem] p-8 border border-blue-100">
                        <h4 className="text-blue-900 font-black text-sm uppercase tracking-widest mb-3">Operational Note</h4>
                        <p className="text-blue-700 text-xs font-semibold leading-relaxed uppercase italic">
                            All applications are reviewed daily at 09:00 AM and 05:00 PM. Emergent requests should be flagged via the support channel.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffApplications;
