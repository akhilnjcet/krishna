import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { 
    Clock, 
    Calendar, 
    TrendingUp, 
    CheckCircle2, 
    ChevronRight,
    ArrowUpRight,
    Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

const StaffDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const stats = [
        { label: 'Attendance', value: 'Verified', sub: 'Today, 09:12 AM', icon: Clock, color: 'bg-emerald-50 text-emerald-600', link: '/staff/attendance' },
        { label: 'Pending Tasks', value: '04', sub: '02 High Priority', icon: CheckCircle2, color: 'bg-amber-50 text-amber-600', link: '/staff/tasks' },
        { label: 'Leave Balance', value: '12 Days', sub: 'Available for 2026', icon: Calendar, color: 'bg-indigo-50 text-indigo-600', link: '/staff/leave' },
        { label: 'Monthly Earnings', value: '₹ 42,500', sub: 'Next payout in 4 days', icon: TrendingUp, color: 'bg-violet-50 text-violet-600', link: '/staff/salary' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* Upper Banner */}
            <div className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden text-white shadow-2xl shadow-indigo-200">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <img src="https://www.svgrepo.com/show/491500/dashboard.svg" alt="bg" className="w-48 h-48 grayscale brightness-200" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="bg-indigo-500/30 w-fit px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-400">
                        Operational Status: Online
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                            Welcome back, {user?.name?.split(' ')[0] || 'Operator'}
                        </h1>
                        <p className="text-indigo-100 font-medium md:text-lg">
                            You have 4 structural tasks remaining for the current shift.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <button 
                            onClick={() => navigate('/staff/attendance')}
                            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-lg"
                        >
                            Mark Attendance <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => navigate('/staff/progress')}
                            className="bg-indigo-500/50 backdrop-blur-sm border border-indigo-400 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-400 transition-colors"
                        >
                            Submit Daily Report <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        onClick={() => navigate(stat.link)}
                        className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`${stat.color} p-3 rounded-xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <button className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.sub}</span>
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"></div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Task List Preview */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Assigned Tasks</h2>
                            <p className="text-sm text-slate-400 font-medium">Active structural & fabrication assignments.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/staff/tasks')}
                            className="text-indigo-600 text-sm font-bold hover:underline underline-offset-4"
                        >
                            View All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                                <div className="w-4 h-4 rounded-full border-2 border-indigo-400 flex-shrink-0 group-hover:bg-indigo-400 transition-all"></div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800">Welding for Main Gate #402</h4>
                                    <p className="text-xs text-slate-400 font-medium">Priority: High • Due Today</p>
                                </div>
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded">In Progress</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Meter */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center">
                        <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-black border-4 border-white shadow-lg shadow-indigo-100">
                            94%
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Efficiency Score</h3>
                        <p className="text-sm text-slate-400 font-medium px-4">Your productivity is 12% higher than last week!</p>
                        <div className="mt-8 space-y-3">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 w-[94%] rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/40 transition-all duration-700"></div>
                        <h3 className="text-lg font-bold mb-4 relative z-10">Advanced Module</h3>
                        <p className="text-slate-400 text-sm mb-6 relative z-10 leading-relaxed font-medium">Request advance salary or manage extra-time bonuses directly.</p>
                        <button 
                            onClick={() => navigate('/staff/salary')}
                            className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                        >
                            Open Finance Tool
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StaffDashboard;
