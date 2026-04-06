import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Layers, Image as ImageIcon, FileText, BookOpen,
    BarChart3, Users, ClipboardList, BadgeIndianRupee, MessageSquare,
    Calculator, Receipt, TrendingUp, Settings, LogOut, Menu, X, Bell,
    Search, HelpCircle, ChevronRight, User, Filter, LayoutGrid, Activity,
    Clock, AlertCircle
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
    { name: 'System Core',     path: '/admin/settings',     icon: Settings },
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, onNavClick, onLogout }) => (
    <div className="flex flex-col h-full">
        <div className="p-8 border-b border-slate-800 bg-[#0B1222] flex flex-col items-center gap-4 flex-shrink-0">
            <Link to="/" onClick={onNavClick} className="flex flex-col items-center gap-4 group">
                <div className="bg-white p-2 rounded-2xl shadow-lg">
                    <p className="text-blue-600 font-black text-xl">K</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-black text-white font-poppins tracking-tighter">KRISHNA ENGG</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-blue-500 mt-1.5 opacity-80">Admin Terminal</p>
                </div>
            </Link>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-hide">
            {SIDEBAR_ITEMS.map(item => (
                <Link
                    key={item.name}
                    to={item.path}
                    onClick={onNavClick}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[13px] font-semibold transition-all ${
                        location.pathname === item.path ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                </Link>
            ))}
        </nav>
        <div className="p-6 border-t border-slate-800 bg-[#0B1222]">
            <button onClick={onLogout} className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest">
                Logout
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
                {desktopOpen && <SidebarContent location={location} onNavClick={() => { }} onLogout={handleLogout} />}
            </aside>

            {/* ── Mobile Sidebar (Direct Render for Stability) ──────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
                    <aside className={`fixed top-0 left-0 h-full bg-[#0F172A] text-white z-[70] flex flex-col border-r border-slate-800 shadow-2xl ${SIDEBAR_W} transition-transform`}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h2 className="text-sm font-black uppercase tracking-widest text-[#2563EB]">Menu</h2>
                            <button onClick={closeMobile} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent location={location} onNavClick={closeMobile} onLogout={handleLogout} />
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
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-white tracking-tight truncate max-w-[200px]">
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
