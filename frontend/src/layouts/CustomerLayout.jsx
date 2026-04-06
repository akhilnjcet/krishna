import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Layers, BookOpen, FileText,
    MessageSquare, HelpCircle, User, LogOut, Bell, Menu, X
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const SIDEBAR_W = 'w-[280px]';

const navItems = [
    { name: 'My Dashboard', path: '/customer', icon: LayoutDashboard },
    { name: 'My Applications', path: '/customer/quotes', icon: Layers },
    { name: 'Intelligence Feed', path: '/blog', icon: BookOpen },
    { name: 'Formal Quote Request', path: '/quote', icon: FileText },
    { name: 'Technical Support', path: '/customer/support', icon: MessageSquare },
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout }) => (
    <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 bg-[#0B1222] flex flex-col items-center gap-3 flex-shrink-0">
            <Link to="/" onClick={onNavClick} className="flex flex-col items-center gap-3 group">
                <img src="/logo512.png" alt="Client Portal" className="w-14 h-14 rounded-2xl object-contain shadow-lg group-hover:scale-105 transition-transform" />
                <div className="text-center">
                    <p className="text-base font-black text-white font-poppins tracking-tight leading-none">Krishna Engineering</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400 mt-1">Client Portal</p>
                </div>
            </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-3">Client Services</p>
            {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={onNavClick}
                        className={`flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.name}</span>
                    </Link>
                );
            })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0B1222] space-y-3 flex-shrink-0">
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Identity Validated</p>
                </div>
            </div>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <LogOut className="w-4 h-4" /> Log Out
            </button>
        </div>
    </div>
);

const CustomerLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    if (!isAuthenticated || user?.role !== 'customer') {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
    const closeMobile = () => setMobileOpen(false);
    const currentPage = navItems.find(i => i.path === location.pathname)?.name || 'Client Module';

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-x-hidden">

            {/* ── Desktop Sidebar ─────────────────────── */}
            <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-[#0F172A] text-white z-40 border-r border-slate-800 shadow-2xl transition-all duration-300 ${desktopOpen ? SIDEBAR_W : 'w-0 overflow-hidden'}`}>
                {desktopOpen && <SidebarContent location={location} user={user} onNavClick={() => { }} onLogout={handleLogout} />}
            </aside>

            {/* ── Mobile Sidebar (Direct Render for Stability) ──────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
                    <aside className={`fixed top-0 left-0 h-full bg-[#0F172A] text-white z-[70] flex flex-col border-r border-slate-800 shadow-2xl ${SIDEBAR_W}`}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h2 className="text-sm font-black uppercase tracking-widest text-[#2563EB]">Client Menu</h2>
                            <button onClick={closeMobile} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl z-10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-[280px]' : 'md:ml-0'}`}>

                {/* Header */}
                <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 md:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-white tracking-tight font-poppins truncate max-w-[160px] sm:max-w-xs">
                            {currentPage}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-blue-700" />
                        </button>
                        <Link to="/customer/support" className="hidden sm:flex items-center gap-1.5 p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <HelpCircle className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Support</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name}</p>
                            <div className="w-8 h-8 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center text-white text-sm font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page */}
                <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerLayout;
