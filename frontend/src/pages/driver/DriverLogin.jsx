import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { Truck, Lock, User, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

const DriverLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', {
                username: identifier.trim(),
                password
            });

            const rawData = res.data;
            const token = rawData.token || rawData.user?.token;
            const userObj = rawData.user || rawData;

            login(userObj, token);

            if (userObj.role === 'driver') {
                navigate('/driver');
            } else if (userObj.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/staff');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please check your driver credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
            {/* Top Bar */}
            <div className="flex items-center justify-between max-w-md w-full mx-auto">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                        K
                    </div>
                    <span className="font-black text-sm uppercase tracking-tight text-white">Krishna ERP</span>
                </Link>
                <ThemeToggle />
            </div>

            {/* Login Card */}
            <div className="max-w-md w-full mx-auto bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 my-auto">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-600/30">
                        <Truck className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                        Driver Portal Login
                    </h1>
                    <p className="text-xs text-slate-400">
                        Sign in to access your assigned trips, vehicle console and dispatch routes
                    </p>
                </div>

                {error && (
                    <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">
                            Driver Email / Username / Mobile
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="e.g. driver@krishnaerp.local or DL No"
                                className="w-full pl-10 pr-3 py-3 bg-slate-900/90 border border-slate-700 rounded-2xl outline-none text-white focus:border-blue-500 font-medium transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-3 py-3 bg-slate-900/90 border border-slate-700 rounded-2xl outline-none text-white focus:border-blue-500 font-medium transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Sign In to Driver Portal'} <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="text-center pt-2 border-t border-slate-700/60">
                    <p className="text-[11px] text-slate-400">
                        Need driver credentials or forgot password?{' '}
                        <span className="text-blue-400 font-bold block sm:inline">
                            Contact Fleet Manager or Logistics Desk
                        </span>
                    </p>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="text-center text-[10px] text-slate-500 max-w-md mx-auto">
                Protected Logistics Terminal • Krishna Engineering Works ERP
            </div>
        </div>
    );
};

export default DriverLogin;
