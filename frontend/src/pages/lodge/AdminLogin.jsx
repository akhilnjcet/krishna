import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowLeft, Key, ArrowRight } from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const AdminLogin = () => {
    const navigate = useNavigate();
    const loginAdmin = useLodgeStore(state => state.loginAdmin);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        const success = loginAdmin(pin);
        if (success) {
            navigate('/lodge/admin');
        } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 2000);
        }
    };

    const addNumber = (num) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const deleteLast = () => {
        setPin(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <div className="pt-12 px-6">
                <button 
                    onClick={() => navigate('/lodge')}
                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center px-8">
                <div className="w-16 h-16 bg-[#2D5BE3] rounded-3xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-200">
                    <Shield className="w-8 h-8" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-800 mb-2 font-poppins">Admin Command</h1>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-12">Authorization Required</p>

                {/* PIN Display */}
                <div className="flex gap-4 mb-12">
                    {[...Array(4)].map((_, i) => (
                        <div 
                            key={i}
                            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                pin.length > i 
                                ? 'border-[#2D5BE3] bg-blue-50' 
                                : 'border-slate-100 bg-white'
                            } ${error ? 'border-red-500 bg-red-50 shake' : ''}`}
                        >
                            {pin.length > i && <div className="w-3 h-3 bg-[#2D5BE3] rounded-full"></div>}
                        </div>
                    ))}
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-6 max-w-[300px] w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => addNumber(num.toString())}
                            className="w-16 h-16 rounded-full bg-white text-xl font-bold text-slate-700 shadow-sm border border-slate-50 hover:bg-slate-50 transition-colors"
                        >
                            {num}
                        </button>
                    ))}
                    <button onClick={() => setPin('')} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">Clear</button>
                    <button onClick={() => addNumber('0')} className="w-16 h-16 rounded-full bg-white text-xl font-bold text-slate-700 shadow-sm border border-slate-50">0</button>
                    <button onClick={deleteLast} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400"><ArrowLeft className="w-5 h-5"/></button>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={pin.length < 4}
                    className={`mt-12 w-full max-w-[200px] py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${
                        pin.length === 4 
                        ? 'bg-[#2D5BE3] text-white shadow-xl shadow-blue-200' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    <Lock className="w-5 h-5" />
                    Authorize
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}} />
        </div>
    );
};

export default AdminLogin;
