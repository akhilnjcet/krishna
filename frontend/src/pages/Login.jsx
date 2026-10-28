import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
    User, Lock, Mail, Key, ArrowRight, Eye, EyeOff, 
    Loader2, AlertCircle, ChevronLeft 
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [loginMode, setLoginMode] = useState('identity'); // 'identity' (Admin ID) or 'mail' (Mail / OTP)
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated && user) {
            const role = user.role || user.user?.role;
            const path = role === 'admin' ? '/admin' : 
                         role === 'staff' ? '/staff' : '/customer';
            if (location.pathname === '/login' || location.pathname === '/') {
                navigate(path, { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate, location.pathname]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (loginMode === 'identity') {
                const response = await api.post('/auth/login', { 
                    username: identifier, 
                    password 
                });
                
                const rawData = response.data;
                const token = rawData.token || rawData.user?.token;
                const userObj = rawData.user || rawData;
                login(userObj, token);
                
                const role = userObj.role || userObj.user?.role;
                if (role === 'admin') {
                    navigate('/admin');
                } else if (role === 'staff') {
                    navigate('/staff');
                } else {
                    navigate('/customer');
                }
            } else {
                // Email OTP Flow
                if (!otpSent) {
                    await api.post('/auth/login-otp/request', { email });
                    setOtpSent(true);
                } else {
                    const response = await api.post('/auth/login-otp/verify', { email, otp });
                    const rawData = response.data;
                    const token = rawData.token || rawData.user?.token;
                    const userObj = rawData.user || rawData;
                    login(userObj, token);
                    
                    const role = userObj.role || userObj.user?.role;
                    if (role === 'admin') {
                        navigate('/admin');
                    } else if (role === 'staff') {
                        navigate('/staff');
                    } else {
                        navigate('/customer');
                    }
                }
            }
        } catch (err) {
            const raw = err.response?.data;
            const message = raw?.message || raw?.error || (typeof raw === 'string' && !raw.includes('<!DOCTYPE') && !raw.includes('FUNCTION_INVOCATION_FAILED') ? raw : null);
            if (err.response?.status === 500 || (typeof raw === 'string' && raw.includes('FUNCTION_INVOCATION_FAILED'))) {
                setError(message || 'The server encountered an internal issue. Please try again shortly.');
            } else {
                setError(message || err.message || 'Identity verification failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#edf2f7] dark:bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 font-sans relative overflow-x-hidden transition-colors duration-250">
            {/* Top Navigation Bar: Back & Theme Toggle */}
            <div className="w-full max-w-5xl flex items-center justify-between py-2 z-10">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2563EB] dark:text-slate-400 dark:hover:text-blue-400 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-900"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Website</span>
                </Link>
                <ThemeToggle />
            </div>

            {/* Centered Modern Login Card */}
            <main className="w-full max-w-[460px] my-auto py-6 sm:py-8 z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-10"
                >
                    {/* Brand Logo & Name */}
                    <div className="flex items-center justify-center gap-2.5 mb-6 sm:mb-7">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
                            <img 
                                src="/logo512.png" 
                                alt="Krishna ERP Logo" 
                                className="w-full h-full object-contain rounded-md"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a] dark:text-white uppercase font-sans">
                            KRISHNA <span className="text-[#2563EB]">ERP</span>
                        </span>
                    </div>

                    {/* Headings */}
                    <div className="text-center mb-6 sm:mb-7">
                        <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                            Sign in to your workspace
                        </p>
                    </div>

                    {/* Login Mode Switcher */}
                    <div className="grid grid-cols-2 p-1.5 bg-[#f1f5f9] dark:bg-slate-800/80 rounded-2xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
                        <button
                            type="button"
                            onClick={() => {
                                setLoginMode('identity');
                                setOtpSent(false);
                                setError('');
                            }}
                            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                loginMode === 'identity'
                                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            ADMIN ID
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setLoginMode('mail');
                                setError('');
                            }}
                            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                loginMode === 'mail'
                                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            MAIL / OTP
                        </button>
                    </div>

                    {/* Error Notice */}
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 mb-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400"
                        >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="leading-snug">{error}</span>
                        </motion.div>
                    )}

                    {/* Form Controls */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {loginMode === 'identity' ? (
                                <motion.div
                                    key="admin-id-fields"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-3.5"
                                >
                                    {/* Admin User ID */}
                                    <div className="bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                        <User className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                        <input
                                            type="text"
                                            required
                                            id="admin-username"
                                            name="username"
                                            autoComplete="username"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="Admin User ID"
                                            className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[#0f172a] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                                        />
                                    </div>

                                    {/* Security Key / Password */}
                                    <div className="bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                        <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            id="admin-password"
                                            name="password"
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Security Key"
                                            className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[#0f172a] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                                            title={showPassword ? "Hide password" : "Show password"}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="mail-otp-fields"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-3.5"
                                >
                                    {/* Registered Email */}
                                    <div className={`bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
                                        otpSent ? 'opacity-80' : 'focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/20'
                                    }`}>
                                        <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                        <input
                                            type="email"
                                            required
                                            disabled={otpSent}
                                            id="registered-email"
                                            name="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Registered Email"
                                            className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[#0f172a] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                                        />
                                    </div>

                                    {/* 6-Digit OTP */}
                                    {otpSent && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
                                        >
                                            <Key className="w-5 h-5 text-[#2563EB] flex-shrink-0" />
                                            <input
                                                type="text"
                                                required
                                                autoFocus
                                                maxLength={6}
                                                id="otp-code"
                                                name="otp"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                placeholder="Enter 6-digit OTP"
                                                className="w-full bg-transparent border-0 p-0 text-sm font-black tracking-widest text-[#2563EB] dark:text-blue-400 placeholder:text-blue-300 dark:placeholder:text-blue-800 focus:outline-none focus:ring-0"
                                            />
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Navigation Links Row: Forgot access & Register */}
                        <div className="flex items-center justify-between pt-1 px-1">
                            {loginMode === 'mail' && otpSent ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOtpSent(false);
                                        setOtp('');
                                    }}
                                    className="text-xs sm:text-sm font-bold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    Wrong email? Resend
                                </button>
                            ) : (
                                <Link
                                    to="/forgot-password"
                                    className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                >
                                    Forgot access?
                                </Link>
                            )}

                            <Link
                                to="/register"
                                className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                Register
                            </Link>
                        </div>

                        {/* Prominent Sign in Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 sm:py-4 px-6 bg-[#2563EB] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-75 disabled:cursor-wait text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-5"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>
                                        {otpSent 
                                            ? "Verify & Sign in" 
                                            : loginMode === 'mail' 
                                                ? "Send OTP Code" 
                                                : "Sign in"}
                                    </span>
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Privacy Policy & Terms of Service Links */}
                    <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                        <div className="flex items-center justify-center gap-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Link 
                                to="/privacy-policy" 
                                className="hover:text-[#2563EB] dark:hover:text-blue-400 hover:underline transition-colors"
                            >
                                Privacy Policy
                            </Link>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <Link 
                                to="/terms-of-service" 
                                className="hover:text-[#2563EB] dark:hover:text-blue-400 hover:underline transition-colors"
                            >
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Bottom Security Watermark */}
            <footer className="w-full text-center py-2 text-[10px] font-bold text-slate-400/80 dark:text-slate-600 uppercase tracking-widest z-10">
                Krishna Engineering Works · Secure Workspace Protocol
            </footer>
        </div>
    );
};

export default Login;
