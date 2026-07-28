import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Layers, Image as ImageIcon, FileText, BookOpen,
    BarChart3, Users, ClipboardList, BadgeIndianRupee, MessageSquare,
    Calculator, Receipt, TrendingUp, Settings, LogOut, Menu, X, Bell,
    Search, HelpCircle, ChevronRight, User, Filter, LayoutGrid, Activity,
    Clock, AlertCircle, Radio, MessageCircle, ChevronLeft, CheckSquare, Truck
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../utils/socket';
import api from '../services/api';

const SIDEBAR_W = 'w-[280px]';

const SIDEBAR_ITEMS = [
    { name: 'Core Dashboard',  path: '/admin',              icon: LayoutDashboard },
    { name: 'User Management',  path: '/admin/users',        icon: User },
    { name: 'Staff Management', path: '/admin/staff',        icon: Users },
    { name: 'Attendance Hub',  path: '/admin/logs',         icon: Clock },
    { name: 'Leave Requests',  path: '/admin/leave',        icon: ClipboardList },
    { name: 'Projects Hub',    path: '/admin/projects',     icon: Layers },
    { name: 'Task Assignment Hub', path: '/admin/tasks',    icon: CheckSquare },
    { name: 'Notification Center', path: '/admin/notifications', icon: Bell },
    { name: 'Visual Portfolio', path: '/admin/portfolio',    icon: ImageIcon },
    { name: 'Formal Quotes',   path: '/admin/quotes',       icon: Receipt },
    { name: 'Quotation Studio', path: '/admin/quotations-studio', icon: FileText },
    { name: 'Financial Hub',   path: '/admin/finance',      icon: BadgeIndianRupee },
    { name: 'Invoice Studio',  path: '/admin/invoices-studio', icon: Receipt },
    { name: 'Labour & Freight Bills', path: '/admin/labour-bills', icon: Truck },
    { name: 'Project Timeline', path: '/admin/progress',     icon: Activity },
    { name: 'Intelligence Feed', path: '/admin/blog',        icon: BookOpen },
    { name: 'Technical Chat',  path: '/admin/live-chat',    icon: MessageSquare },
    { name: 'AI Command Center', path: '/admin/ai-chat',     icon: Calculator },
    { name: 'Applications',    path: '/admin/applications', icon: LayoutGrid },
    { name: 'Analytics Hub',   path: '/admin/analytics',    icon: BarChart3 },
    { name: 'WhatsApp Relay',  path: '/admin/whatsapp',     icon: Radio },
    { name: 'Lodge Manager',   path: '/admin/lodge-manager',icon: BookOpen },
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

let audioCtx = null;

const playSirenNode = (volume = 0.3) => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.45);

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.9);

        setTimeout(() => {
            if (!audioCtx) return;
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(660, audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.45);

            gain2.gain.setValueAtTime(volume, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.9);
        }, 500);

    } catch (err) {
        console.error("❌ Audio synthesis failed:", err.message);
    }
};

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

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

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [toast, setToast] = useState({ 
        show: false, 
        title: '', 
        message: '', 
        projectName: '', 
        updatedBy: '', 
        reason: '', 
        remarks: '', 
        timestamp: '' 
    });

    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [activePopupAlert, setActivePopupAlert] = useState(null);

    const fetchNotifications = async () => {
        try {
            const statsRes = await api.get('/projects/dashboard/stats');
            setUnreadCount(statsRes.data.unreadCount || 0);
            setNotifications(statsRes.data.recentNotifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications in layout:", err);
        }
    };

    const fetchActiveAlerts = async () => {
        try {
            const res = await api.get('/notifications?status=Active');
            const activeNotifs = res.data;
            const criticals = activeNotifs.filter(n => n.priority === 'Critical' && n.status === 'Active');
            setCriticalAlerts(criticals);
        } catch (err) {
            console.error("Failed to fetch active alerts:", err);
        }
    };

    const fetchAllAlertState = async () => {
        await fetchNotifications();
        await fetchActiveAlerts();
    };

    const registerPushSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn("⚠️ Push messaging is not supported in this browser.");
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn("⚠️ Web Push notification permission denied.");
                return;
            }

            const keyRes = await api.get('/notifications/vapid');
            const publicVapidKey = keyRes.data.publicKey;

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            await api.post('/notifications/subscribe', { subscription });
            console.log("🔑 Web Push subscription verified with server.");
        } catch (error) {
            console.error("❌ Failed to register push subscription:", error);
        }
    };

    useEffect(() => {
        fetchAllAlertState();
        registerPushSubscription();

        const socket = getSocket();
        socket.connect();
        
        socket.emit('join-room', 'admin');

        socket.on('admin-notification', (notif) => {
            console.log("🔔 Real-time Admin Notification Received:", notif);
            setUnreadCount(prev => prev + 1);
            setNotifications(prev => [notif, ...prev.slice(0, 9)]);
            fetchActiveAlerts();

            // Open priority popup modal for Critical/High/Medium priority alerts
            if (['Critical', 'High', 'Medium'].includes(notif.priority)) {
                setActivePopupAlert(notif);
            } else {
                setToast({
                    show: true,
                    title: notif.title,
                    message: notif.message,
                    projectName: notif.projectName,
                    updatedBy: notif.updatedBy?.name || 'Staff',
                    reason: notif.reason,
                    remarks: notif.remarks,
                    timestamp: new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                setTimeout(() => {
                    setToast(t => ({ ...t, show: false }));
                }, 6000);
            }
        });

        socket.on('admin-notification-update', (updatedNotif) => {
            console.log("🔔 Real-time Notification Update Received:", updatedNotif);
            fetchAllAlertState();
            
            setActivePopupAlert(currentPopup => {
                if (currentPopup && currentPopup._id === updatedNotif._id) {
                    if (updatedNotif.status !== 'Active') {
                        return null;
                    }
                }
                return currentPopup;
            });
        });

        const interval = setInterval(() => {
            fetchAllAlertState();
        }, 12000);

        return () => {
            socket.off('admin-notification');
            socket.off('admin-notification-update');
            socket.disconnect();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (criticalAlerts.length === 0 || isMuted) {
            return;
        }

        const triggerAlertCycle = () => {
            const now = new Date();
            let volume = 0.3;
            let hasEscalated = false;

            for (const alert of criticalAlerts) {
                const created = new Date(alert.createdAt);
                const diffMinutes = (now - created) / 60000;
                if (diffMinutes > 5) {
                     hasEscalated = true;
                     break;
                }
            }

            if (hasEscalated) {
                volume = 0.85;
                if (Notification.permission === 'granted') {
                    new Notification("🚨 CRITICAL ALERT ESCALATION", {
                        body: "A critical alert has remained unresolved for more than 5 minutes!",
                        icon: '/logo192.png',
                        tag: 'escalation-alert'
                    });
                }
            }

            playSirenNode(volume);
        };

        triggerAlertCycle();
        const sirenInterval = setInterval(triggerAlertCycle, 10000);

        return () => clearInterval(sirenInterval);
    }, [criticalAlerts, isMuted]);

    const role = user?.role || user?.user?.role;

    if (!isAuthenticated || role !== 'admin') {
        const msg = `AUTH REJECT: auth=${isAuthenticated}, role=${role}`;
        console.warn(msg);
        
        // If we think we are in, but the role check is failing, show visible diagnostics
        if (isAuthenticated) {
            return (
                <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
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
                <header className="sticky top-0 z-30 min-h-16 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-4 md:px-6 flex flex-wrap items-center justify-between gap-2 shadow-lg">
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

                    <div className="flex items-center gap-2 relative">
                        <button 
                            onClick={() => setShowDropdown(prev => !prev)}
                            className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 bg-yellow-400 text-blue-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-blue-700 animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Bell Dropdown */}
                        {showDropdown && (
                            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-slate-100 dark:border-dark-border py-4 z-50 text-slate-800 animate-in fade-in slide-in-from-top-3 duration-200">
                                <div className="px-4 pb-3 border-b border-slate-100 dark:border-dark-border flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Alerts</span>
                                    {unreadCount > 0 && (
                                        <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full">
                                            {unreadCount} New
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-border">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.slice(0, 5).map(n => (
                                            <div 
                                                key={n._id} 
                                                onClick={() => { setShowDropdown(false); navigate('/admin/notifications'); }}
                                                className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg cursor-pointer transition-all ${!n.isRead ? 'bg-blue-50/20' : ''}`}
                                            >
                                                <p className="text-xs font-bold text-slate-800 dark:text-dark-text flex items-center gap-1.5">
                                                    <span>{n.title}</span>
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-dark-muted mt-0.5">Project: {n.projectName}</p>
                                                {n.reason && <p className="text-[9px] font-semibold text-amber-600 mt-0.5">Reason: {n.reason}</p>}
                                                <p className="text-[9px] text-slate-400 mt-1">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="px-4 pt-3 border-t border-slate-100 dark:border-dark-border text-center">
                                    <Link 
                                        to="/admin/notifications" 
                                        onClick={() => setShowDropdown(false)}
                                        className="text-xs font-bold text-[#2563EB] hover:underline uppercase tracking-wider"
                                    >
                                        View All
                                    </Link>
                                </div>
                            </div>
                        )}

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

                {/* WhatsApp-Style Popup Toast */}
                <AnimatePresence>
                    {toast.show && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="fixed bottom-6 right-6 z-[9999] w-96 bg-white dark:bg-dark-surface rounded-3xl shadow-2xl border-4 border-brand-950 p-6 flex items-start gap-4 cursor-pointer text-slate-800"
                            onClick={() => {
                                setToast(t => ({ ...t, show: false }));
                                navigate('/admin/notifications');
                            }}
                        >
                            <div className="w-10 h-10 bg-brand-950 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-black shadow-md text-lg">
                                💬
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">System Alert</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{toast.timestamp}</span>
                                </div>
                                <h4 className="font-bold text-sm text-[#111827] dark:text-dark-text mt-1">{toast.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed">
                                    Project: <span className="font-bold text-slate-800 dark:text-dark-text">{toast.projectName}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">Updated By: {toast.updatedBy}</p>
                                {toast.reason && (
                                    <div className="mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl text-[10px] text-amber-800 dark:text-amber-200">
                                        <span className="font-bold">Reason:</span> {toast.reason}
                                        {toast.remarks && <p className="mt-1 font-medium italic">"{toast.remarks}"</p>}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setToast(t => ({ ...t, show: false }));
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Mute Siren Floating Control Bar */}
                    {criticalAlerts.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-24 left-6 z-[9998] bg-rose-600 text-white px-6 py-4 rounded-3xl shadow-2xl border-4 border-white flex flex-col sm:flex-row items-center gap-4 animate-bounce"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white text-rose-600 rounded-full flex items-center justify-center font-black animate-pulse">
                                    🚨
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest leading-none">Critical Incident Active</p>
                                    <p className="text-[10px] text-rose-200 mt-1 font-bold">{criticalAlerts.length} unresolved safety or breakdown alerts</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                <button 
                                    onClick={() => setIsMuted(prev => !prev)}
                                    className="bg-white text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap"
                                >
                                    {isMuted ? '🔇 Unmute' : '🔊 Mute Siren'}
                                </button>
                                <button 
                                    onClick={() => navigate('/admin/notifications')}
                                    className="bg-brand-950 text-white hover:bg-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap"
                                >
                                    ⚠️ View & Stop
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Emergency Priority Alert Modal Popup */}
                    {activePopupAlert && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`w-full max-w-lg bg-white dark:bg-dark-surface rounded-3xl shadow-2xl border-t-8 p-8 ${
                                    activePopupAlert.priority === 'Critical' ? 'border-red-600' :
                                    activePopupAlert.priority === 'High' ? 'border-orange-500' :
                                    activePopupAlert.priority === 'Medium' ? 'border-yellow-400' :
                                    'border-blue-500'
                                }`}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
                                        activePopupAlert.priority === 'Critical' ? 'bg-red-50 text-red-600' :
                                        activePopupAlert.priority === 'High' ? 'bg-orange-50 text-orange-500' :
                                        activePopupAlert.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        {activePopupAlert.priority === 'Critical' ? '🚨' :
                                         activePopupAlert.priority === 'High' ? '⚠️' :
                                         activePopupAlert.priority === 'Medium' ? '⚡' : 'ℹ️'}
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            activePopupAlert.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                            activePopupAlert.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                            activePopupAlert.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {activePopupAlert.priority} Emergency Alert
                                        </span>
                                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-dark-text mt-1">{activePopupAlert.title}</h3>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-slate-50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-dark-border mb-6">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Project:</span>
                                        <span className="font-extrabold text-slate-800 dark:text-dark-text">{activePopupAlert.projectName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Reported By:</span>
                                        <span className="font-extrabold text-slate-800 dark:text-dark-text">{activePopupAlert.updatedBy?.name || 'Staff User'}</span>
                                    </div>
                                    {activePopupAlert.reason && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Reason:</span>
                                            <span className="font-extrabold text-amber-600 dark:text-amber-400">{activePopupAlert.reason}</span>
                                        </div>
                                    )}
                                    {activePopupAlert.remarks && (
                                        <div className="border-t border-slate-200/50 dark:border-dark-border/50 pt-3">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Remarks:</p>
                                            <p className="text-xs text-slate-600 dark:text-dark-muted font-medium italic">"{activePopupAlert.remarks}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 justify-end">
                                    <button 
                                        onClick={() => {
                                            setActivePopupAlert(null);
                                        }}
                                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setActivePopupAlert(null);
                                            navigate(`/admin/projects?id=${activePopupAlert.projectId}`);
                                        }}
                                        className="px-5 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-extrabold transition-all"
                                    >
                                        View Project
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await api.put(`/notifications/${activePopupAlert._id}/acknowledge`, {
                                                    remarks: 'Quick Acknowledged via Alert Popup Modal'
                                                });
                                                setActivePopupAlert(null);
                                                fetchAllAlertState();
                                            } catch (err) {
                                                console.error("Acknowledge failure:", err);
                                            }
                                        }}
                                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                                            activePopupAlert.priority === 'Critical' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' :
                                            activePopupAlert.priority === 'High' ? 'bg-orange-50 hover:bg-orange-400 shadow-orange-500/20' :
                                            activePopupAlert.priority === 'Medium' ? 'bg-yellow-50 hover:bg-yellow-400 text-slate-900 shadow-yellow-500/20' :
                                            'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                        }`}
                                    >
                                        Acknowledge Alert
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

export default AdminLayout;
