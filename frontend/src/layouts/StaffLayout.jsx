import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, UserCheck, Wallet, CalendarDays, Users,
    MessageSquare, CheckSquare, LogOut, Menu, X, Bell, User, ChevronLeft
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const SIDEBAR_W = 'w-64';

const navItems = [
    { name: 'Staff Dashboard',  path: '/staff',              icon: LayoutDashboard },
    { name: 'Scan Attendance',  path: '/staff/attendance',   icon: UserCheck },
    { name: 'My Timesheets',    path: '/staff/timesheets',   icon: CalendarDays },
    { name: 'Task Board',       path: '/staff/tasks',        icon: CheckSquare },
    { name: 'Payout Hub',       path: '/staff/salary',       icon: Wallet },
    { name: 'Leave Tracker',    path: '/staff/leave',        icon: CalendarDays },
    { name: 'Track Requests',   path: '/staff/applications', icon: CheckSquare },
    { name: 'Field Contacts',   path: '/staff/contacts',     icon: Users },
    { name: 'Support Channel',  path: '/staff/chat',         icon: MessageSquare },
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout }) => (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-[#0B1222] gap-3 flex-shrink-0">
            <Link to="/" onClick={onNavClick} className="flex items-center gap-3 group">
                <img src="/logo512.png" alt="Staff" className="w-9 h-9 rounded-xl object-contain shadow-lg group-hover:scale-105 transition-transform" />
                <div className="flex flex-col">
                    <span className="text-base font-black text-white font-poppins tracking-tight leading-none">Krishna Staff</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400 mt-0.5">Field Logistics</span>
                </div>
            </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {navItems.map(item => {
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
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.name}</span>
                    </Link>
                );
            })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0B1222] space-y-3 flex-shrink-0">
            <Link to="/staff/profile" onClick={onNavClick} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-xl transition-colors group">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Edit Profile (WA)</p>
                </div>
            </Link>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <LogOut className="w-4 h-4" /> Logout
            </button>
        </div>
    </div>
);

const StaffLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    if (!isAuthenticated || user?.role !== 'staff') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
    const closeMobile = () => setMobileOpen(false);

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
                    <aside className={`fixed top-0 left-0 h-full bg-[#0F172A] text-white z-[70] flex flex-col border-r border-slate-800 shadow-2xl ${SIDEBAR_W} transition-transform`}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h2 className="text-sm font-black uppercase tracking-widest text-[#2563EB]">Staff Menu</h2>
                            <button onClick={closeMobile} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-2xl z-10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-64' : 'md:ml-0'}`}>
                <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 md:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-white tracking-tight font-poppins capitalize truncate max-w-[160px] sm:max-w-xs">
                            {navItems.find(i => i.path === location.pathname)?.name || 'Staff Portal'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-blue-700" />
                        </button>
                        <div className="flex items-center gap-2 pl-1">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name}</p>
                            <div className="w-8 h-8 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1500px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StaffLayout;
