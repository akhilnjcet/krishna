import React, { useState } from 'react';
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
    Search
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

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
        { name: 'Dashboard', path: '/staff', icon: LayoutDashboard },
        { name: 'Attendance', path: '/staff/attendance', icon: UserCheck },
        { name: 'Tasks', path: '/staff/tasks', icon: CheckSquare },
        { name: 'Finance', path: '/staff/salary', icon: Wallet },
        { name: 'Leave', path: '/staff/leave', icon: CalendarDays },
        { name: 'Progress', path: '/staff/progress', icon: ChevronRight },
        { name: 'Contacts', path: '/staff/contacts', icon: Users },
        { name: 'Support Chat', path: '/staff/chat', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            
            {/* Desktop Sidebar */}
            <aside className={`bg-white border-r border-slate-200 transition-all duration-300 hidden md:flex flex-col z-30 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                            K
                        </div>
                        {isSidebarOpen && (
                            <span className="font-bold text-slate-800 text-lg tracking-tight">Krishna Staff</span>
                        )}
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                                    isActive 
                                    ? 'bg-indigo-50 text-indigo-600' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                {isSidebarOpen && <span>{item.name}</span>}
                                {isActive && isSidebarOpen && (
                                    <motion.div 
                                        layoutId="active-pill"
                                        className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="mt-4 w-full flex justify-center text-slate-400 hover:text-slate-600 transition-all"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                        />
                        <motion.aside 
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            className="fixed top-0 bottom-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col"
                        >
                            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                                <span className="font-bold text-slate-800 text-lg">Krishna Staff</span>
                                <button onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                            </div>
                            <nav className="flex-1 px-4 py-6 space-y-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                                            location.pathname === item.path 
                                            ? 'bg-indigo-50 text-indigo-600' 
                                            : 'text-slate-500'
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
                {/* Navbar */}
                <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 text-slate-500"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64 md:w-80 gap-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search everything..." 
                                className="bg-transparent text-sm text-slate-600 focus:outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-full hover:bg-indigo-50">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
                        <div className="flex items-center gap-3 group cursor-pointer pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-800 leading-none mb-1">{user?.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{user?.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white group-hover:border-indigo-400 transition-all overflow-hidden">
                                <img 
                                    src={`https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`} 
                                    alt="avatar" 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Workspace */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default StaffLayout;
