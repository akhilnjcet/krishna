import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, Users, Info, Phone, Key, Smartphone, Loader2 } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Login = () => {
    const [loginMode, setLoginMode] = useState('identity'); // 'identity' or 'phone'
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
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
                login(rawData.user || rawData, token);
                navigate(rawData.user?.role === 'admin' ? '/admin' : '/customer');
            } else {
                // Phone OTP Flow
                if (!otpSent) {
                    // Mock OTP request
                    await new Promise(r => setTimeout(r, 1000));
                    setOtpSent(true);
                    setLoading(false);
                    return;
                } else {
                    // Mock OTP verification
                    if (otp === '123456' || otp === '000000') {
                        // In a real app, this would verify with backend and return a user/token
                        // For now, we simulate success for customer
                        const mockUser = {
                            name: 'Guest User',
                            mobile: phone,
                            role: 'customer'
                        };
                        login(mockUser, 'mock-token-otp');
                        navigate('/customer');
                    } else {
                        throw new Error('Invalid OTP Code');
                    }
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Identity verification failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

            <div className="w-full max-w-xl bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative z-10 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-12 text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <Activity className="w-48 h-48 absolute -bottom-10 -right-10 rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <Link to="/" className="flex items-center gap-3 mb-10">
                                <ShieldCheck className="w-8 h-8" />
                                <span className="font-bold tracking-tight text-xl uppercase">Krishna <span className="opacity-60 italic">ERP</span></span>
                            </Link>
                            <h2 className="text-4xl font-black italic leading-none mb-4 tracking-tighter">Unified <br />Command.</h2>
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest leading-loose">Real-time sync and multi-layered credential protocol active.</p>
                        </div>
                    </div>

                    <div className="p-10 md:p-12">
                        <div className="flex gap-4 mb-10 bg-slate-100 p-1.5 rounded-2xl">
                            <button 
                                onClick={() => { setLoginMode('identity'); setOtpSent(false); }}
                                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${loginMode === 'identity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                Admin ID
                            </button>
                            <button 
                                onClick={() => setLoginMode('phone')}
                                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${loginMode === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                Phone/OTP
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <AnimatePresence mode="wait">
                                {loginMode === 'identity' ? (
                                    <motion.div 
                                        key="id"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 focus-within:border-blue-500 transition-all">
                                            <Users className="w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                                placeholder="Admin User ID"
                                            />
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 focus-within:border-blue-500 transition-all">
                                            <Lock className="w-5 h-5 text-slate-400" />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                                placeholder="Security Key"
                                            />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="phone"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 focus-within:border-blue-500 transition-all">
                                            <Smartphone className="w-5 h-5 text-slate-400" />
                                            <input
                                                type="tel"
                                                required
                                                disabled={otpSent}
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                                placeholder="Registered Mobile"
                                            />
                                        </div>
                                        {otpSent && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4 focus-within:border-blue-500 transition-all"
                                            >
                                                <Key className="w-5 h-5 text-blue-500" />
                                                <input
                                                    type="text"
                                                    required
                                                    autoFocus
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-black tracking-[0.5em] text-blue-600 placeholder:text-blue-300"
                                                    placeholder="000000"
                                                />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center justify-between px-1">
                                <Link to="/forgot-password" size="sm" className="text-[10px] font-extrabold text-slate-300 hover:text-blue-600 uppercase tracking-widest transition-colors">
                                    Lost Access?
                                </Link>
                                <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] font-extrabold text-blue-600 hover:underline uppercase tracking-widest transition-colors">
                                    {otpSent ? "Wrong Phone?" : "Register Member"}
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-500 rounded-xl flex items-center gap-2 border border-red-100">
                                    <AlertCircle className="w-4 h-4" />
                                    <p className="text-[10px] font-extrabold uppercase tracking-tight">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-[#2563EB] text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (
                                    <>
                                        {otpSent ? "Verify & Command" : loginMode === 'phone' ? "Send OTP Code" : "Initial Authorization"}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <p className="fixed bottom-10 text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em]">System Cloud Node: SECURE-01</p>
        </div>
    );
};

const AlertCircle = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default Login;
