import React, { useState } from 'react';
import FaceCapture from '../components/FaceCapture';
import api from '../services/api';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Camera, ArrowLeft, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffLogin = () => {
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'face'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', { username, password });
            login(res.data, res.data.token);
            navigate(res.data.role === 'admin' ? '/admin' : '/staff');
        } catch (err) {
            const msg = err.response?.data?.message || 
                        (err.code === 'ERR_NETWORK' ? 'Server is unreachable. Please check your network and ensure MongoDB is running.' : 'Login failed. Please check your credentials.');
            setError(msg);
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
            const msg = err.response?.data?.message || 
                        (err.code === 'ERR_NETWORK' ? 'Server is unreachable. Please ensure MongoDB is started.' : 'Face verification timed out or failed.');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-[#1e293b] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50"
            >
                <div className="p-10">
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                            <Lock className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-400">
                            Staff Authentication
                        </h1>
                        <p className="text-slate-400 mt-2">Secure access for Krishna Engineering staff</p>
                    </div>

                    <div className="flex p-1 bg-[#0f172a]/50 rounded-2xl mb-8 border border-slate-800">
                        <button
                            onClick={() => setLoginMethod('password')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 font-medium ${
                                loginMethod === 'password' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <LogIn className="w-4 h-4" /> Password
                        </button>
                        <button
                            onClick={() => setLoginMethod('face')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 font-medium ${
                                loginMethod === 'face' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Camera className="w-4 h-4" /> Face Verify
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {loginMethod === 'password' ? (
                            <motion.form
                                key="password"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handlePasswordLogin}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-[#0f172a]/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="Enter your username"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-[#0f172a]/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                            placeholder="Enter your secret password"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Authenticating..." : "Login to Workspace"}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="face"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center"
                            >
                                <FaceCapture onCapture={handleFaceLogin} buttonText="Scan My Face" />
                                {error && (
                                    <p className="mt-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-center w-full">
                                        {error}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-10 pt-8 border-t border-slate-700/50 flex items-center justify-center">
                        <button 
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default StaffLogin;
