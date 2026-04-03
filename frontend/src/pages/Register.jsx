import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, ArrowRight, Activity, Users, Info, Rocket } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
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
        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match. Integrity check failed.");
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'customer'
            });
            login(response.data.user, response.data.token);
            navigate('/customer');
        } catch (err) {
            setError(err.response?.data?.message || "Registration sequence interrupted. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-bg flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
            
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] -ml-40 -mt-40"></div>
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-600/5 rounded-full blur-[100px] -mr-40 -mb-40"></div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl bg-white dark:bg-dark-surface rounded-[3rem] border border-slate-200 dark:border-dark-border shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    
                    {/* Left: Registration Context */}
                    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-12 text-white flex flex-col justify-between relative order-2 lg:order-1">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                        
                        <div className="relative z-10">
                            <Link to="/" className="flex items-center gap-3 mb-10">
                                <div className="bg-white text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg">K</div>
                                <span className="font-bold tracking-tight text-xl">KRISHNA</span>
                            </Link>
                            
                            <h2 className="text-4xl font-bold font-poppins leading-tight mb-6 mt-4">Join the Excellence Network</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-white/10 rounded-lg">
                                        <Activity className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Real-time Progress Mapping</p>
                                        <p className="text-blue-100/70 text-sm">Monitor every weld and component in live production.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-white/10 rounded-lg">
                                        <Rocket className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold">Priority Commissioning</p>
                                        <p className="text-blue-100/70 text-sm">Direct line to engineering leads for rapid deployment.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 pt-10">
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest bg-white/10 p-4 rounded-2xl border border-white/10">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Verified Client Workspace Security
                            </div>
                        </div>
                    </div>

                    {/* Right: Registration Form */}
                    <div className="p-10 lg:p-14 order-1 lg:order-2">
                        <div className="mb-10">
                            <h3 className="text-2xl font-bold text-[#111827] dark:text-dark-text font-poppins">Account Initialization</h3>
                            <p className="text-[#6B7280] dark:text-dark-muted text-sm font-medium mt-1">Start your industrial partnership today.</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl mb-8 flex items-center gap-3"
                                >
                                    <Info className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Email Sequence</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        placeholder="partner@company.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Secure Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Verify Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Begin Partnership <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-dark-border text-center">
                            <Link to="/login" className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-2">
                                <Users className="w-4 h-4" /> Registered Operator? Login Here
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
