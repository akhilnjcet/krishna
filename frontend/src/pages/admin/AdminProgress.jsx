import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { 
    Layout, Filter, Search, Calendar, User, Clock, CheckCircle2, 
    AlertCircle, FileText, BarChart, ChevronDown, ChevronUp,
    Image as ImageIcon, Trash2, Eye, Download, Info, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminProgress = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/progress/all');
            setReports(res.data);
        } catch (err) {
            console.error('Error fetching progress:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanentely remove this progress report?')) return;
        try {
            await api.delete(`/progress/delete/${id}`);
            fetchReports();
        } catch (error) {
            console.error('Delete Job Error:', error);
            alert('Failed to delete report');
        }
    };

    const filteredReports = reports.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase flex items-center gap-3">
                        <BarChart className="w-10 h-10 text-indigo-600" />
                        PROD. MONITORING
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 ml-1">Work Site Operational Logs & Progress Tracking</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white border-2 border-slate-900 p-4 shadow-custom flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Logs</span>
                        <span className="text-2xl font-black text-slate-900">{reports.length}</span>
                    </div>
                    <div className="bg-indigo-600 border-2 border-slate-900 p-4 shadow-custom flex flex-col items-center min-w-[120px] text-white">
                        <span className="text-[10px] font-black uppercase text-indigo-200">Pending Review</span>
                        <span className="text-2xl font-black">{reports.filter(r => !r.isApproved).length}</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-6 border-4 border-slate-900 shadow-custom">
                <Filter className="w-5 h-5 text-slate-400" />
                {['all', 'In Progress', 'Completed', 'Not Started'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-6 py-2 font-black uppercase tracking-widest text-[10px] border-2 transition-all ${
                            filter === f ? 'bg-indigo-600 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredReports.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-200 p-20 rounded-[2.5rem] text-center">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-slate-400">No operational logs found in current stream</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredReports.map((report, idx) => (
                        <motion.div 
                            key={report._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white border-4 border-slate-900 overflow-hidden shadow-custom"
                        >
                            <div className="flex flex-col md:flex-row items-stretch">
                                {/* Side Status Bar */}
                                <div className={`w-2 ${report.status === 'Completed' ? 'bg-green-500' : 'bg-indigo-400'}`}></div>
                                
                                <div className="flex-grow p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border border-slate-200">Log #{report._id.substring(18)}</span>
                                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{report.projectId?.title || 'Unknown Project'}</h3>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase text-slate-400">
                                                <span className="flex items-center gap-1 text-slate-900 italic"><User className="w-3 h-3 text-indigo-600" /> {report.staffId?.name || 'Staff N/A'}</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {report.projectId?.location || 'Site Location'}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(report.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Completion</div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black text-slate-900">{report.progressPercentage}%</span>
                                                    <div className="w-24 h-2 bg-slate-100 border border-slate-200">
                                                        <div className="h-full bg-indigo-600" style={{ width: `${report.progressPercentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setExpandedId(expandedId === report._id ? null : report._id)}
                                                    className="p-2 bg-slate-100 hover:bg-slate-900 hover:text-white transition-all border-2 border-slate-950 shadow-sm"
                                                >
                                                    {expandedId === report._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(report._id)}
                                                    className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all border-2 border-slate-950 shadow-sm"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border-L-4 border-indigo-600 p-4 mb-4">
                                        <h4 className="text-xs font-black uppercase text-indigo-600 mb-2 tracking-widest">{report.title}</h4>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{report.description}</p>
                                    </div>

                                    <AnimatePresence>
                                        {expandedId === report._id && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t-2 border-slate-100 mt-6 pt-6"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2">
                                                                <Info className="w-3 h-3" /> Materials Deployed
                                                            </h5>
                                                            <p className="text-xs font-bold text-slate-900 bg-white p-3 border-2 border-slate-100 italic">{report.materialsUsed || 'None listed'}</p>
                                                        </div>
                                                        <div>
                                                            <h5 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-2 flex items-center gap-2">
                                                                <AlertCircle className="w-3 h-3" /> Blockers / Issues
                                                            </h5>
                                                            <p className="text-xs font-bold text-slate-900 bg-red-50 p-3 border-2 border-red-100">{report.issues || 'No issues reported'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2">
                                                                <Clock className="w-3 h-3" /> Next Phase Intent
                                                            </h5>
                                                            <p className="text-xs font-bold text-slate-900 bg-indigo-50 p-3 border-2 border-indigo-100">{report.nextPlan || 'Awaiting schedule'}</p>
                                                        </div>
                                                        <div className="flex gap-4 pt-2">
                                                            <button className="flex-grow bg-slate-900 text-white py-3 px-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-custom">
                                                                <Download className="w-3 h-3 text-indigo-400" /> Export PDF
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                                                            <ImageIcon className="w-3 h-3" /> Site Evidence ({report.photos?.length || 0})
                                                        </h5>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {report.photos?.map((photo, pIdx) => (
                                                                <a key={pIdx} href={photo.url} target="_blank" rel="noreferrer" className="aspect-square border-2 border-slate-200 hover:border-indigo-600 transition-colors cursor-zoom-in group relative overflow-hidden">
                                                                    <img src={getDirectImageUrl(photo.url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Site" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                                        <Eye className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </a>
                                                            ))}
                                                            {(!report.photos || report.photos.length === 0) && (
                                                                <div className="col-span-3 py-6 bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                                                                    <ImageIcon className="w-6 h-6 text-slate-200 mb-1" />
                                                                    <span className="text-[8px] font-black uppercase text-slate-300">No Visual Assets</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .shadow-custom {
                    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
                }
            `}</style>
        </div>
    );
};

export default AdminProgress;
