import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { 
    Construction, Clock, CheckCircle2, AlertTriangle, 
    ArrowRight, MessageSquare, Briefcase, Zap, Settings, Loader2, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomerDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [updatesLoading, setUpdatesLoading] = useState(false);
    const [finance, setFinance] = useState({
        totalInvoiced: 0,
        totalPaid: 0,
        remainingDues: 0,
        balancePercentage: 0
    });
    const [quotes, setQuotes] = useState([]);

    useEffect(() => {
        fetchProjects();
        fetchFinance();
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await api.get('/quotes/my-quotes');
            setQuotes(res.data);
        } catch (err) {
            console.error('Quotes fetch error:', err);
        }
    };

    const fetchFinance = async () => {
        try {
            const res = await api.get('/finance/customer-dues');
            setFinance({
                ...res.data,
                balancePercentage: (res.data.totalPaid / res.data.totalInvoiced) * 100 || 0
            });
        } catch (err) {
            console.error('Finance fetch error:', err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/customer/projects');
            setProjects(res.data);
            if (res.data.length > 0) {
                handleProjectSelect(res.data[0]._id);
            }
        } catch (err) {
            console.error('Project fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = async (projectId) => {
        const proj = projects.find(p => p._id === projectId) || projects[0];
        setSelectedProject(proj);
        setUpdatesLoading(true);
        try {
            const res = await api.get(`/customer/projects/${projectId}/updates`);
            setUpdates(res.data.updates);
        } catch (err) {
            console.error('Updates fetch error:', err);
        } finally {
            setUpdatesLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 bg-brand-50">
                <Loader2 className="w-12 h-12 text-brand-950 animate-spin mb-4" />
                <p className="font-black text-[10px] uppercase tracking-[0.4em] text-gray-500">Establishing Secure Uplink...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 font-sans">
            
            {/* FINANCIAL SNAPSHOT */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Invoiced', value: `₹ ${finance.totalInvoiced?.toLocaleString()}`, icon: Briefcase, color: 'brand' },
                    { label: 'Cleared Funds', value: `₹ ${finance.totalPaid?.toLocaleString()}`, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Outstanding Dues', value: `₹ ${finance.remainingDues?.toLocaleString()}`, icon: AlertTriangle, color: 'rose' },
                    { label: 'Account Yield', value: `${Math.round(finance.balancePercentage)}%`, icon: Zap, color: 'amber' }
                ].map((item, i) => (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-white border-4 border-brand-950 p-6 flex items-center gap-6 shadow-solid group hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all"
                    >
                        <div className={`p-4 bg-brand-50 rounded-xl group-hover:bg-brand-accent transition-colors`}>
                            <item.icon className="w-6 h-6 text-brand-950" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">{item.label}</p>
                            <p className="text-xl font-black text-brand-950 italic">{item.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* QUOTE TRACKING SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Applied Quotes', value: quotes.length, icon: MessageSquare, color: 'blue' },
                    { label: 'Under Review', value: quotes.filter(q => q.status === 'reviewed').length, icon: Clock, color: 'indigo' },
                    { label: 'Authorized Jobs', value: quotes.filter(q => q.status === 'accepted').length, icon: FileText, color: 'emerald' }
                ].map((item, i) => (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + (i * 0.1) }}
                        key={i} 
                        className="bg-brand-950 text-white p-6 border-l-8 border-brand-accent shadow-2xl flex items-center justify-between"
                    >
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-accent mb-2">{item.label}</p>
                            <p className="text-3xl font-black italic">{item.value}</p>
                        </div>
                        <item.icon className="w-8 h-8 opacity-20" />
                    </motion.div>
                ))}
            </div>

            {/* PROJECTS SNAPSHOT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 border-4 border-brand-950 bg-white p-8 relative overflow-hidden shadow-solid flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Briefcase className="w-32 h-32" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-2">Portfolio Overview</div>
                        <div className="text-4xl font-black text-brand-950 uppercase tracking-tighter leading-none mb-6 italic">Active <span className="text-brand-accent">Units</span></div>
                        <div className="space-y-4">
                            {projects.map(project => (
                                <button 
                                    key={project._id}
                                    onClick={() => handleProjectSelect(project._id)}
                                    className={`w-full text-left p-4 border-4 transition-all flex items-center justify-between ${selectedProject?._id === project._id ? 'border-brand-950 bg-brand-accent shadow-solid' : 'border-brand-100 hover:border-brand-300 bg-brand-50'}`}
                                >
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">PRJ-ID: {project._id.slice(-6).toUpperCase()}</div>
                                        <div className="text-xs font-black uppercase tracking-tight">{project.title}</div>
                                    </div>
                                    {selectedProject?._id === project._id && <ArrowRight className="w-4 h-4" />}
                                </button>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-gray-400 text-[10px] py-10 text-center font-black uppercase tracking-widest border-4 border-dashed border-brand-100">Zero active deployments found</div>
                            )}
                        </div>
                    </div>
                    <Link to="/quote" className="mt-10 bg-brand-950 text-white p-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-brand-800 transition-colors">
                        Deploy New Project <Zap className="w-4 h-4 text-brand-accent" />
                    </Link>
                </div>

                {/* PROJECT INTELLIGENCE */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedProject ? (
                        <>
                            <div className="bg-brand-950 text-white p-10 border-b-8 border-brand-accent relative overflow-hidden shadow-2xl skew-x-[-1deg] ml-1">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform skew-x-[1deg]">
                                    <Construction className="w-48 h-48" />
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 transform skew-x-[1deg]">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="bg-brand-accent text-brand-950 text-[10px] font-black px-3 py-1 uppercase tracking-widest leading-none">Status: {selectedProject.status}</span>
                                            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest opacity-60 italic">| {selectedProject.serviceType}</span>
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 italic">{selectedProject.title}</h2>
                                        <div className="flex items-center gap-3 text-gray-500 text-xs font-black uppercase tracking-widest">
                                            <Clock className="w-4 h-4" /> Expected Completion: {new Date(selectedProject.deadline).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-6 border-l-4 border-brand-accent backdrop-blur-3xl min-w-[200px]">
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-4 text-brand-accent">Production Yield</div>
                                        <div className="flex items-end gap-3">
                                            <span className="text-5xl font-black leading-none">{selectedProject.progress}%</span>
                                            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-1">
                                                <div className="bg-brand-accent h-full shadow-[0_0_10px_#FFB612]" style={{ width: `${selectedProject.progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FIELD UPDATES (SUDDEN INFORMATION PASSING) */}
                            <div className="border-4 border-brand-950 bg-white p-8 shadow-solid">
                                <h3 className="text-brand-950 font-black text-[10px] uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                                    <MessageSquare className="w-4 h-4" /> Operational Intelligence Feed
                                </h3>

                                {updatesLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 text-brand-950 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {updates.map((update, i) => (
                                            <motion.div 
                                                key={update._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex flex-col md:flex-row gap-6 border-l-8 border-brand-Accent bg-brand-50 p-6 relative overflow-hidden group hover:bg-brand-100 transition-colors"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-700">
                                                    <Settings className={update.status === 'Completed' ? "text-green-500 w-16 h-16" : "text-brand-950 w-16 h-16"} />
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 bg-brand-950 flex items-center justify-center font-black text-brand-accent text-xl border-2 border-brand-800">
                                                        {update.staffId?.name?.charAt(0) || 'S'}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase text-brand-950 tracking-widest">{update.staffId?.name} <span className="text-gray-400 font-bold ml-2">[{update.staffId?.designation}]</span></div>
                                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{new Date(update.date).toLocaleString()}</div>
                                                        </div>
                                                        <div className="px-3 py-1 bg-white border-2 border-brand-950 text-[8px] font-black uppercase tracking-widest">{update.status}</div>
                                                    </div>
                                                    <h4 className="text-lg font-black uppercase tracking-tight mb-2 text-brand-950 italic">{update.title}</h4>
                                                    <p className="text-xs font-bold text-brand-600 uppercase tracking-tight leading-relaxed line-clamp-2 italic">{update.description}</p>
                                                    {update.photos?.length > 0 && (
                                                        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                                                            {update.photos.map((p, idx) => (
                                                                <img key={idx} src={p.url} alt="Update" className="w-24 h-24 object-cover border-4 border-white shadow-md grayscale hover:grayscale-0 transition-all cursor-zoom-in" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {updates.length === 0 && (
                                            <div className="text-center py-20 bg-brand-50 border-4 border-dashed border-brand-100 italic rounded-2xl">
                                                <AlertTriangle className="w-12 h-12 text-brand-200 mx-auto mb-4" />
                                                <p className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-400">Awaiting secure field update from site operators...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-40 bg-brand-50 border-8 border-dashed border-brand-100 italic flex flex-col items-center justify-center">
                            <Construction className="w-20 h-20 text-brand-200 mb-8" />
                            <p className="font-black uppercase tracking-[0.4em] text-[10px] text-gray-400">Select a project unit to initialize intelligence relay</p>
                        </div>
                    )}
                </div>
            </div>

            {/* QUICK CONTACT MATRIX */}
            <div className="bg-brand-950 p-10 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 skew-x-[1deg] mr-1">
                <div className="md:col-span-2 transform skew-x-[-1deg]">
                    <h3 className="text-white font-black text-2xl uppercase tracking-tighter italic mb-4">Direct Command Link</h3>
                    <p className="text-gray-400 font-bold uppercase tracking-tight text-xs max-w-xl">Emergency field contact and instantaneous data relay for expedited project adjustments.</p>
                </div>
                <div className="flex items-center justify-end transform skew-x-[-1deg]">
                    <button className="bg-brand-accent text-brand-950 px-10 py-4 font-black uppercase tracking-widest text-xs border-4 border-white shadow-solid hover:bg-white transition-all active:scale-95">Initiate Comms</button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;
