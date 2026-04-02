import React, { useState, useEffect } from 'react';
import FaceCapture from '../components/FaceCapture';
import api from '../services/api';
import useAuthStore from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Camera, ArrowLeft, LogIn, ShieldCheck, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line

const StaffLogin = () => {
    const [loginMethod, setLoginMethod] = useState('password'); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login, isAuthenticated, user: currentUser } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated && currentUser) {
            const rolePath = currentUser.role === 'admin' ? '/admin' : '/staff';
            navigate(rolePath);
        }
    }, [isAuthenticated, currentUser, navigate]);

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', { username, password });
            login(res.data, res.data.token);
            navigate(res.data.role === 'admin' ? '/admin' : '/staff');
        } catch (err) {
            setError(err.response?.data?.message || 'Staff authentication interrupted. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleFaceLogin = async (descriptor) => {
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/verify-face', { descriptor });
            login(res.data.user, res.data.user.token);
            navigate(res.data.user.role === 'admin' ? '/admin' : '/staff');
        } catch (err) {
            setError(err.response?.data?.message || 'Face biometrics sequence timed out.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-bg flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-200 dark:border-dark-border shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-10 text-white relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                            <ShieldCheck className="w-8 h-8 text-blue-200" />
                        </div>
                        <h1 className="text-3xl font-bold font-poppins">Staff Authentication</h1>
                        <p className="text-blue-100/70 text-sm mt-2">Secure terminal access for Krishna Engineering Works.</p>
                    </div>
                </div>

                <div className="p-10">
                    <div className="flex p-1.5 bg-slate-50 dark:bg-dark-bg rounded-2xl mb-10 border border-slate-200 dark:border-dark-border">
                        <button
                            onClick={() => setLoginMethod('password')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest ${
                                loginMethod === 'password' ? 'bg-white dark:bg-dark-surface text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <LogIn className="w-4 h-4" /> Passcode
                        </button>
                        <button
                            onClick={() => setLoginMethod('face')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest ${
                                loginMethod === 'face' ? 'bg-white dark:bg-dark-surface text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Camera className="w-4 h-4" /> Face Biometrics
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {loginMethod === 'password' ? (
                            <motion.form
                                key="password"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onSubmit={handlePasswordLogin}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Staff ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                            placeholder="Enter operational ID"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-[#6B7280] dark:text-dark-muted uppercase tracking-[0.2em] ml-1">Secure Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                            placeholder="Enter your private key"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-center gap-3">
                                        <Info className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : "Engage Workflow"}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="face"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col items-center"
                            >
                                <FaceCapture onCapture={handleFaceLogin} buttonText="Scan Biometric Profile" />
                                {error && (
                                    <div className="mt-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-center gap-3 w-full">
                                        <Info className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{error}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-dark-border flex items-center justify-center">
                        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold text-[10px] uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" /> Return to Command Center
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default StaffLogin;
