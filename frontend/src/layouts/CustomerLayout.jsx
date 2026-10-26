import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Layers, BookOpen, FileText,
    MessageSquare, HelpCircle, User, LogOut, Bell, Menu, X, ChevronLeft, Wallet, Home, Briefcase, CheckCircle
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import ThemeToggle from '../components/ThemeToggle';
import { getSocket } from '../utils/socket';

const SIDEBAR_W = 'w-[280px] max-w-[85vw]';

const navItems = [
    { name: 'My Dashboard', path: '/customer', icon: LayoutDashboard },
    { name: 'My Projects', path: '/customer/projects', icon: Briefcase },
    { name: 'My Applications', path: '/customer/quotes', icon: Layers },
    { name: 'My Payments', path: '/customer/payments', icon: Wallet },
    { name: 'Intelligence Feed', path: '/blog', icon: BookOpen },
    { name: 'Formal Quote Request', path: '/quote', icon: FileText },
    { name: 'Technical Support', path: '/customer/support', icon: MessageSquare },
];

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout, onClose }) => (
    <div className="flex flex-col h-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-slate-900 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700 dark:border-slate-800">
        {/* Logo */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 flex flex-col items-center gap-3 flex-shrink-0 relative">
            {onClose && (
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-slate-200/60 dark:bg-slate-800 rounded-xl transition-all md:hidden"
                    title="Close Menu"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
            <Link to="/" onClick={onNavClick} className="flex flex-col items-center gap-3 group">
                <img src="/logo512.png" alt="Client Portal" className="w-12 h-12 rounded-2xl object-contain shadow-lg group-hover:scale-105 transition-transform" />
                <div className="text-center">
                    <p className="text-base font-black text-slate-900 dark:text-white font-poppins tracking-tight leading-none">Krishna Engineering</p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mt-1">Client Portal</p>
                </div>
            </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600 dark:text-slate-400 mb-2">Client Services</p>
            {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                    <Link
                        key={item.name}
                        to={item.path}
                        onClick={onNavClick}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white dark:hover:bg-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400'}`} />
                        <span className="truncate">{item.name}</span>
                    </Link>
                );
            })}
            
            {import.meta.env.VITE_LODGE_BOOKING_URL ? (
                <a 
                    href={import.meta.env.VITE_LODGE_BOOKING_URL}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 mt-3 hover:bg-emerald-500"
                >
                    <Home className="w-5 h-5 flex-shrink-0 text-white" />
                    <span className="truncate">Book Your Room</span>
                </a>
            ) : (
                <Link 
                    to="/lodge"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 mt-3 hover:bg-emerald-500"
                >
                    <Home className="w-5 h-5 flex-shrink-0 text-white" />
                    <span className="truncate">Book Your Room</span>
                </Link>
            )}
        </nav>

        {/* Footer */}
        <div className="p-4 pb-6 border-t border-slate-200 dark:border-slate-700 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 space-y-3 flex-shrink-0">
            <Link to="/customer/profile" onClick={onNavClick} className="flex items-center gap-3 p-2.5 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 rounded-xl transition-colors group">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Edit Profile (WA)</p>
                </div>
            </Link>
            <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-rose-200 dark:border-rose-900/50 transition-all shadow-sm"
            >
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
    const [supportApprovalAlert, setSupportApprovalAlert] = useState(null);

    React.useEffect(() => {
        if (!user) return;
        const socket = getSocket();
        socket.connect();

        const myId = (user._id || user.id || '').toString();
        const myEmail = (user.email || '').toLowerCase();

        socket.emit('join-room', `user_${myId}`);
        socket.emit('join-room', 'customer');

        const handleApproval = (data) => {
            console.log("🔔 Inbound Client Support Approval Notification:", data);
            if (
                (data.targetUserId && data.targetUserId === myId) ||
                (data.clientEmail && data.clientEmail.toLowerCase() === myEmail) ||
                !data.targetUserId
            ) {
                // Display in-app visual notification; NO sound played on client device
                setSupportApprovalAlert({
                    projectId: data.projectId,
                    projectTitle: data.projectTitle,
                    supportLink: data.supportLink
                });
            }
        };

        socket.on('technical-support-approved', handleApproval);

        return () => {
            socket.off('technical-support-approved', handleApproval);
        };
    }, [user]);

    React.useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    if (!isAuthenticated || user?.role !== 'customer') {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
    const closeMobile = () => setMobileOpen(false);
    const currentPage = navItems.find(i => i.path === location.pathname)?.name || 'Client Module';

    return (
        <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950 flex font-sans overflow-x-hidden transition-colors duration-250">

            {/* ── Desktop Sidebar ─────────────────────── */}
            <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-[var(--z-header,10)] border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl transition-all duration-300 ${desktopOpen ? SIDEBAR_W : 'w-0 overflow-hidden'}`}>
                {desktopOpen && <SidebarContent location={location} user={user} onNavClick={() => { }} onLogout={handleLogout} />}
            </aside>

            {/* ── Mobile Sidebar (Direct Render for Stability) ──────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[var(--z-modal,100)] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={closeMobile} />
                    <aside className={`fixed top-0 left-0 h-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-[var(--z-modal,100)] flex flex-col border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl ${SIDEBAR_W}`}>
                        <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} onClose={closeMobile} />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-[100dvh] min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-[280px]' : 'md:ml-0'}`}>

                {/* Header with Safe Area Inset Support */}
                <header className="sticky top-0 z-[var(--z-header,10)] min-h-[4rem] pt-[env(safe-area-inset-top,0px)] bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-1.5 sm:gap-2 shadow-lg dark:from-slate-900 dark:to-slate-950 dark:border-b dark:border-slate-800">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 shrink-0 cursor-pointer active:scale-95"
                            title="Toggle Menu"
                            aria-label="Toggle navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 shrink-0 cursor-pointer active:scale-95"
                            title="Go Back"
                            aria-label="Navigate back"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight font-poppins truncate max-w-[130px] sm:max-w-xs">
                            {currentPage}
                        </h1>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ThemeToggle darkNavbar={true} />
                        <button 
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center relative p-2.5 text-blue-100 hover:bg-white/10 dark:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
                            title="Notifications"
                            aria-label="View notifications"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-yellow-400 rounded-full border-2 border-blue-700" />
                        </button>
                        <Link 
                            to="/customer/support" 
                            className="hidden sm:flex min-w-[44px] min-h-[44px] items-center gap-1.5 p-2.5 text-blue-100 hover:bg-white/10 dark:bg-slate-800/50 rounded-xl transition-all"
                            title="Support Hub"
                            aria-label="Get technical support"
                        >
                            <HelpCircle className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Support</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name}</p>
                            <div className="w-9 h-9 bg-white/20 dark:bg-slate-800/70 rounded-xl border border-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {user?.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-white/90 hover:text-white bg-white/10 hover:bg-rose-500/80 rounded-xl transition-all border border-white/10 gap-1.5 shrink-0 cursor-pointer active:scale-95"
                            title="Log Out"
                            aria-label="Log out of client portal"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                {/* Page with Safe Area Inset Support */}
                <main className="flex-1 p-3 sm:p-4 md:p-8 pb-[max(2rem,env(safe-area-inset-bottom,2rem))] overflow-x-hidden min-w-0">
                    <div className="max-w-[1400px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>

                {/* ── Client Portal Support Approval Notification Banner ── */}
                <AnimatePresence>
                    {supportApprovalAlert && (
                        <div className="fixed bottom-6 right-6 z-[80] max-w-md w-full p-4 pointer-events-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="bg-emerald-950 border-2 border-emerald-500 text-white rounded-3xl p-5 shadow-2xl shadow-emerald-950/60 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                                Support Request Approved
                                            </div>
                                            <h4 className="text-sm font-bold text-white leading-tight">
                                                {supportApprovalAlert.projectTitle}
                                            </h4>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSupportApprovalAlert(null)}
                                        className="text-emerald-400 hover:text-white p-1 bg-transparent border-none cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-emerald-200 leading-relaxed">
                                    Your Technical Support inquiry has been approved by engineering command. A secure consultation channel is active.
                                </p>
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => setSupportApprovalAlert(null)}
                                        className="flex-1 py-2.5 bg-emerald-900/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-xl border-none cursor-pointer"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSupportApprovalAlert(null);
                                            navigate('/customer/support');
                                        }}
                                        className="flex-[2] py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-lg shadow-emerald-500/20"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5 fill-current" /> Enter Live Support
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CustomerLayout;
