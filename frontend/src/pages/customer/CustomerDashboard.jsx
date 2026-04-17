import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    ArrowRight, MessageSquare, Briefcase, Zap, Settings, Loader2, FileText,
    TrendingUp, Wallet, ShieldCheck, Activity, ChevronRight, Search, Bed
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ReportHeader from '../../components/ReportHeader';

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

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [projRes, financeRes] = await Promise.all([
                api.get('/customer/projects'),
                api.get('/finance/customer-dues')
            ]);
            
            const projectsList = Array.isArray(projRes.data) ? projRes.data : [];
            setProjects(projectsList);
            
            if (financeRes.data) {
                setFinance({
                    ...financeRes.data,
                    balancePercentage: (financeRes.data.totalPaid / financeRes.data.totalInvoiced) * 100 || 0
                });
            }

            if (projectsList.length > 0) {
                handleProjectSelect(projectsList[0]._id, projectsList);
            }
        } catch (err) {
            console.error('Dashboard relay error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = async (projectId, existingProjects) => {
        const proj = (existingProjects || projects).find(p => p._id === projectId);
        if (!proj) return;
        
        setSelectedProject(proj);
        setUpdatesLoading(true);
        try {
            const res = await api.get(`/customer/projects/${projectId}/updates`);
            setUpdates(Array.isArray(res.data.updates) ? res.data.updates : []);
        } catch (err) {
            console.error('Updates fetch error:', err);
        } finally {
            setUpdatesLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <Activity className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="font-bold text-xs uppercase tracking-[0.3em] text-slate-400">Synchronizing Project Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <ReportHeader 
                title="Management Terminal"
                subtitle="Command-level oversight of active engineering projects and payments."
                data={projects.map(p => [
                    p.title,
                    p.serviceType,
                    `${p.progress}%`,
                    new Date(p.deadline).toLocaleDateString(),
                    p.status || 'Active'
                ])}
                columns={['Project Name', 'Type', 'Progress', 'Deadline', 'Status']}
            />

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Engagement', value: `₹${(finance.totalInvoiced || 0).toLocaleString()}`, icon: Wallet, color: 'blue' },
                    { label: 'Settled Amount', value: `₹${(finance.totalPaid || 0).toLocaleString()}`, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Current Dues', value: `₹${(finance.remainingDues || 0).toLocaleString()}`, icon: AlertTriangle, color: 'rose' },
                    { label: 'Project Equity', value: `${Math.round(finance.balancePercentage || 0)}%`, icon: TrendingUp, color: 'amber' }
                ].map((item, i) => (
                    <div key={i} className="bg-white dark:bg-dark-surface p-6 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
                        <div className={`w-12 h-12 bg-${item.color}-50 dark:bg-blue-950/30 text-${item.color}-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] dark:text-dark-muted mb-1">{item.label}</p>
                        <p className="text-2xl font-bold text-[#111827] dark:text-dark-text font-poppins">{item.value}</p>
                    </div>
                ))}
                {/* Dedicated Lodge Utility */}
                <div 
                    onClick={() => window.location.href = '/lodge'}
                    className="bg-indigo-600 p-6 rounded-3xl border border-indigo-500 shadow-xl shadow-indigo-200 cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Bed className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 text-white">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                             <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Facility Residency
                        </p>
                        <h4 className="text-xl font-bold font-poppins mb-1">Book a Residency Suite</h4>
                        <p className="text-[10px] opacity-70 font-medium italic">Premium check-ins for site visits</p>
                        <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-white/10 w-fit px-4 py-2 rounded-xl backdrop-blur-md group-hover:bg-white/20 transition-all">
                            Open Lodge CRM <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Fixed Sidebar: Unit Selection */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm p-8 overflow-hidden relative">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-[#111827] dark:text-dark-text">Active Work Units</h3>
                            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">{projects.length} Total</div>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {projects.map(project => (
                                <button 
                                    key={project._id}
                                    onClick={() => handleProjectSelect(project._id)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all group flex items-center justify-between ${
                                        selectedProject?._id === project._id 
                                        ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-900/20' 
                                        : 'border-transparent bg-[#F8FAFC] dark:bg-dark-bg hover:bg-slate-100 dark:hover:bg-blue-900/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                                            selectedProject?._id === project._id ? 'bg-[#2563EB] text-white' : 'bg-white dark:bg-dark-surface text-[#6B7280] border border-slate-200 dark:border-dark-border'
                                        }`}>
                                            {project.title.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selectedProject?._id === project._id ? 'text-[#111827] dark:text-dark-text' : 'text-[#6B7280] dark:text-dark-muted'}`}>{project.title}</p>
                                            <p className="text-[10px] font-medium text-[#9CA3AF] mt-0.5">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedProject?._id === project._id ? 'text-[#2563EB] translate-x-1' : 'text-slate-300 dark:text-dark-muted'}`} />
                                </button>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-center py-12 bg-slate-50 dark:bg-dark-bg rounded-2xl border-2 border-dashed border-slate-200 dark:border-dark-border">
                                    <Search className="w-10 h-10 text-slate-300 dark:text-dark-muted mx-auto mb-4 opacity-50" />
                                    <p className="text-xs font-bold text-slate-400 dark:text-dark-muted uppercase tracking-widest leading-relaxed">No project units linked<br/>to this account</p>
                                </div>
                            )}
                        </div>

                        <Link to="/quote" className="mt-8 flex items-center justify-center gap-3 w-full py-4 bg-[#F8FAFC] dark:bg-dark-bg hover:bg-blue-50 dark:hover:bg-blue-900/10 border-2 border-dashed border-slate-200 dark:border-dark-border hover:border-blue-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#6B7280] dark:text-dark-muted hover:text-[#2563EB] transition-all">
                            <Zap className="w-4 h-4" /> Request Commission
                        </Link>
                    </div>
                </div>

                {/* Main Insight Engine */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    {selectedProject ? (
                        <>
                            {/* Hero Card for Selected Project */}
                            <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] dark:from-[#0B1222] dark:to-[#1E3A8A] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10 transition-all duration-500">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
                                <div className="relative z-10">
                                    <div className="flex flex-wrap items-center gap-3 mb-8">
                                        <span className="bg-yellow-400 text-blue-900 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg">Live Operation</span>
                                        <span className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] opacity-80">{selectedProject.serviceType}</span>
                                    </div>
                                    <h2 className="text-4xl font-bold font-poppins tracking-tight mb-8 leading-tight">{selectedProject.title}</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-blue-100 italic">
                                                <span>Work Progress</span>
                                                <span className="text-yellow-300 font-black">{selectedProject.progress}% Solid</span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]" style={{ width: `${selectedProject.progress}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white/10 dark:bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                                            <Clock className="w-8 h-8 text-blue-200" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 opacity-80">Timeline Milestone</p>
                                                <p className="text-lg font-bold">ETA: {new Date(selectedProject.deadline).toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Logistics Feed */}
                            <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-[#E2E8F0] dark:border-dark-border shadow-sm p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-2xl font-bold text-[#111827] dark:text-dark-text font-poppins flex items-center gap-4">
                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        Activity Logistics
                                    </h3>
                                    <button className="text-[11px] font-bold text-blue-600 uppercase tracking-widest hover:underline transition-all">Export Report</button>
                                </div>

                                {updatesLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center opacity-50">
                                        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 relative ml-4 border-l-2 border-slate-100 dark:border-dark-border pl-10 pr-2">
                                        {updates.map((update) => (
                                            <div 
                                                key={update._id}
                                                className="bg-[#F8FAFC]/50 dark:bg-dark-bg/50 p-8 rounded-3xl border border-[#E2E8F0] dark:border-dark-border relative hover:bg-white dark:hover:bg-dark-surface hover:border-blue-100 dark:hover:border-blue-900/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                                            >
                                                <div className="absolute top-1/2 -left-[51px] w-5 h-5 bg-white dark:bg-dark-surface border-4 border-blue-500 rounded-full group-hover:scale-125 transition-transform" />
                                                
                                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                                                            {update.staffId?.name?.charAt(0) || 'S'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-[#111827] dark:text-dark-text">{update.staffId?.name}</p>
                                                            <p className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-dark-muted tracking-wider italic">{update.staffId?.designation} • {new Date(update.date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 ${
                                                        update.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30'
                                                    }`}>
                                                        {update.status}
                                                    </span>
                                                </div>
                                                
                                                <h4 className="text-xl font-bold text-[#111827] dark:text-dark-text mb-3 font-poppins">{update.title}</h4>
                                                <p className="text-[#6B7280] dark:text-dark-muted text-sm font-medium leading-relaxed mb-6">{update.description}</p>
                                                
                                                {update.photos?.length > 0 && (
                                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                        {update.photos.map((p, idx) => (
                                                            <div key={idx} className="flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-dark-border shadow-lg group-hover:ring-blue-50 transition-all">
                                                                <img src={p.url} alt="Site" className="w-full h-full object-cover grayscale-0 hover:scale-110 transition-transform duration-500" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {updates.length === 0 && (
                                            <div className="py-20 text-center bg-slate-50/50 dark:bg-dark-bg/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-dark-border">
                                                <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-dark-muted mx-auto mb-4 opacity-50" />
                                                <p className="text-xs font-bold text-slate-400 dark:text-dark-muted uppercase tracking-widest italic">Waiting for initial field report sequence...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white dark:bg-dark-surface rounded-[3rem] border border-slate-200 dark:border-dark-border border-dashed animate-pulse transition-colors">
                            <div className="p-8 bg-slate-50 dark:bg-dark-bg rounded-[2.5rem] border border-slate-200 dark:border-dark-border mb-8 opacity-40">
                                <Construction className="w-20 h-20 text-slate-400 dark:text-dark-muted" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 dark:text-dark-muted uppercase tracking-[0.5em] italic">Select Operation Center to Relay Feed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;
