import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, ArrowRight, Activity, Zap, Users, Info } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated && user) {
            const path = user.role === 'admin' ? '/admin' : 
                         user.role === 'staff' ? '/staff' : '/customer';
            navigate(path, { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { 
                username: identifier, 
                password 
            });
            login(response.data, response.data.token);
            
            const rolePath = response.data.role === 'admin' ? '/admin' : 
                             response.data.role === 'staff' ? '/staff' : '/customer';
            navigate(rolePath);
        } catch (err) {
            console.error('Login Error:', err);
            setError(err.response?.data?.message || 'Authentication sequence failed. Verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-bg flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
            
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-600/5 rounded-full blur-[80px] -ml-40 -mb-40"></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-200 dark:border-dark-border shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="grid grid-cols-1 md:grid-cols-2">
                    
                    {/* Left: Branding/Visual */}
                    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-12 text-white flex flex-col justify-between relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        
                        <div className="relative z-10">
                            <Link to="/" className="flex items-center gap-3 mb-10">
                                <div className="bg-white text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg">K</div>
                                <span className="font-bold tracking-tight text-xl">KRISHNA</span>
                            </Link>
                            
                            <h2 className="text-3xl font-bold font-poppins leading-tight mb-4">Secure Portal Access</h2>
                            <p className="text-blue-100/80 text-sm font-medium leading-relaxed">Login to your specialized dashboard for real-time project metrics and support.</p>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest bg-white/10 p-3 rounded-xl border border-white/10">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                AES-256 Encryption Active
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="p-10 md:p-12">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-[#111827] dark:text-dark-text font-poppins">Identify Self</h3>
                            <p className="text-[#6B7280] dark:text-dark-muted text-sm font-medium mt-1">Enter your credential sequence.</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl mb-8 flex items-center gap-3"
                                >
                                    <Info className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Operator Identifier</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm text-[#111827] dark:text-dark-text placeholder-slate-400"
                                        placeholder="Username or Email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em]">Secure Key</label>
                                    <Link to="/forgot-password" title="Recover Access" className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Forgot Key?</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm text-[#111827] dark:text-dark-text placeholder-slate-400"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>Engage Session <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-dark-border text-center">
                            <p className="text-xs text-[#6B7280] dark:text-dark-muted font-medium mb-4 italic leading-relaxed uppercase tracking-tighter">Unauthorized access is strictly monitored by Krishna Engg Security Protocols.</p>
                            <Link to="/register" className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-2">
                                <Users className="w-4 h-4" /> New Customer? Initialize Account
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
