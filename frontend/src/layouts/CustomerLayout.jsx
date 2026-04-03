import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    Layers, 
    Search,
    BookOpen, 
    FileText, 
    BadgeIndianRupee, 
    MessageSquare, 
    HelpCircle,
    User,
    LogOut,
    Bell
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const CustomerLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    if (!isAuthenticated || user?.role !== 'customer') {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        window.location.replace('/login');
    };

    const navItems = [
        { name: 'My Dashboard', path: '/customer', icon: LayoutDashboard },
        { name: 'My Applications', path: '/customer/quotes', icon: Layers },
        { name: 'Intelligence Feed', path: '/blog', icon: BookOpen },
        { name: 'Formal Quote Request', path: '/quote', icon: FileText },
        { name: 'Technical Support', path: '/customer/support', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-x-hidden flex-col md:flex-row">
            
            {/* Mobile Navigation Header */}
            <div className="md:hidden bg-[#0F172A] p-4 flex items-center justify-between z-50 sticky top-0 border-b border-slate-800">
                <Link to="/" className="flex items-center gap-2">
                    <div className="bg-[#2563EB] w-8 h-8 flex items-center justify-center font-bold text-white text-lg rounded-lg">K</div>
                    <span className="text-white font-bold text-sm">Krishna Client</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-white bg-slate-800 rounded-lg">
                    <Layers className="w-5 h-5 font-bold" />
                </button>
            </div>

            {/* Mobile Menu Backdrop */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
                        />
                        <motion.aside 
                            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                            className="fixed top-0 bottom-0 left-0 w-72 bg-[#0F172A] z-[70] md:hidden flex flex-col shadow-2xl"
                        >
                            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 bg-[#0B1222]">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#2563EB] w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold">K</div>
                                    <span className="font-bold text-white text-lg">Menu</span>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
                                    <LogOut className="w-5 h-5 rotate-180" />
                                </button>
                            </div>
                            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-semibold transition-all ${
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

            {/* Desktop Sidebar */}
            <aside className="w-72 bg-[#0F172A] text-white hidden md:flex flex-col fixed h-full z-20 border-r border-slate-800">
                <div className="p-8 border-b border-slate-800 bg-[#0B1222]">
                    <Link to="/" className="flex flex-col items-center gap-3 group">
                        <img 
                            src="/logo512.png" 
                            alt="Client Portal" 
                            className="w-16 h-16 object-contain rounded-2xl shadow-lg group-hover:scale-105 transition-transform" 
                        />
                        <div className="flex flex-col text-center">
                            <span className="text-xl font-bold tracking-tight text-white font-poppins capitalize">Krishna Engineering</span>
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 opacity-80 mt-1">Client Portal</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-10 space-y-2 overflow-y-auto">
                    <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Client Services</h3>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                                    isActive
                                        ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/20'
                                        : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 transition-colors ${
                                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'
                                }`} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-[#0B1222]">
                    <div className="flex items-center gap-3 p-4 bg-[#1E293B]/50 rounded-2xl mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-slate-700">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Client Identity</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-slate-800 hover:bg-rose-600/20 hover:text-rose-500 text-slate-400 font-bold uppercase tracking-widest py-3.5 rounded-2xl text-[10px] transition-all"
                    >
                        Log Out System
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen relative bg-[#F8FAFC]">
                <header className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] h-20 px-8 flex items-center justify-between sticky top-0 z-30 shadow-lg">
                    <div className="flex items-center gap-6">
                        <div className="w-1.5 h-8 bg-blue-300/40 rounded-full"></div>
                        <h1 className="text-xl font-bold text-white tracking-tight font-poppins capitalize">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Client Module'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="relative p-2.5 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-1.5 bg-yellow-400 rounded-full border-2 border-primary"></span>
                        </button>
                        <Link to="/customer/support" className="p-2.5 text-blue-100 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2">
                            <HelpCircle className="w-5 h-5" />
                            <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest text-white/80">Support Hub</span>
                        </Link>
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                            <User className="w-4 h-4 cursor-pointer" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CustomerLayout;
