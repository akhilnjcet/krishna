import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { generateGeneralReportPDF } from '../../services/pdfService';
import { 
  Users, Calendar, Clock, Lock, ArrowUpRight, 
  TrendingUp, Activity, UserCheck, ShieldCheck, 
  ArrowRight, ChevronRight, Search, Filter,
  Layers, Package, AlertCircle, Download, DoorOpen
} from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeStaff: 0,
        todayLogs: 0,
        registeredFaces: 0,
        pendingLeaves: 0,
        activeProjects: 0,
        pendingQuotes: 0
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleQuickReport = () => {
        const columns = ['System Parameter', 'Operational Value', 'Status'];
        const data = [
            ['Total Workforce', stats.totalStaff.toString(), 'Operational'],
            ['Active Projects', stats.activeProjects.toString(), 'In-Progress'],
            ['Attendance Verified', stats.todayLogs.toString(), 'Verified'],
            ['Pending Quotes', stats.pendingQuotes.toString(), 'Action Required'],
            ['Registered Biometrics', stats.registeredFaces.toString(), 'Secure'],
            ['Pending Compliances', stats.pendingLeaves.toString(), 'Internal']
        ];
        generateGeneralReportPDF(data, 'Institutional Operations Summary', columns);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [staffRes, logsRes, leaveRes, projectRes, quoteRes] = await Promise.all([
                api.get('/staff'),
                api.get('/attendance'),
                api.get('/leave'),
                api.get('/projects'),
                api.get('/quotes')
            ]);
            
            const staffList = Array.isArray(staffRes.data) ? staffRes.data : [];
            const logsList = Array.isArray(logsRes.data) ? logsRes.data : [];
            const leaveList = Array.isArray(leaveRes.data) ? leaveRes.data : [];
            const projectList = Array.isArray(projectRes.data) ? projectRes.data : [];
            const quoteList = Array.isArray(quoteRes.data) ? quoteRes.data : [];

            const today = new Date().toISOString().split('T')[0];

            setStats({
                totalStaff: staffList.length,
                activeStaff: staffList.filter(s => s.status === 'active').length,
                todayLogs: logsList.filter(l => l.date === today && l.status === 'success').length,
                registeredFaces: staffList.filter(s => s.faceDescriptor?.length > 0).length,
                pendingLeaves: leaveList.filter(l => l.status === 'pending').length,
                activeProjects: projectList.length,
                pendingQuotes: quoteList.filter(q => q.status === 'pending').length
            });

            setRecentLogs(logsList.slice(0, 6));
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header / Welcome Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-[#111827] dark:text-dark-text tracking-tight font-poppins">
                        Operations <span className="text-[#2563EB]">Overview</span>
                    </h1>
                    <p className="text-[#6B7280] dark:text-dark-muted mt-2 font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#2563EB]" />
                        Real-time system status for Krishna Engineering Works.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchDashboardData} className="px-5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#111827] hover:bg-[#F8FAFC] transition-all flex items-center gap-2 shadow-sm">
                        <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                    <button 
                        onClick={handleQuickReport}
                        className="px-5 py-2.5 bg-[#2563EB] rounded-xl text-sm font-bold text-white hover:bg-[#1D4ED8] transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Download className="w-4 h-4" /> Generate Report
                    </button>
                </div>
            </div>

            {/* High-Impact Stat Cards */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {[
                    { label: 'Total Workforce', value: stats.totalStaff, icon: Users, color: 'blue', desc: 'Active field staff' },
                    { label: 'Active Projects', value: stats.activeProjects, icon: Layers, color: 'indigo', desc: 'In-progress works' },
                    { label: 'Today Verified', value: stats.todayLogs, icon: UserCheck, color: 'emerald', desc: 'Facial recognition scans' },
                    { label: 'Pending Quotes', value: stats.pendingQuotes, icon: Filter, color: 'amber', desc: 'Awaiting response' }
                ].map((item, i) => (
                    <motion.div 
                        key={i} 
                        variants={itemVariants}
                        className="bg-white dark:bg-dark-surface p-8 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group relative overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.08] dark:opacity-[0.05] transition-opacity`}>
                            <item.icon className="w-full h-full" />
                        </div>
                        <div className={`w-14 h-14 bg-${item.color}-50 dark:bg-blue-950/30 text-${item.color}-600 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm`}>
                            <item.icon className="w-7 h-7" />
                        </div>
                        <p className="text-[#6B7280] dark:text-dark-muted font-bold uppercase tracking-widest text-[10px] mb-1">{item.label}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-bold text-[#111827] dark:text-dark-text">{item.value}</p>
                            <span className="text-[10px] font-bold text-emerald-600">+4%</span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] dark:text-dark-muted mt-4 font-medium">{item.desc}</p>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Activity Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm p-8 md:p-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-blue-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#111827] dark:text-dark-text">Security Log Activity</h2>
                                <p className="text-sm text-[#6B7280] dark:text-dark-muted font-medium">Real-time facial recognition status</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/admin/logs')}
                            className="bg-[#F8FAFC] text-[#2563EB] hover:bg-blue-50 p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                        >
                            View All <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                             <div className="h-64 flex items-center justify-center space-x-3">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                             </div>
                        ) : recentLogs.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-[#6B7280] dark:text-dark-muted gap-4">
                                <AlertCircle className="w-12 h-12 opacity-10" />
                                <p className="font-bold opacity-40">No activity captured yet today.</p>
                            </div>
                        ) : recentLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-5 border border-[#E2E8F0] dark:border-dark-border rounded-2xl hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all duration-300 group">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-[#F8FAFC] dark:bg-dark-bg rounded-2xl flex items-center justify-center font-bold text-[#2563EB] border border-[#E2E8F0] dark:border-dark-border shadow-sm transform group-hover:rotate-6 transition-transform">
                                        {(log.full_name || log.name || 'S').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#111827] dark:text-dark-text">{log.full_name || log.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-[#6B7280] dark:text-dark-muted font-medium mt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {log.login_time ? new Date(log.login_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                                            <span className="flex items-center gap-1 font-bold text-blue-600">{(Number(log.face_match_confidence || 0) * 100).toFixed(0)}% Confidence</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-[#6B7280] hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions & System Health */}
                <div className="space-y-8">
                    {/* Security Status Card */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                        <Lock className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.05] group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold">System Security</h3>
                            </div>
                            <p className="text-slate-300 text-sm font-medium leading-relaxed mb-8">
                                Biometric verification is active across all terminals. 3 unregistered attempts blocked today.
                            </p>
                            <div className="space-y-4">
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500 w-[92%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>Staff Coverage</span>
                                    <span className="text-white">92% Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Shortcuts */}
                    <div className="bg-white dark:bg-dark-surface rounded-3xl border border-[#E2E8F0] dark:border-dark-border p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-[#111827] dark:text-dark-text mb-8 flex items-center gap-2">
                            <Search className="w-4 h-4 text-blue-600" />
                            Command Shortcuts
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: 'Staff List', icon: Users, path: '/admin/staff', color: 'blue' },
                                { name: 'Audit Hub', icon: Clock, path: '/admin/logs', color: 'blue' },
                                { name: 'Lodge Manager', icon: DoorOpen, path: '/lodge/admin', color: 'indigo' },
                                { name: 'Gallery', icon: Layers, path: '/admin/portfolio', color: 'blue' }
                            ].map((link, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => navigate(link.path)}
                                    className="flex flex-col items-center justify-center p-5 bg-[#F8FAFC] dark:bg-dark-bg rounded-2xl border border-[#E2E8F0] dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-all group"
                                >
                                    <link.icon className="w-5 h-5 mb-3 text-[#6B7280] dark:text-dark-muted group-hover:text-[#2563EB] transition-colors" />
                                    <span className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-dark-muted group-hover:text-[#2563EB] tracking-wider text-center">{link.name}</span>
                                </button>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-4 border-2 border-dashed border-[#E2E8F0] dark:border-dark-border rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#6B7280] dark:text-dark-muted hover:text-[#2563EB] hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                            Customize Layout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
