import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { 
    Clock, 
    Calendar, 
    TrendingUp, 
    CheckCircle2, 
    ChevronRight,
    ArrowUpRight,
    Plus,
    Activity,
    ShieldCheck,
    Zap,
    Briefcase,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react';

const StaffDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const stats = [
        { label: 'Shift Attendance', value: 'Verified', sub: 'Today, 09:12 AM', icon: Clock, color: 'emerald', link: '/staff/attendance' },
        { label: 'Structural Tasks', value: '04 Units', sub: '02 High Priority', icon: CheckCircle2, color: 'blue', link: '/staff/tasks' },
        { label: 'Available Leaves', value: '12 Days', sub: 'Annual Quota 2026', icon: Calendar, color: 'amber', link: '/staff/leave' },
        { label: 'Current Payout', value: '₹ 42,500', sub: 'Next: April 05', icon: TrendingUp, color: 'indigo', link: '/staff/salary' },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            
            {/* High-Contrast Impact Banner */}
            <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] dark:from-[#0B1222] dark:to-[#1E3A8A] rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden text-white shadow-2xl shadow-blue-900/20 group transition-all duration-500">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40 group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] border border-white/10 ring-1 ring-white/10">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                            Operational Unit: Active
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-poppins capitalize leading-tight">
                                Welcome, {user?.name?.split(' ')[0] || 'Operator'}
                            </h1>
                            <p className="text-blue-100 dark:text-blue-200 font-medium md:text-xl opacity-90 leading-relaxed max-w-2xl">
                                System ready for field reporting. You have 04 structural assignments scheduled for the current cycle.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-5 pt-4">
                            <button 
                                onClick={() => navigate('/staff/attendance')}
                                className="bg-white text-[#2563EB] px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 hover:translate-y-[-2px] hover:shadow-xl transition-all"
                            >
                                <ShieldCheck className="w-5 h-5" /> Mark Presence
                            </button>
                            <button 
                                onClick={() => navigate('/staff/progress')}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all"
                            >
                                <Plus className="w-5 h-5" /> Log Daily Update
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance High-Visibility Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        onClick={() => navigate(stat.link)}
                        className="bg-white dark:bg-dark-surface p-8 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 bg-${stat.color}-50 dark:bg-blue-950/30 text-${stat.color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <button className="text-slate-300 dark:text-dark-muted group-hover:text-[#2563EB] p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-[#111827] dark:text-dark-text tracking-tight">{stat.value}</h3>
                            <p className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-widest">{stat.label}</p>
                            <div className="mt-6 pt-5 border-t border-slate-50 dark:border-dark-border flex items-center gap-2.5">
                                <div className={`w-1.5 h-1.5 bg-${stat.color}-400 rounded-full`}></div>
                                <span className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-tighter opacity-80">{stat.sub}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Logistics & Support Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Task Logistics Preview */}
                <div className="lg:col-span-8 bg-white dark:bg-dark-surface rounded-[2.5rem] border border-[#E2E8F0] dark:border-dark-border p-6 md:p-10 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-[#2563EB] rounded-2xl">
                                <LayoutDashboard className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#111827] dark:text-dark-text font-poppins">Assigned Operations</h2>
                                <p className="text-sm text-[#6B7280] dark:text-dark-muted mt-1">Live critical path tasks for field reporting.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/staff/tasks')}
                            className="text-[#2563EB] text-xs font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-8"
                        >
                            View Roadmap
                        </button>
                    </div>

                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center gap-6 p-6 rounded-3xl hover:bg-blue-50/30 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 transition-all group cursor-pointer">
                                <div className="w-12 h-12 bg-[#F8FAFC] dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-2xl flex items-center justify-center font-bold text-blue-600 transition-transform group-hover:rotate-3 shadow-sm">
                                    {item}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-base font-bold text-[#111827] dark:text-dark-text">Structural Welding Unit #{400 + item}</h4>
                                    <div className="flex items-center gap-3 text-xs text-[#6B7280] dark:text-dark-muted font-medium mt-1.5">
                                        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> High Priority</span>
                                        <span className="flex items-center gap-1 opacity-70"><Clock className="w-3.5 h-3.5" /> Site Arrival by 10:00 AM</span>
                                    </div>
                                </div>
                                <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20">Active</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Analytics */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-[#E2E8F0] dark:border-dark-border p-10 shadow-sm text-center group">
                        <div className="relative inline-block mb-8">
                            <div className="w-32 h-32 rounded-full border-8 border-slate-50 dark:border-dark-bg flex items-center justify-center text-3xl font-bold text-[#111827] dark:text-dark-text shadow-xl group-hover:scale-105 transition-transform duration-500">
                                <div className="absolute inset-0 border-8 border-blue-500 rounded-full border-t-transparent -rotate-45"></div>
                                94%
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#111827] dark:text-dark-text mb-2 font-poppins">Efficiency Rating</h3>
                        <p className="text-sm text-[#6B7280] dark:text-dark-muted font-medium px-4 leading-relaxed">System performance is 12% above targets this cycle. Keep reporting!</p>
                        <div className="mt-8 space-y-4">
                            <div className="h-1.5 bg-slate-50 dark:bg-dark-bg rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 w-[94%]" />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-widest">
                                <span>Target</span>
                                <span className="text-[#2563EB]">Exceeded</span>
                            </div>
                        </div>
                    </div>

                    {/* Dark Card - Finance Link */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <Zap className="absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.05] group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4 font-poppins">Finance Link</h3>
                            <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">Initialize payment requests or audit bonus cycles for active structural works.</p>
                            <button 
                                onClick={() => navigate('/staff/salary')}
                                className="w-full bg-[#2563EB] hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3"
                            >
                                <ArrowRight className="w-4 h-4" /> Open Ledger
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StaffDashboard;
