import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, Activity, Users, Info } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
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

    const findRole = (data) => {
        // Deep search for role in common response structures
        if (data.role) return data.role;
        if (data.user?.role) return data.user.role;
        if (data.data?.role) return data.data.role;
        if (data.data?.user?.role) return data.data.user.role;
        return null;
    };

    const findToken = (data) => {
        return data.token || data.user?.token || data.data?.token || data.data?.user?.token;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { 
                username: identifier, 
                password 
            });
            
            const rawData = response.data;
            const role = findRole(rawData);
            const token = findToken(rawData);
            
            login(rawData, token);
            
            // Redirect logic with fallback for APK stability
            const rolePath = role === 'admin' ? '/admin' : 
                             role === 'staff' ? '/staff' : 
                             role === 'customer' ? '/customer' : '/admin'; // Fallback to admin if login succeeded
            
            navigate(rolePath);
        } catch (err) {
            console.error('Login Error:', err);
            const msg = err.response?.data?.message || err.message || 'Identity verification failed.';
            setError(msg);
            alert(`LOGIN FAIL: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-bg flex items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="w-full max-w-xl bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-200 dark:border-dark-border shadow-2xl relative z-10 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-12 text-white flex flex-col justify-between relative">
                        <div className="relative z-10">
                            <Link to="/" className="flex items-center gap-3 mb-10">
                                <span className="font-bold tracking-tight text-xl">KRISHNA</span>
                            </Link>
                            <h2 className="text-3xl font-bold leading-tight mb-4">Secure Portal</h2>
                        </div>
                    </div>
                    <div className="p-10 md:p-12">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <input
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
                                placeholder="Username"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
                                placeholder="Password"
                            />
                            {error && <p className="text-red-500 text-sm text-center font-medium animate-pulse">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#2563EB] text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                {loading ? "Communicating..." : "Engage Session"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
