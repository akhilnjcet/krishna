import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Clock, Lock, ArrowUpRight, 
  TrendingUp, Activity, UserCheck, ShieldCheck, Mail, Briefcase 
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeStaff: 0,
        todayLogs: 0,
        registeredFaces: 0,
        pendingLeaves: 0
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [staffRes, logsRes, leaveRes] = await Promise.all([
                api.get('/staff'),
                api.get('/attendance'),
                api.get('/leave')
            ]);
            
            const staffList = staffRes.data;
            const logsList = logsRes.data;
            const leaveList = leaveRes.data;
            const today = new Date().toISOString().split('T')[0];

            setStats({
                totalStaff: staffList.length,
                activeStaff: staffList.filter(s => s.status === 'active').length,
                todayLogs: logsList.filter(l => l.date === today && l.status === 'success').length,
                registeredFaces: staffList.filter(s => s.faceDescriptor?.length > 0).length,
                pendingLeaves: leaveList.filter(l => l.status === 'pending').length
            });

            setRecentLogs(logsList.slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 space-y-12 bg-slate-50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-slate-900 leading-tight">
                    Welcome back, <span className="text-indigo-600">Administrator</span>.
                </h1>
                <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Here's what's happening at Krishna Engineering today.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Workforce', value: stats.totalStaff, icon: Users, color: 'indigo' },
                    { label: 'Today Verified', value: stats.todayLogs, icon: UserCheck, color: 'emerald' },
                    { label: 'Biometrics Active', value: stats.registeredFaces, icon: ShieldCheck, color: 'amber' },
                    { label: 'Pending Requests', value: stats.pendingLeaves, icon: Calendar, color: 'rose' }
                ].map((item, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 group hover:border-indigo-500/30 transition-all duration-300"
                    >
                        <div className={`w-14 h-14 bg-${item.color}-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <item.icon className={`w-7 h-7 text-${item.color}-600`} />
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">{item.label}</p>
                        <p className={`text-4xl font-black text-slate-900`}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-indigo-600" />
                            Recent Verification Activity
                        </h2>
                        <button 
                            onClick={() => navigate('/admin/logs')}
                            className="text-indigo-600 font-bold flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            View All <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                             <div className="h-64 flex items-center justify-center text-slate-400">Loading data...</div>
                        ) : recentLogs.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
                                <Activity className="w-12 h-12 opacity-20" />
                                No login activity yet today.
                            </div>
                        ) : recentLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-indigo-50/50 transition duration-300 border-l-4 border-l-indigo-500">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-indigo-600 shadow-sm">
                                        {(log.full_name || log.name || 'S').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-900">{log.full_name || log.name}</p>
                                        <p className="text-sm text-slate-500 font-medium">Verified from {log.device_ip}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-indigo-600 text-sm">{(log.face_match_confidence * 100).toFixed(1)}% Match</p>
                                    <p className="text-xs text-slate-400 uppercase font-bold mt-1">{new Date(log.login_time).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Info / Security */}
                <div className="space-y-6">
                    <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-600/30 relative overflow-hidden">
                        <Lock className="absolute -right-5 -bottom-5 w-48 h-48 opacity-10" />
                        <h3 className="text-2xl font-black mb-4">Security Advisory</h3>
                        <p className="text-indigo-100 font-medium leading-relaxed mb-6"> Ensure all staff members have registered their biometrics to maintain full attendance accuracy. </p>
                        <ul className="space-y-3 font-bold text-sm">
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-300 rounded-full" />
                                Review pending descriptors
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-300 rounded-full" />
                                Audit last 48h logs
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-300 rounded-full" />
                                Manage admin credentials
                            </li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl">
                        <h3 className="text-xl font-black text-slate-900 mb-6">Quick Links</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: 'Add Staff', icon: Users, color: 'emerald', path: '/admin/staff' },
                                { name: 'Audit Logs', icon: Clock, color: 'indigo', path: '/admin/logs' },
                                { name: 'Reports', icon: TrendingUp, color: 'amber', path: '/admin/reports' },
                                { name: 'Leave Reg', icon: Calendar, color: 'rose', path: '/admin/leave' },
                                { name: 'Settings', icon: Activity, color: 'slate', path: '/admin/settings' }
                            ].map((link, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => navigate(link.path)}
                                    className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60 hover:opacity-100 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
                                >
                                    <link.icon className="w-5 h-5 mb-2 text-slate-600 group-hover:text-indigo-600" />
                                    <span className="text-xs font-black uppercase text-slate-500 group-hover:text-indigo-600 tracking-tighter">{link.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
