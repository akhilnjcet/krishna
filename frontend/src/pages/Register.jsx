import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
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

    React.useEffect(() => {
        if (isAuthenticated && user) {
            const path = user.role === 'admin' ? '/admin' : 
                         user.role === 'staff' ? '/staff' : '/customer';
            navigate(path, { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match");
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
            setError(err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-brand-50 min-h-screen py-20 px-4 flex items-center justify-center font-sans relative">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)] border-t-[16px] border-brand-950 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white border-8 border-brand-950 shadow-[12px_12px_0_0_#FFB612] relative z-10"
            >
                <div className="bg-brand-950 p-6 flex items-center justify-between border-b-4 border-brand-accent">
                    <span className="text-white font-black uppercase tracking-tighter text-2xl">SYS<span className="text-brand-accent">.REG</span></span>
                </div>

                <div className="p-10">
                    <h2 className="text-3xl font-black text-brand-950 uppercase tracking-tighter leading-none mb-2 text-center">Join Krishna Engg</h2>
                    <p className="text-brand-500 font-bold text-xs uppercase tracking-widest mb-8 text-center">Create your client portal account</p>

                    {error && (
                        <div className="bg-brand-950 text-brand-accent p-4 mb-6 text-xs font-black tracking-widest uppercase border-l-4 border-red-500">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm"
                                placeholder="YOUR FULL NAME"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm"
                                placeholder="CLIENT@COMPANY.COM"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-1">Secure Passcode</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-1">Confirm Passcode</label>
                            <input
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none transition-colors bg-brand-50 font-bold text-brand-950 text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-accent hover:bg-white text-brand-950 font-black tracking-widest uppercase py-4 border-4 border-brand-950 transition-colors shadow-[4px_4px_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none mt-6"
                        >
                            {loading ? 'PROCESSING...' : 'INITIALIZE ACCOUNT'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link to="/login" className="text-[10px] font-black tracking-widest uppercase text-brand-600 hover:text-brand-950 transition-colors">
                            Already Have An Account? Login &rarr;
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
