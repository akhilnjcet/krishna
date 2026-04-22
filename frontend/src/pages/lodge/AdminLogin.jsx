import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Lock, ArrowLeft, Mail, 
    ChevronRight, Loader2, AlertCircle 
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useSignalStore from '../../stores/signalStore';
import api from '../../services/api';
import { Wifi, Cloud, Terminal } from 'lucide-react';

const SignalSwitcher = () => {
    const { activeSignal, localIp, toggleSignal, setLocalIp } = useSignalStore();
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 overflow-hidden transition-all">
            <button 
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-blue-600"
            >
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Signal Status: {activeSignal === 'cloud' ? 'Cloud Link' : 'Local Override'}</span>
                </div>
                <div className="px-2 py-1 bg-white rounded-lg border border-blue-100 text-[8px] font-black uppercase">Adjust Signal</div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="px-4 pb-4 space-y-3"
                    >
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => toggleSignal('cloud')}
                                className={`flex-grow py-3 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeSignal === 'cloud' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-blue-400 border border-blue-100'}`}
                            >
                                <Cloud className="w-3 h-3" /> Production Cloud
                            </button>
                            <button 
                                type="button"
                                onClick={() => toggleSignal('local')}
                                className={`flex-grow py-3 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeSignal === 'local' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white text-slate-400 border border-slate-200'}`}
                            >
                                <Terminal className="w-3 h-3" /> Local Link
                            </button>
                        </div>
                        {activeSignal === 'local' && (
                            <div className="mt-2 p-2 bg-white rounded-xl border border-blue-100 flex items-center gap-3">
                                <span className="text-[8px] font-black text-blue-600 uppercase whitespace-nowrap">Local IP:</span>
                                <input 
                                    className="bg-transparent border-0 p-0 w-full focus:ring-0 text-[10px] font-black text-slate-700 font-mono"
                                    value={localIp}
                                    onChange={(e) => setLocalIp(e.target.value)}
                                    placeholder="e.g. 192.168.1.10"
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AdminLogin = () => {
    const navigate = useNavigate();
    const login = useAuthStore(state => state.login);
    
    const [formData, setFormData] = useState({
        email: '', // Backend uses email as Admin ID
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });
            
            const data = res.data;
            const role = data.role || data.user?.role || (data.data && (data.data.role || data.data.user?.role));
            const userObj = data.user || data.data?.user || data;
            const token = data.token || data.user?.token || (data.data && data.data.token);

            if (token && role === 'admin') {
                login(userObj, token);
                navigate('/lodge/admin');
            } else if (role && role !== 'admin') {
                setError('Insufficient Command Clearance');
            } else {
                setError('Invalid Gateway Response');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication Link Failure');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <div className="pt-12 px-6">
                <button 
                    onClick={() => navigate('/lodge')}
                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center px-8 pb-10 max-w-lg mx-auto w-full">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-slate-200"
                >
                    <Shield className="w-10 h-10" />
                </motion.div>
                
                <h1 className="text-4xl font-black text-slate-900 mb-2 italic tracking-tight">Admin <span className="text-blue-600">Secure.</span></h1>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-12">Industrial Command Protocol</p>

                <form onSubmit={handleLogin} className="w-full space-y-4">
                    <SignalSwitcher />
                    <div className="space-y-1">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4 focus-within:border-blue-500 transition-all shadow-sm">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Admin ID / Email"
                                className="bg-transparent border-0 p-0 w-full focus:ring-0 text-slate-900 font-bold placeholder:text-slate-300"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4 focus-within:border-blue-500 transition-all shadow-sm">
                            <Lock className="w-5 h-5 text-slate-400" />
                            <input 
                                type="password"
                                placeholder="Access Password"
                                className="bg-transparent border-0 p-0 w-full focus:ring-0 text-slate-900 font-bold placeholder:text-slate-300"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100"
                            >
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Authorize & Link Cloud</>}
                    </button>
                    
                    <p className="text-center text-[8px] font-bold text-slate-300 uppercase leading-relaxed px-4">
                        By authorizing, you agree to establish a secure link with the Krishna ERP Cloud and synchronize all local telemetry.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
