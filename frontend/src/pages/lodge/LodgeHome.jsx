import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Calendar, ArrowRight, BedDouble, ShieldCheck, FileText, 
    Headphones, Home, LayoutDashboard, CreditCard, ChevronRight,
    Bell, User, ArrowLeft, Loader2, LogIn, Sparkles, Building2,
    CheckCircle2, Clock, AlertCircle, XCircle
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

// Curated high-resolution fallback room photography matching the reference aesthetic
const FALLBACK_ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=400&q=80'
];

export default function LodgeHome() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [userDropdown, setUserDropdown] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserBookings();
        }
    }, [isAuthenticated]);

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

    // Format calendar dates into readable format: "05 Oct 2026 – 05 Nov 2026"
    const formatDateRange = (checkIn, checkOut) => {
        if (!checkIn) return 'Dates Not Specified';
        const dIn = new Date(checkIn);
        const inStr = isNaN(dIn.getTime()) 
            ? checkIn 
            : dIn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        if (!checkOut) return inStr;
        const dOut = new Date(checkOut);
        const outStr = isNaN(dOut.getTime()) 
            ? checkOut 
            : dOut.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        return `${inStr} – ${outStr}`;
    };

    // Status badge style configuration matching reference image
    const getStatusBadge = (status) => {
        const s = (status || 'active').toLowerCase();
        if (s === 'completed' || s === 'checkout' || s === 'checked_out') {
            return {
                label: 'Completed',
                classes: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            };
        }
        if (s === 'cancelled' || s === 'rejected') {
            return {
                label: 'Cancelled',
                classes: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            };
        }
        if (s === 'pending') {
            return {
                label: 'Pending',
                classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            };
        }
        return {
            label: 'Active',
            classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        };
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col">
            
            {/* ═══════════════════════════════════════════════════════════════
                HERO SECTION (Rich Blue-Purple Gradient)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative w-full bg-gradient-to-br from-[#0B1536] via-[#161D4C] to-[#2B1055] text-white overflow-hidden pb-16 sm:pb-20">
                
                {/* Subtle radial ambient glow layers */}
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

                {/* Top Navigation Bar */}
                <header className="relative z-30 border-b border-white/10 px-4 sm:px-6 lg:px-12 py-3.5">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                        
                        {/* Left: Brand Logo & Navigation Pills */}
                        <div className="flex items-center gap-6 sm:gap-8">
                            <Link to="/lodge" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                    <Building2 className="w-6 h-6 text-blue-300" />
                                </div>
                                <div className="leading-tight">
                                    <span className="font-black text-lg sm:text-xl tracking-tight text-white block">
                                        KRISHNA
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                                        Engineering Works
                                    </span>
                                </div>
                            </Link>

                            {/* Nav items */}
                            <nav className="hidden xl:flex items-center gap-2">
                                <Link 
                                    to="/lodge"
                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                                >
                                    <Home className="w-4 h-4" /> Home
                                </Link>
                                <Link 
                                    to="/customer"
                                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs flex items-center gap-2 transition-colors"
                                >
                                    <LayoutDashboard className="w-4 h-4 text-slate-400" /> My Dashboard
                                </Link>
                                <Link 
                                    to="/lodge/dashboard"
                                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs flex items-center gap-2 transition-colors"
                                >
                                    <Calendar className="w-4 h-4 text-slate-400" /> My Bookings
                                </Link>
                                <Link 
                                    to="/customer/payments"
                                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs flex items-center gap-2 transition-colors"
                                >
                                    <CreditCard className="w-4 h-4 text-slate-400" /> Payments
                                </Link>
                                <Link 
                                    to="/customer/support"
                                    className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs flex items-center gap-2 transition-colors"
                                >
                                    <Headphones className="w-4 h-4 text-slate-400" /> Support
                                </Link>
                            </nav>
                        </div>

                        {/* Right: Quick action buttons & User Profile */}
                        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                            
                            {/* Portal Shortcut Buttons */}
                            <div className="hidden sm:flex items-center gap-2">
                                <button 
                                    onClick={() => navigate('/')} 
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Main Home
                                </button>
                                <button 
                                    onClick={() => navigate('/lodge/dashboard')} 
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all backdrop-blur-md cursor-pointer"
                                >
                                    My Dashboard
                                </button>
                                <button 
                                    onClick={() => navigate('/login')} 
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all backdrop-blur-md cursor-pointer"
                                >
                                    Portal Entrance
                                </button>
                            </div>

                            {/* Notifications */}
                            <button 
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white relative transition-colors cursor-pointer"
                                title="Notifications"
                            >
                                <Bell className="w-4 h-4" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 border border-[#161D4C]" />
                            </button>

                            {/* User Profile Capsule */}
                            {isAuthenticated && user ? (
                                <div className="relative">
                                    <button 
                                        onClick={() => setUserDropdown(!userDropdown)}
                                        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                                            {user.name ? user.name.charAt(0) : 'U'}
                                        </div>
                                        <div className="text-left hidden md:block">
                                            <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                                                {user.name}
                                            </p>
                                            <p className="text-[10px] text-blue-300 leading-tight capitalize">
                                                {user.role || 'Client'}
                                            </p>
                                        </div>
                                    </button>

                                    {userDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                                            <Link 
                                                to="/lodge/dashboard" 
                                                className="block px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                            >
                                                Bookings Dashboard
                                            </Link>
                                            <Link 
                                                to="/customer" 
                                                className="block px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                            >
                                                Client Portal
                                            </Link>
                                            <Link 
                                                to="/customer/payments" 
                                                className="block px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                            >
                                                Payment Hub
                                            </Link>
                                            <hr className="my-1 border-slate-200 dark:border-slate-800" />
                                            <button
                                                onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
                                            >
                                                Log Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                >
                                    <LogIn className="w-3.5 h-3.5" /> Sign In
                                </button>
                            )}
                        </div>

                    </div>
                </header>

                {/* Hero Main Content Grid */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-14 md:pt-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                        
                        {/* ── LEFT COLUMN: Hero Copy & CTA Buttons ── */}
                        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                            
                            <div className="space-y-3 sm:space-y-4">
                                <span className="inline-block text-xs sm:text-sm font-extrabold uppercase tracking-[0.25em] text-blue-300">
                                    WELCOME TO
                                </span>
                                
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
                                    Krishna Building
                                </h1>
                                
                                <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-xl font-normal leading-relaxed">
                                    Manage your stay and easily browse available rooms strictly monitored via our dynamic availability matrix.
                                </p>
                            </div>

                            {/* Two Prominent Side-by-Side Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-xl">
                                
                                {/* 1. START YOUR BOOKING */}
                                <button
                                    onClick={() => navigate('/lodge/rooms')}
                                    className="min-h-[58px] px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm tracking-wider uppercase transition-all duration-200 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.98]"
                                >
                                    <Calendar className="w-5 h-5 text-blue-200" />
                                    <span>START YOUR BOOKING</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* 2. ALREADY BOOKED – View & Manage Your Bookings */}
                                <button
                                    onClick={() => navigate('/lodge/dashboard')}
                                    className="min-h-[58px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all duration-200 backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.98] shadow-lg text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                            <BedDouble className="w-5 h-5 text-blue-300" />
                                        </div>
                                        <div className="min-w-0 leading-tight">
                                            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                                                ALREADY BOOKED
                                            </p>
                                            <p className="text-[11px] text-blue-200/80 font-medium truncate">
                                                View & Manage Your Bookings
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform shrink-0" />
                                </button>
                            </div>

                            {/* Feature Highlights Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 sm:pt-6 border-t border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <BedDouble className="w-5 h-5 text-blue-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                                        Comfortable<br />Rooms
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                                        Secure & Safe<br />Environment
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                                        Digital Payments<br />& Invoices
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Headphones className="w-5 h-5 text-blue-400 shrink-0" />
                                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                                        24/7<br />Support
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* ── RIGHT COLUMN: Your Booking Overview Card ── */}
                        <div className="lg:col-span-5">
                            <div className="bg-[#131B38]/85 backdrop-blur-xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                                
                                {/* Card Header */}
                                <div className="flex items-center justify-between pb-1">
                                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                        Your Booking Overview
                                    </h2>
                                    <Link 
                                        to="/lodge/dashboard"
                                        className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                    >
                                        View All <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                {/* Booking Items List */}
                                <div className="space-y-3">
                                    {loadingBookings ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                            <p className="text-xs font-semibold">Loading your reservations...</p>
                                        </div>
                                    ) : isAuthenticated && bookings.length > 0 ? (
                                        bookings.slice(0, 3).map((b, idx) => {
                                            const roomNum = b.roomId?.roomNumber || b.roomNumber || `Room #${idx + 1}`;
                                            const buildingName = b.lodgeId?.name || b.roomId?.building || 'Krishna Building';
                                            const dateRange = formatDateRange(b.checkIn, b.checkOut);
                                            const status = getStatusBadge(b.status);
                                            const thumbnail = b.roomId?.interiorPhotos?.[0]?.url 
                                                || b.roomId?.interiorFiles?.[0]?.url 
                                                || b.lodgeId?.images?.[0]?.url 
                                                || FALLBACK_ROOM_IMAGES[idx % FALLBACK_ROOM_IMAGES.length];

                                            return (
                                                <div
                                                    key={b._id || idx}
                                                    onClick={() => navigate('/lodge/dashboard')}
                                                    className="p-3 sm:p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/30 rounded-2xl flex items-center justify-between gap-3.5 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img 
                                                            src={thumbnail}
                                                            alt={`Room ${roomNum}`}
                                                            className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl object-cover shrink-0 border border-white/15 bg-slate-800"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = FALLBACK_ROOM_IMAGES[idx % FALLBACK_ROOM_IMAGES.length];
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                                                                    Room #{roomNum}
                                                                </h3>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                {buildingName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 mt-1">
                                                                <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                                                                <span className="truncate">{dateRange}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.classes}`}>
                                                            {status.label}
                                                        </span>
                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : isAuthenticated ? (
                                        // Empty state when logged in but no bookings exist
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mx-auto">
                                                <BedDouble className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">No Active Reservations</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    You don't have any rooms booked in Krishna Building yet.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate('/lodge/rooms')}
                                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                                            >
                                                <span>Browse Available Rooms</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        // Unauthenticated guest preview state
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Manage Your Existing Tenancy</p>
                                                <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                                                    Sign in to view real-time booking details, rent schedules, and download agreements.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                                            >
                                                <LogIn className="w-3.5 h-3.5" />
                                                <span>Sign In to View Bookings</span>
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
                PREMIUM TENANCY FEATURE SECTION (White/Light Background)
            ═══════════════════════════════════════════════════════════════ */}
            <section className="bg-white dark:bg-slate-900 py-16 sm:py-20 px-4 sm:px-6 lg:px-12 flex-1">
                <div className="max-w-7xl mx-auto space-y-12">
                    
                    {/* Section Header */}
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Premium Tenancy
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                            Experience seamless living with dedicated room management, automated billing, and instant maintenance ticketing all monitored under Krishna ERP.
                        </p>
                    </div>

                    {/* 4 Feature Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Modern Rooms */}
                        <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex items-start gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                <Home className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Modern Rooms
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Clean, spacious and well maintained rooms.
                                </p>
                            </div>
                        </div>

                        {/* 2. Easy Booking */}
                        <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex items-start gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Easy Booking
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Real-time availability and instant confirmation.
                                </p>
                            </div>
                        </div>

                        {/* 3. Transparent Billing */}
                        <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex items-start gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Transparent Billing
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Digital invoices and multiple payment options.
                                </p>
                            </div>
                        </div>

                        {/* 4. Dedicated Support */}
                        <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex items-start gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                                <Headphones className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Dedicated Support
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Quick response for any issues or requests.
                                </p>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

        </div>
    );
}
