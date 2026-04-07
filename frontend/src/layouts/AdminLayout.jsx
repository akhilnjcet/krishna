import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Layers, Image as ImageIcon, FileText, BookOpen,
    BarChart3, Users, ClipboardList, BadgeIndianRupee, MessageSquare,
    Calculator, Receipt, TrendingUp, Settings, LogOut, Menu, X, Bell,
    Search, HelpCircle, ChevronRight, User, Filter, LayoutGrid, Activity,
    Clock, AlertCircle, Radio, MessageCircle, ChevronLeft
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const SIDEBAR_W = 'w-[280px]';

const SIDEBAR_ITEMS = [
    { name: 'Core Dashboard',  path: '/admin',              icon: LayoutDashboard },
    { name: 'Staff Management', path: '/admin/staff',        icon: Users },
    { name: 'Attendance Hub',  path: '/admin/logs',         icon: Clock },
    { name: 'Leave Requests',  path: '/admin/leave',        icon: ClipboardList },
    { name: 'Projects Hub',    path: '/admin/projects',     icon: Layers },
    { name: 'Visual Portfolio', path: '/admin/portfolio',    icon: ImageIcon },
    { name: 'Formal Quotes',   path: '/admin/quotes',       icon: Receipt },
    { name: 'Financial Hub',   path: '/admin/finance',      icon: BadgeIndianRupee },
    { name: 'Project Timeline', path: '/admin/progress',     icon: Activity },
    { name: 'Intelligence Feed', path: '/admin/blog',        icon: BookOpen },
    { name: 'Technical Chat',  path: '/admin/live-chat',    icon: MessageSquare },
    { name: 'AI Command Center', path: '/admin/ai-chat',     icon: Calculator },
    { name: 'Applications',    path: '/admin/applications', icon: LayoutGrid },
    { name: 'Analytics Hub',   path: '/admin/analytics',    icon: BarChart3 },
    { name: 'WhatsApp Relay',  path: '/admin/whatsapp',     icon: Radio },
    { name: 'System Core',     path: '/admin/settings',     icon: Settings },
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout }) => (
    <div className="flex flex-col h-full bg-[#0F172A]">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800 bg-[#0B1222] flex flex-col items-center gap-3 flex-shrink-0">
            <Link to="/" onClick={onNavClick} className="flex flex-col items-center gap-3 group">
                <div className="bg-white p-2 rounded-2xl shadow-lg group-hover:scale-105 transition-transform">
                    <p className="text-blue-600 font-black text-xl">K</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-black text-white font-poppins tracking-tighter">KRISHNA ENGG</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-blue-500 mt-1 opacity-80 italic">Admin Terminal</p>
                </div>
            </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-3">Enterprise Control</p>
            {SIDEBAR_ITEMS.map(item => {
                const active = location.pathname === item.path;
                return (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={onNavClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                            active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.name}</span>
                    </Link>
                );
            })}
        </nav>

        {/* Footer / Account Section */}
        <div className="p-4 border-t border-slate-800 bg-[#0B1222] space-y-3 flex-shrink-0">
            <Link 
                to="/admin/profile" 
                onClick={onNavClick} 
                className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-2xl border border-slate-800/50 group"
            >
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition-transform">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate leading-none mb-1 group-hover:text-blue-400 transition-colors">{user?.name || "Administrator"}</p>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest leading-none">System Root</p>
                </div>
            </Link>
            
            <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all group"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Logout Session
            </button>
        </div>
    </div>
);

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    const role = user?.role || user?.user?.role;

    if (!isAuthenticated || role !== 'admin') {
        const msg = `AUTH REJECT: auth=${isAuthenticated}, role=${role}`;
        console.warn(msg);
        
        // If we think we are in, but the role check is failing, show visible diagnostics
        if (isAuthenticated) {
            return (
                <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
                   <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                       <AlertCircle className="w-10 h-10 text-rose-500" />
                   </div>
                   <h1 className="text-2xl font-bold mb-2 uppercase tracking-widest">Access Control Violation</h1>
                   <p className="text-slate-400 text-sm mb-12">The identity provided is valid, but doesn't have permissions to access the Admin Terminal.</p>
                   
                   <div className="bg-slate-800/50 p-6 rounded-3xl w-full max-w-md border border-slate-700 text-left space-y-4 mb-12">
                      <div className="flex justify-between border-b border-slate-700 pb-3">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Authentication</span>
                         <span className="text-xs font-bold text-emerald-400">{isAuthenticated ? "ACTIVE" : "NONE"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-3">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Detected Role</span>
                         <span className="text-xs font-bold uppercase text-rose-400">{role || "NULL / UNDEFINED"}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Identity Name</span>
                         <span className="text-xs font-bold text-white">{user?.name || user?.user?.name || "ANONYMOUS"}</span>
                      </div>
                   </div>

                   <button onClick={() => { logout(); navigate('/login'); }} className="px-12 py-4 bg-[#2563EB] rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20">
                      Fallback to Login
                   </button>
                </div>
            );
        }
        
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
                        <div className="absolute top-4 right-4 z-[80]">
                            <button onClick={closeMobile} className="p-2 text-slate-400 hover:text-white bg-slate-800/80 backdrop-blur rounded-xl shadow-lg border border-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-[280px]' : 'md:ml-0'}`}>
                <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 md:px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
                            title="Toggle Menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center"
                            title="Go Back"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-white tracking-tight truncate max-w-[150px] md:max-w-[200px]">
                            {SIDEBAR_ITEMS.find(i => i.path === location.pathname)?.name || 'Admin Terminal'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full border-2 border-blue-700" />
                        </button>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name || user?.user?.name || "Admin"}</p>
                            <div className="w-8 h-8 bg-white/20 rounded-xl border border-white/20 flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1500px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
