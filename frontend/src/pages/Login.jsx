import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

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

            if (response.data.role === 'admin') {
                navigate('/admin');
            } else if (response.data.role === 'staff') {
                navigate('/staff');
            } else {
                navigate('/customer');
            }
        } catch (err) {
            console.error('Login Error:', err);
            const msg = err.response?.data?.message || 
                        (err.code === 'ERR_NETWORK' ? 'SERVER_CONNECTION_FAILED' : 'AUTHORIZATION FAILED');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-brand-50 min-h-screen py-32 px-4 flex items-center justify-center font-sans relative">

            {/* Industrial background accent */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)] border-t-[16px] border-brand-950 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white border-8 border-brand-950 shadow-[12px_12px_0_0_#FFB612] relative z-10"
            >
                <div className="bg-brand-950 p-6 flex items-center justify-between border-b-4 border-brand-accent">
                    <div className="flex items-center gap-3 relative">
                        <span className="text-white font-black uppercase tracking-tighter text-2xl">SYS<span className="text-brand-accent">.AUTH</span></span>
                    </div>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-brand-950"></div>
                </div>

                <div className="p-10">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-brand-950 uppercase tracking-tighter leading-none mb-2">Secure Access</h2>
                        <p className="text-brand-500 font-bold text-xs uppercase tracking-widest">Identify to proceed to operations</p>
                    </div>

                    {error && (
                        <div className="bg-brand-950 text-brand-accent p-4 mb-6 text-xs font-black tracking-widest uppercase border-l-4 border-red-500 select-none flex items-center gap-3">
                            <span className="text-red-500 text-lg">!</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-2">Operator ID [Email/Username]</label>
                            <input
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm placeholder-brand-300 rounded-none shadow-inner"
                                placeholder="ADMIN OR ADMIN@KRISHNAENGG.COM"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600">Secure Key [Passcode]</label>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm placeholder-brand-300 rounded-none shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-brand-accent hover:bg-white text-brand-950 font-black tracking-widest uppercase py-4 border-4 border-brand-950 transition-colors shadow-[4px_4px_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none select-none ${loading ? 'opacity-80 pointer-events-none' : ''}`}
                            >
                                {loading ? 'VALIDATING...' : 'ENGAGE'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-[10px] font-black tracking-widest uppercase text-brand-400">
                        UNAUTHORIZED ACCESS IS STRICTLY MONITORED
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
