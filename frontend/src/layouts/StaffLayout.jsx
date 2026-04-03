import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    UserCheck, 
    Wallet, 
    CalendarDays, 
    Users, 
    MessageSquare, 
    CheckSquare, 
    LogOut,
    Menu,
    X,
    Bell,
    ChevronRight,
    Search,
    User
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const StaffLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (!isAuthenticated || user?.role !== 'staff') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        window.location.replace('/login');
    };

    const navItems = [
        { name: 'Staff Dashboard', path: '/staff', icon: LayoutDashboard },
        { name: 'Daily Attendance', path: '/staff/attendance', icon: UserCheck },
        { name: 'Task Board', path: '/staff/tasks', icon: CheckSquare },
        { name: 'Payout Hub', path: '/staff/salary', icon: Wallet },
        { name: 'Leave Tracker', path: '/staff/leave', icon: CalendarDays },
        { name: 'Field Contacts', path: '/staff/contacts', icon: Users },
        { name: 'Support Channel', path: '/staff/chat', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-x-hidden md:flex-row flex-col">
            
            {/* Desktop Sidebar - High Contrast Blue Theme */}
            <aside className={`bg-[#0F172A] text-white border-r border-slate-800 transition-all duration-300 hidden md:flex flex-col z-30 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-[#0B1222]">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="bg-[#2563EB] w-10 h-10 flex items-center justify-center font-bold text-white text-xl rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            K
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight text-white font-poppins capitalize leading-none">Krishna Staff</span>
                                <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-blue-400 opacity-80 mt-1">Field Logistics</span>
                            </div>
                        )}
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-10 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                                    isActive 
                                    ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/20' 
                                    : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                {isSidebarOpen && <span>{item.name}</span>}
                                {isActive && !isSidebarOpen && (
                                    <div className="absolute left-1.5 w-1 h-6 bg-white rounded-r-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-[#0B1222]">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center md:justify-start gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span>Logout Station</span>}
                    </button>
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="mt-6 w-full flex justify-center text-slate-500 hover:text-white transition-all bg-[#1E293B] rounded-xl py-2"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Trigger & Sidebar Area */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside 
                            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                            className="fixed top-0 bottom-0 left-0 w-72 bg-[#0F172A] z-50 md:hidden flex flex-col"
                        >
                            <div className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-[#0B1222]">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#2563EB] w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold">K</div>
                                    <span className="font-bold text-white text-lg">Staff Console</span>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-semibold ${
                                            location.pathname === item.path 
                                            ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/20' 
                                            : 'text-slate-400'
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                ))}
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Header with High-Contrast Blue Gradient */}
                <header className="h-20 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] border-b border-white/10 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-lg">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 text-white bg-white/10 rounded-xl"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:flex items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 w-64 md:w-80 gap-3">
                            <Search className="w-4 h-4 text-blue-200" />
                            <input 
                                type="text" 
                                placeholder="Search Staff Tasks..." 
                                className="bg-transparent text-sm text-white placeholder-blue-200 focus:outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2.5 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-yellow-400 rounded-full border-2 border-[#2563EB]"></span>
                        </button>
                        <div className="h-10 w-[1.5px] bg-white/10 mx-1 hidden sm:block"></div>
                        <div className="flex items-center gap-4 cursor-pointer group pl-2">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white leading-tight mb-1">{user?.name}</p>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider opacity-80 italic">Field Operative</p>
                            </div>
                            <div className="w-10 h-10 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center text-white backdrop-blur-md overflow-hidden transition-all group-hover:scale-105">
                                <User className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-12 overflow-x-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="max-w-[1500px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StaffLayout;
