import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, ArrowRight, BedDouble, ShieldCheck, FileText, 
    Headphones, Home, LayoutDashboard, CreditCard, ChevronRight,
    Bell, User, ArrowLeft, Loader2, LogIn, Building2, Menu, X,
    Wifi, Zap, Key, MapPin, Sparkles, CheckCircle2, PhoneCall
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

// Curated architectural room photography matching authentic hospitality standards
const FALLBACK_ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=600&q=80'
];

export default function LodgeHome() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [userDropdown, setUserDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserBookings();
        }
    }, [isAuthenticated]);

    // Close mobile menu on desktop resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchUserBookings = async () => {
        setLoadingBookings(true);
        try {
            const res = await api.get('/bookings/my-bookings');
            if (Array.isArray(res.data)) {
                setBookings(res.data);
            }
        } catch (err) {
            console.warn('Could not load user bookings:', err);
        } finally {
            setLoadingBookings(false);
        }
    };

    // Format dates gracefully: "23 Nov 2026 – 24 Nov 2026"
    const formatDateRange = (checkIn, checkOut) => {
        if (!checkIn) return 'Dates on Request';
        const dIn = new Date(checkIn);
        const inStr = isNaN(dIn.getTime()) 
            ? checkIn 
            : dIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        
        if (!checkOut) return inStr;
        const dOut = new Date(checkOut);
        const outStr = isNaN(dOut.getTime()) 
            ? checkOut 
            : dOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        
        return `${inStr} – ${outStr}`;
    };

    // Clean status badge configuration
    const getStatusBadge = (status) => {
        const s = (status || 'active').toLowerCase();
        if (s === 'completed' || s === 'checkout' || s === 'checked_out') {
            return {
                label: 'Checked Out',
                classes: 'bg-slate-700/60 text-slate-300 border border-slate-600/60'
            };
        }
        if (s === 'cancelled' || s === 'rejected') {
            return {
                label: 'Cancelled',
                classes: 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
            };
        }
        if (s === 'pending') {
            return {
                label: 'Pending',
                classes: 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
            };
        }
        return {
            label: 'Active Stay',
            classes: 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
        };
    };

    return (
        <div className="min-h-screen w-full bg-[#0B0F19] font-sans text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
            
            {/* ═══════════════════════════════════════════════════════════════
                LUXURY HOSPITALITY HEADER
            ═══════════════════════════════════════════════════════════════ */}
            <header className="relative z-30 border-b border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl px-4 sm:px-6 lg:px-12 py-3.5 sticky top-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    
                    {/* Brand Identity */}
                    <Link to="/lodge" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md group-hover:scale-105 transition-transform shrink-0">
                            <Building2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                        </div>
                        <div className="leading-tight">
                            <span className="font-black text-lg tracking-tight text-white block">
                                KRISHNA RESIDENCY
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block">
                                Premium Executive Living
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-2xl border border-white/5">
                        <Link 
                            to="/lodge"
                            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm"
                        >
                            <Home className="w-3.5 h-3.5" /> Home
                        </Link>
                        <Link 
                            to="/lodge/search"
                            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-bold text-xs flex items-center gap-2 transition-colors"
                        >
                            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Browse Rooms
                        </Link>
                        <Link 
                            to="/lodge/dashboard"
                            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-bold text-xs flex items-center gap-2 transition-colors"
                        >
                            <BedDouble className="w-3.5 h-3.5 text-amber-400" /> My Bookings
                        </Link>
                        <Link 
                            to="/customer/payments"
                            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-bold text-xs flex items-center gap-2 transition-colors"
                        >
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Payment Hub
                        </Link>
                    </nav>

                    {/* Right Action Icons & Profile */}
                    <div className="flex items-center gap-3">
                        {/* Link back to Main Corporate Website */}
                        <button 
                            type="button"
                            onClick={() => navigate('/')} 
                            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                            title="Return to Krishna Engineering Works Portal"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Main Portal
                        </button>

                        {/* Notifications */}
                        <button 
                            type="button"
                            onClick={() => navigate('/customer')}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white relative transition shrink-0"
                            title="Notifications"
                        >
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-500" />
                        </button>

                        {/* User Capsule */}
                        {isAuthenticated && user ? (
                            <div className="relative">
                                <button 
                                    type="button"
                                    onClick={() => setUserDropdown(!userDropdown)}
                                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                                >
                                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                                        {user.name ? user.name.charAt(0) : 'U'}
                                    </div>
                                    <div className="text-left hidden sm:block">
                                        <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-amber-400 leading-tight capitalize">
                                            {user.role || 'Resident'}
                                        </p>
                                    </div>
                                </button>

                                {userDropdown && (
                                    <div className="absolute right-0 mt-2 w-52 bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-800 text-slate-200 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                                        <Link 
                                            to="/lodge/dashboard" 
                                            onClick={() => setUserDropdown(false)}
                                            className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 font-bold"
                                        >
                                            My Reservations
                                        </Link>
                                        <Link 
                                            to="/customer/payments" 
                                            onClick={() => setUserDropdown(false)}
                                            className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 font-bold"
                                        >
                                            Billing & Receipts
                                        </Link>
                                        <Link 
                                            to="/customer" 
                                            onClick={() => setUserDropdown(false)}
                                            className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 font-bold"
                                        >
                                            Client Portal
                                        </Link>
                                        <hr className="my-1.5 border-slate-800" />
                                        <button
                                            type="button"
                                            onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
                                            className="w-full text-left px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 font-bold"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-md"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Sign In</span>
                            </button>
                        )}

                        {/* Mobile Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition shrink-0"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                </div>

                {/* Mobile Drawer */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden border-t border-white/10 mt-3 pt-3 pb-2 space-y-2"
                        >
                            <div className="grid grid-cols-2 gap-2">
                                <Link 
                                    to="/lodge"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" /> Home
                                </Link>
                                <Link 
                                    to="/lodge/search"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-3 rounded-xl bg-white/5 text-slate-200 font-bold text-xs flex items-center gap-2 border border-white/10"
                                >
                                    <Calendar className="w-4 h-4 text-amber-400" /> Browse Rooms
                                </Link>
                                <Link 
                                    to="/lodge/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-3 rounded-xl bg-white/5 text-slate-200 font-bold text-xs flex items-center gap-2 border border-white/10"
                                >
                                    <BedDouble className="w-4 h-4 text-amber-400" /> My Bookings
                                </Link>
                                <Link 
                                    to="/customer/payments"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-3 rounded-xl bg-white/5 text-slate-200 font-bold text-xs flex items-center gap-2 border border-white/10"
                                >
                                    <CreditCard className="w-4 h-4 text-amber-400" /> Payments
                                </Link>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => { setMobileMenuOpen(false); navigate('/'); }} 
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 border border-white/10 flex items-center justify-center gap-1.5"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Main Portal
                                </button>
                                <Link 
                                    to="/customer/support"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 border border-white/10 flex items-center justify-center gap-1.5"
                                >
                                    <Headphones className="w-3.5 h-3.5 text-amber-400" /> Support Desk
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ═══════════════════════════════════════════════════════════════
                AUTHENTIC BOUTIQUE HERO SECTION
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#0B0F19] via-[#0E1527] to-[#111A33] pb-16 sm:pb-24 pt-8 sm:pt-14 border-b border-white/5">
                
                {/* Subtle warm atmospheric glow (No harsh neon balls) */}
                <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                        
                        {/* ── LEFT: Bespoke Residency Headline & Clear CTAs ── */}
                        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                            
                            <div className="space-y-3 sm:space-y-4">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-black uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Executive Suites & Tenancy</span>
                                </div>
                                
                                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12]">
                                    Comfortable Living at <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">Krishna Building</span>
                                </h1>
                                
                                <p className="text-sm sm:text-base md:text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
                                    Furnished residential rooms, transparent monthly billing, and flexible tenancy in Palakkad. Check live room availability or access your booking dashboard in seconds.
                                </p>
                            </div>

                            {/* Generously Sized CTA Buttons (No Truncated Ellipsis) */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
                                
                                {/* 1. Primary: Browse & Book */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/lodge/search')}
                                    className="flex-1 min-h-[54px] px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide uppercase transition-all duration-200 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                                >
                                    <Calendar className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                                    <span>Check Room Availability</span>
                                    <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                                </button>

                                {/* 2. Secondary: Manage Existing Bookings */}
                                <button
                                    type="button"
                                    onClick={() => navigate('/lodge/dashboard')}
                                    className="flex-1 min-h-[54px] px-5 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white transition-all duration-200 backdrop-blur-md flex items-center justify-center gap-2.5 active:scale-[0.98]"
                                >
                                    <BedDouble className="w-4 h-4 text-amber-400" />
                                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">Manage My Stay</span>
                                </button>
                            </div>

                            {/* Key Highlights (Hospitality Badges) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-amber-400">
                                        <BedDouble className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-200 leading-tight">
                                        Furnished<br />Rooms
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-amber-400">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-200 leading-tight">
                                        24/7 Gated<br />Security
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-amber-400">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-200 leading-tight">
                                        Digital Rent<br />Invoicing
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-amber-400">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-200 leading-tight">
                                        100% Power<br />Backup
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* ── RIGHT: Residency Overview Card ── */}
                        <div className="lg:col-span-5 w-full">
                            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                                
                                {/* Card Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div>
                                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                                            Your Reservations
                                        </h2>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            Active & past room contracts
                                        </p>
                                    </div>
                                    <Link 
                                        to="/lodge/dashboard"
                                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                                    >
                                        <span>View All</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                {/* Booking Items List */}
                                <div className="space-y-3">
                                    {loadingBookings ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                                            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                                            <p className="text-xs font-semibold">Retrieving your stay details...</p>
                                        </div>
                                    ) : isAuthenticated && bookings.length > 0 ? (
                                        bookings.slice(0, 3).map((b, idx) => {
                                            const roomNum = b.roomId?.roomNumber || b.roomNumber || `Room #${idx + 1}`;
                                            const buildingName = b.lodgeId?.name || b.roomId?.building || 'Krishna Building';
                                            const dateRange = formatDateRange(b.checkIn, b.checkOut);
                                            const status = getStatusBadge(b.status || b.bookingStatus);
                                            const thumbnail = b.roomId?.interiorPhotos?.[0]?.url 
                                                || b.roomId?.interiorFiles?.[0]?.url 
                                                || b.lodgeId?.images?.[0]?.url 
                                                || FALLBACK_ROOM_IMAGES[idx % FALLBACK_ROOM_IMAGES.length];

                                            return (
                                                <div
                                                    key={b._id || idx}
                                                    onClick={() => navigate('/lodge/dashboard')}
                                                    className="p-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img 
                                                            src={thumbnail}
                                                            alt={`Room ${roomNum}`}
                                                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10 bg-slate-800"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = FALLBACK_ROOM_IMAGES[idx % FALLBACK_ROOM_IMAGES.length];
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                                                Room #{roomNum}
                                                            </h3>
                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                {buildingName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5 truncate">
                                                                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                                                <span className="truncate">{dateRange}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.classes}`}>
                                                            {status.label}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : isAuthenticated ? (
                                        // Empty state when logged in
                                        <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 text-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                                                <BedDouble className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">No Active Reservations</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    You don't have an active room booked yet.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/lodge/search')}
                                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md inline-flex items-center gap-2"
                                            >
                                                <span>Search Available Rooms</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        // Guest preview state
                                        <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 text-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                                                <Key className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Already a Resident?</p>
                                                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                                    Sign in to access your tenancy agreement, rent schedule, and settlement receipts.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/login')}
                                                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md inline-flex items-center gap-2"
                                            >
                                                <LogIn className="w-3.5 h-3.5" />
                                                <span>Sign In to View Stay</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SEAMLESS INTEGRATED AMENITIES & FEATURES SECTION
            ═══════════════════════════════════════════════════════════════ */}
            <section className="bg-[#0e1424] py-16 sm:py-20 px-4 sm:px-6 lg:px-12 flex-1 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-12">
                    
                    {/* Section Header */}
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider">
                            Residency Standards
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                            Thoughtfully Managed Living
                        </h2>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                            Everything you need for a comfortable stay with transparent billing, on-demand maintenance, and verified lease documentation.
                        </p>
                    </div>

                    {/* 4 Feature Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Furnished Executive Rooms */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/30 transition-all duration-300 space-y-3 group shadow-lg">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <Home className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Furnished Executive Rooms
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Clean, ventilated rooms with ergonomic study desks, private attached baths, and quality mattresses.
                            </p>
                        </div>

                        {/* 2. Seamless Online Booking */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/30 transition-all duration-300 space-y-3 group shadow-lg">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Instant Room Reservation
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Check real-time room availability, reserve dates instantly, and receive immediate booking confirmation.
                            </p>
                        </div>

                        {/* 3. Transparent Accounting */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/30 transition-all duration-300 space-y-3 group shadow-lg">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Transparent Rent Invoicing
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Digital monthly bills, security deposit tracking, UPI QR payments, and certified PDF receipts.
                            </p>
                        </div>

                        {/* 4. Rapid Support & Care */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/30 transition-all duration-300 space-y-3 group shadow-lg">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                <Headphones className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                On-Demand Support
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Direct in-app ticket submission for plumbing, electrical, and housekeeping with fast on-site resolution.
                            </p>
                        </div>

                    </div>

                    {/* Bottom CTA Banner */}
                    <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center sm:text-left">
                            <h4 className="text-lg sm:text-xl font-black text-white">
                                Looking for monthly executive tenancy in Palakkad?
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium">
                                Explore furnished rooms in Krishna Building with verified power backup and dedicated parking.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/lodge/search')}
                            className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 shrink-0"
                        >
                            Browse All Rooms
                        </button>
                    </div>

                </div>
            </section>

        </div>
    );
}