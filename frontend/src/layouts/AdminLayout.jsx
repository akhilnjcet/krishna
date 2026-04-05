import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, Layers, Image as ImageIcon, FileText, BookOpen,
    BarChart3, Users, ClipboardList, BadgeIndianRupee, MessageSquare,
    Inbox, MessagesSquare, Settings, LogOut, Bell, Search, X, Menu
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const SIDEBAR_W = 'w-72'; // 288px

const menuGroups = [
    {
        label: 'Core Operations',
        items: [
            { name: 'Dashboard',       path: '/admin',              icon: LayoutDashboard },
            { name: 'Active Projects', path: '/admin/projects',     icon: Layers },
            { name: 'Project Gallery', path: '/admin/portfolio',    icon: ImageIcon },
            { name: 'Quote Requests',  path: '/admin/quotes',       icon: FileText },
        ]
    },
    {
        label: 'Management',
        items: [
            { name: 'Staff Directory', path: '/admin/staff',        icon: Users },
            { name: 'Request Portal',  path: '/admin/applications', icon: ClipboardList },
            { name: 'Attendance Logs', path: '/admin/logs',         icon: FileText },
            { name: 'Production Feed', path: '/admin/progress',     icon: BarChart3 },
            { name: 'Financial Hub',   path: '/admin/finance',      icon: BadgeIndianRupee },
        ]
    },
    {
        label: 'Engagement',
        items: [
            { name: 'Knowledge Base',  path: '/admin/blog',         icon: BookOpen },
            { name: 'Support Tickets', path: '/admin/support',      icon: Inbox },
            { name: 'Live Channels',   path: '/admin/live-chat',    icon: MessagesSquare },
            { name: 'AI Assistant',    path: '/admin/chat',         icon: MessageSquare },
        ]
    },
    {
        label: 'System Control',
        items: [
            { name: 'General Settings', path: '/admin/settings',   icon: Settings },
        ]
    }
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout }) => (
    <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 bg-[#0B1222] flex items-center gap-3">
            <Link to="/" onClick={onNavClick} className="flex items-center gap-3 group">
                <img src="/logo512.png" alt="KEW" className="w-10 h-10 rounded-xl object-contain shadow-lg group-hover:scale-105 transition-transform" />
                <div className="flex flex-col">
                    <span className="text-lg font-black text-white font-poppins tracking-tight">KRISHNA</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400 leading-none mt-0.5">Command Module</span>
                </div>
            </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
            {menuGroups.map((group, gi) => (
                <div key={gi} className="space-y-1">
                    <p className="px-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-2">{group.label}</p>
                    {group.items.map(item => {
                        const active = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={onNavClick}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                                    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                <span className="truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-[#0B1222]">
            <Link to="/admin/settings" onClick={onNavClick} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Super Admin</p>
                </div>
            </Link>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </div>
    </div>
);

/* ── Layout ─────────────────────────────────────────────────────── */
const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);    // mobile drawer
    const [desktopOpen, setDesktopOpen] = useState(true);   // desktop collapse

    if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/login" replace />;

    const handleLogout = () => { logout(); window.location.replace('/login'); };
    const closeMobile = () => setMobileOpen(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans">

            {/* ── Desktop Sidebar ─────────────────────── */}
            <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-[#0F172A] text-white z-40 border-r border-slate-800 shadow-2xl transition-all duration-300 ${desktopOpen ? SIDEBAR_W : 'w-0 overflow-hidden'}`}>
                {desktopOpen && (
                    <SidebarContent location={location} user={user} onNavClick={() => {}} onLogout={handleLogout} />
                )}
            </aside>

            {/* ── Mobile Backdrop ─────────────────────── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* ── Mobile Drawer ───────────────────────── */}
            <aside className={`fixed top-0 left-0 h-full bg-[#0F172A] text-white z-[70] md:hidden flex flex-col border-r border-slate-800 shadow-2xl transition-transform duration-300 ${SIDEBAR_W} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Close button */}
                <button onClick={closeMobile} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl z-10">
                    <X className="w-5 h-5" />
                </button>
                <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} />
            </aside>

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-72' : 'md:ml-0'}`}>

                {/* Header */}
                <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 md:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        {/* Mobile: opens drawer | Desktop: collapses sidebar */}
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-white tracking-tight font-poppins capitalize truncate max-w-[160px] sm:max-w-none">
                            {location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="hidden lg:flex items-center bg-white/10 rounded-xl px-3 py-2 border border-white/10 w-56 gap-2">
                            <Search className="w-4 h-4 text-blue-200 flex-shrink-0" />
                            <input placeholder="Search..." className="bg-transparent text-sm text-white placeholder-blue-200 outline-none w-full" />
                        </div>
                        <Link to="/admin/settings" className="p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Settings className="w-5 h-5" />
                        </Link>
                        <button className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-blue-700" />
                        </button>
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white text-xs font-bold border border-white/20">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page */}
                <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
