import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, UserCheck, Wallet, CalendarDays, Users,
    MessageSquare, CheckSquare, LogOut, Menu, X, Bell, User, ChevronLeft,
    ClipboardList, Sparkles, Truck, Search, ChevronRight
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { getSocket } from '../utils/socket';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBellDropdown from '../components/NotificationBellDropdown';
import { playNotificationSound } from '../utils/soundService';
import { preloadFaceModels } from '../utils/faceApiLoader';

const SIDEBAR_W = 'w-64 max-w-[85vw]';

const navItems = [
    { name: 'Staff Dashboard',  path: '/staff',              icon: LayoutDashboard, keywords: ['overview', 'home', 'summary'] },
    { name: 'Scan Attendance',  path: '/staff/attendance',   icon: UserCheck, keywords: ['face', 'face attendance', 'biometric', 'camera', 'check-in', 'clock-in', 'scan'] },
    { name: 'Attendance',       path: '/staff/attendance-hub', icon: CalendarDays, keywords: ['calendar', 'logs', 'history', 'face', 'records'] },
    { name: 'My Timesheets',    path: '/staff/timesheets',   icon: CalendarDays, keywords: ['hours', 'overtime', 'shifts', 'work hours'] },
    { name: 'Task Board',       path: '/staff/tasks',        icon: CheckSquare, keywords: ['todo', 'assignments', 'status', 'duties'] },
    { name: 'Project Delay / Stop', path: '/staff/progress',     icon: ClipboardList, keywords: ['milestone', 'blocker', 'issue', 'timeline'] },
    { name: 'Payout Hub',       path: '/staff/salary',       icon: Wallet, keywords: ['salary', 'wage', 'advance', 'payment', 'payout'] },
    { name: 'Leave Tracker',    path: '/staff/leave',        icon: CalendarDays, keywords: ['vacation', 'holiday', 'request', 'time off'] },
    { name: 'Track Requests',   path: '/staff/applications', icon: CheckSquare, keywords: ['forms', 'approvals', 'applications'] },
    { name: 'Field Contacts',   path: '/staff/contacts',     icon: Users, keywords: ['team', 'phonebook', 'directory', 'staff'] },
    { name: 'Driver Management', path: '/staff/drivers',     icon: Truck, keywords: ['fleet', 'vehicles', 'trips', 'delivery'] },
    { name: 'AI ERP Copilot',   path: '/staff/ai-assistant', icon: Sparkles, keywords: ['groq', 'assistant', 'chatbot', 'smart query'] },
    { name: 'Support Channel',  path: '/staff/chat',         icon: MessageSquare, keywords: ['messages', 'help', 'admin chat', 'support'] },
];

const highlightMatch = (text, query) => {
    if (!query || !query.trim()) return text;
    const q = query.trim().toLowerCase();
    const str = String(text || '');
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = str.slice(0, idx);
    const matched = str.slice(idx, idx + q.length);
    const after = str.slice(idx + q.length);
    return (
        <span>
            {before}
            <span className="text-blue-600 dark:text-blue-400 font-black underline decoration-blue-500/50">{matched}</span>
            {after}
        </span>
    );
};

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const SidebarContent = ({ location, user, onNavClick, onLogout, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const searchInputRef = useRef(null);
    const itemRefs = useRef([]);
    const navigate = useNavigate();

    useEffect(() => {
        setActiveIndex(0);
    }, [searchQuery]);

    useEffect(() => {
        if (searchQuery.trim() && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIndex, searchQuery]);

    const matchingItems = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) return [];

        return navItems
            .filter(item => {
                const nameLower = (item.name || '').toLowerCase();
                const pathLower = (item.path || '').toLowerCase();
                const keywords = Array.isArray(item.keywords) ? item.keywords : [];

                if (nameLower.includes(q)) return true;
                if (pathLower.includes(q)) return true;
                return keywords.some(k => (k || '').toLowerCase().includes(q));
            })
            .filter((item, idx, arr) => arr.findIndex(i => i.path === item.path) === idx)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [searchQuery]);

    const handleSelectModule = (item) => {
        setSearchQuery('');
        navigate(item.path);
        if (onNavClick) onNavClick();
    };

    const handleSearchKeyDown = (e) => {
        if (matchingItems.length === 0) {
            if (e.key === 'Escape') {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % matchingItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + matchingItems.length) % matchingItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = matchingItems[activeIndex] || matchingItems[0];
            if (target) {
                handleSelectModule(target);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setSearchQuery('');
            searchInputRef.current?.blur();
        }
    };

    const isSearching = searchQuery.trim().length > 0;

    return (
        <div className="flex flex-col h-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-slate-900 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700 dark:border-slate-800">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 gap-3 flex-shrink-0">
                <Link to="/" onClick={onNavClick} className="flex items-center gap-3 group min-w-0">
                    <img src="/logo512.png" alt="Staff" className="w-9 h-9 rounded-xl object-contain shadow-lg group-hover:scale-105 transition-transform flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-base font-black text-slate-900 dark:text-white font-poppins tracking-tight leading-none truncate">Krishna Staff</span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mt-0.5 truncate">Field Logistics</span>
                    </div>
                </Link>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-all md:hidden flex-shrink-0"
                        title="Close Menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Real-time Module Search Bar */}
            <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="relative flex items-center group">
                    <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search staff pages..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-sm focus:ring-2 focus:ring-blue-500/20"
                        autoComplete="off"
                        spellCheck="false"
                        aria-label="Search accessible staff modules"
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                searchInputRef.current?.focus();
                            }}
                            title="Clear search (Esc)"
                            className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div className="absolute right-2.5 hidden sm:flex items-center pointer-events-none">
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-600/60">
                                /
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Suggestions Header when searching */}
            {isSearching && (
                <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                            Suggestions (A → Z)
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            {matchingItems.length}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Alphabetical
                    </span>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto">
                {isSearching ? (
                    matchingItems.length > 0 ? (
                        matchingItems.map((item, index) => {
                            const active = location.pathname === item.path;
                            const isKeyFocused = index === activeIndex;
                            const queryLower = searchQuery.trim().toLowerCase();
                            const matchedKeyword = !item.name.toLowerCase().includes(queryLower) && Array.isArray(item.keywords)
                                ? item.keywords.find(k => k.toLowerCase().includes(queryLower))
                                : null;

                            return (
                                <div
                                    key={item.path}
                                    ref={el => (itemRefs.current[index] = el)}
                                    onClick={() => handleSelectModule(item)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold transition-all select-none ${
                                        isKeyFocused
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/40 shadow-sm'
                                            : active 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white dark:hover:bg-slate-900 dark:hover:text-white'
                                    }`}
                                    role="option"
                                    aria-selected={isKeyFocused}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <item.icon className={`w-4 h-4 flex-shrink-0 ${
                                            active ? 'text-white' : isKeyFocused ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                        }`} />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate">
                                                {highlightMatch(item.name, searchQuery)}
                                            </span>
                                            {matchedKeyword && (
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                                                    Matches: <span className="text-blue-600 dark:text-blue-400 font-medium">{matchedKeyword}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                                        isKeyFocused ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600 opacity-60'
                                    }`} />
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2 border border-slate-200/60 dark:border-slate-700/60">
                                <Search className="w-4 h-4 opacity-60" />
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No matching pages</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                                No staff pages match <span className="font-bold text-slate-700 dark:text-slate-300">"{searchQuery}"</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="mt-3 px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-200/50 dark:border-blue-800/50"
                            >
                                Clear Filter
                            </button>
                        </div>
                    )
                ) : (
                    navItems.map(item => {
                        const active = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={onNavClick}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                                    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white dark:hover:bg-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500 dark:text-slate-400'}`} />
                                <span className="truncate">{item.name}</span>
                            </Link>
                        );
                    })
                )}
            </nav>

        {/* Footer */}
        <div className="p-4 pb-6 border-t border-slate-200 dark:border-slate-700 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-900/50 space-y-3 flex-shrink-0">
            <Link to="/staff/profile" onClick={onNavClick} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors group">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Edit Profile (WA)</p>
                </div>
            </Link>
            <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-rose-200 dark:border-rose-900/50 transition-all shadow-sm"
            >
                <LogOut className="w-4 h-4" /> Logout
            </button>
        </div>
    </div>
    );
};

const StaffLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);
    
    // Silently pre-cache and warm up AI Biometric models in the background when staff accesses portal
    useEffect(() => {
        preloadFaceModels();
    }, []);
    
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);
    
    const [taskPopup, setTaskPopup] = useState({ show: false, task: null });

    useEffect(() => {
        if (!isAuthenticated || !user) return;
        const socket = getSocket();
        socket.connect();
        
        const userId = user._id || user.id;
        if (userId) {
            socket.emit('join-room', userId);
            console.log(`👤 Staff socket joined room: ${userId}`);
        }

        socket.on('new-task-assigned', (taskData) => {
            console.log("🔔 New Task Assigned Socket Event:", taskData);
            setTaskPopup({ show: true, task: taskData });
            playNotificationSound('bell', 80);
        });

        return () => {
            socket.off('new-task-assigned');
            socket.disconnect();
        };
    }, [isAuthenticated, user]);

    if (!isAuthenticated || user?.role !== 'staff') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
    const closeMobile = () => setMobileOpen(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex font-sans overflow-x-hidden transition-colors duration-250">
            {/* ── Desktop Sidebar ─────────────────────── */}
            <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-40 border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl transition-all duration-300 ${desktopOpen ? SIDEBAR_W : 'w-0 overflow-hidden'}`}>
                {desktopOpen && <SidebarContent location={location} user={user} onNavClick={() => { }} onLogout={handleLogout} />}
            </aside>

            {/* ── Mobile Sidebar (Direct Render for Stability) ──────────────── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
                    <aside className={`fixed top-0 left-0 h-full h-[100dvh] max-h-[100dvh] bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-[70] flex flex-col border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl ${SIDEBAR_W} transition-transform`}>
                        <SidebarContent location={location} user={user} onNavClick={closeMobile} onLogout={handleLogout} onClose={closeMobile} />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-64' : 'md:ml-0'}`}>
                <header className="sticky top-0 z-50 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-1.5 sm:gap-2 shadow-lg dark:from-slate-900 dark:to-slate-950 dark:border-b dark:border-slate-800">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 shrink-0"
                            title="Toggle Menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 flex items-center justify-center shrink-0"
                            title="Go Back"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight font-poppins capitalize truncate max-w-[130px] sm:max-w-xs">
                            {navItems.find(i => i.path === location.pathname)?.name || 'Staff Portal'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ThemeToggle darkNavbar={true} />
                        <NotificationBellDropdown role="staff" />
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name}</p>
                            <div className="w-8 h-8 bg-white/20 dark:bg-slate-800/70 rounded-xl border border-white/20 flex items-center justify-center text-white shrink-0">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-white/90 hover:text-white bg-white/10 hover:bg-rose-500/80 rounded-xl transition-all border border-white/10 flex items-center gap-1.5 shrink-0"
                            title="Log Out"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </header>

                {/* Page */}
                <main className="flex-1 p-2 sm:p-4 md:p-8 pb-8 overflow-x-hidden min-w-0 w-full">
                    <div className="max-w-[1500px] mx-auto min-w-0 w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Interactive New Task Assigned Popup Overlay */}
            <AnimatePresence>
                {taskPopup.show && taskPopup.task && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-t-8 border-t-blue-600 p-6 text-slate-800 dark:text-slate-200"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">
                                    🔔
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">New Task Assigned</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">Immediate operational assignment</p>
                                </div>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6 text-xs font-bold">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Task:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{taskPopup.task.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Project:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{taskPopup.task.projectName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Assigned By:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{taskPopup.task.assignedBy}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Due Date:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                                        {taskPopup.task.dueDate ? new Date(taskPopup.task.dueDate).toLocaleDateString() : 'ASAP'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button 
                                    onClick={() => setTaskPopup({ show: false, task: null })}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                >
                                    Dismiss
                                </button>
                                <button 
                                    onClick={() => {
                                        setTaskPopup({ show: false, task: null });
                                        navigate('/staff/tasks');
                                    }}
                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all"
                                >
                                    View Task
                                </button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            await api.put(`/tasks/${taskPopup.task._id}/status`, { status: 'In Progress' });
                                            setTaskPopup({ show: false, task: null });
                                            navigate('/staff/tasks');
                                            if (window.location.hash === '#/staff/tasks') {
                                                window.location.reload();
                                            }
                                        } catch (err) {
                                            alert("Failed to accept task.");
                                        }
                                    }}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/25"
                                >
                                    Accept Task
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffLayout;
