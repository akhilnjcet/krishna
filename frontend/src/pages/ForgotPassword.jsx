import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Mail, KeyRound, Lock, ArrowRight, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/forgot-password', { email });
            setStep(2);
            setSuccessMsg("OTP sent to your email.");
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/verify-otp', { email, otp });
            setStep(3);
            setSuccessMsg("OTP Verified! Please enter a new password.");
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            setSuccessMsg("Password reset successfully!");
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white p-8 md:p-12 border-4 border-brand-950 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
                <Link to="/login" className="absolute top-6 left-6 text-brand-400 hover:text-brand-950 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>

                <div className="mb-10 text-center mt-4">
                    <div className="w-16 h-16 bg-brand-950 mx-auto mb-6 flex items-center justify-center transform rotate-3 border-4 border-brand-accent">
                        <KeyRound className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-950">Security Override</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Password Recovery Module</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 text-xs font-bold uppercase tracking-widest">
                        {error}
                    </div>
                )}
                
                {successMsg && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {successMsg}
                    </div>
                )}

                {/* STEP 1: ENTER EMAIL */}
                {step === 1 && (
                    <form onSubmit={handleSendOTP} className="space-y-6">
                        <p className="text-sm font-bold text-gray-500 mb-6 text-center">Enter your registered email address to receive a secure 6-digit OTP.</p>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-500">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                <input 
                                    type="email" required
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-brand-50 border-4 border-brand-100 pl-12 pr-4 py-4 rounded-none font-bold text-brand-950 outline-none focus:border-brand-950 focus:bg-white transition-all placeholder:text-gray-300"
                                    placeholder="operator@krishna.com"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" disabled={loading}
                            className="w-full bg-brand-950 text-white font-black py-4 uppercase tracking-widest text-xs hover:bg-brand-accent hover:text-brand-950 transition-colors border-2 border-brand-950 shadow-solid-sm active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transmit OTP'} <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                )}

                {/* STEP 2: VERIFY OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} className="space-y-6">
                        <p className="text-sm font-bold text-gray-500 mb-6 text-center">Check your inbox. We sent a 6-digit code to <span className="text-brand-950 font-black">{email}</span></p>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-500">Authentication Code (OTP)</label>
                            <input 
                                type="text" required maxLength="6"
                                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-brand-50 border-4 border-brand-100 px-4 py-4 rounded-none h-16 font-black text-3xl tracking-[1em] text-center text-brand-950 outline-none focus:border-brand-950 focus:bg-white transition-all"
                                placeholder="------"
                            />
                        </div>
                        <button 
                            type="submit" disabled={loading || otp.length !== 6}
                            className="w-full bg-brand-950 text-white font-black py-4 uppercase tracking-widest text-xs hover:bg-brand-accent hover:text-brand-950 transition-colors border-2 border-brand-950 shadow-solid-sm active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'} <CheckCircle2 className="w-4 h-4" />
                        </button>
                    </form>
                )}

                {/* STEP 3: RESET PASSWORD */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <p className="text-sm font-bold text-gray-500 mb-6 text-center">Signal authorized. Establish a new security key below.</p>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-500">New Security Key (Password)</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                <input 
                                    type="password" required minLength="6"
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-brand-50 border-4 border-brand-100 pl-12 pr-4 py-4 rounded-none font-bold text-brand-950 outline-none focus:border-brand-950 focus:bg-white transition-all placeholder:text-gray-300"
                                    placeholder="Enter new password"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" disabled={loading}
                            className="w-full bg-brand-accent text-brand-950 font-black py-4 uppercase tracking-widest text-xs hover:bg-brand-950 hover:text-white transition-colors border-2 border-brand-950 shadow-solid-sm active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalize Override'} <Lock className="w-4 h-4" />
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
};

export default ForgotPassword;
