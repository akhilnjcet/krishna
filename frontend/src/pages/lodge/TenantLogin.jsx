import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Key, DoorOpen, ArrowLeft, ShieldCheck, 
    AlertCircle, ChevronRight, Hash 
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const TenantLogin = () => {
    const navigate = useNavigate();
    const { rooms, loginTenant } = useLodgeStore();
    
    const [step, setStep] = useState(1); // 1: Select Room, 2: Enter PIN
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRoomSelect = (room) => {
        if (room.status !== 'occupied') return;
        setSelectedRoom(room);
        setStep(2);
    };

    const handleLogin = async (p = pin) => {
        if (p.length < 4) return;
        
        setLoading(true);
        setError(false);
        
        // Brief delay for "security check" feel
        setTimeout(() => {
            const success = loginTenant(selectedRoom.number, p);
            if (success) {
                navigate(`/lodge/room/${selectedRoom.number}`);
            } else {
                setError(true);
                setPin('');
                setLoading(false);
            }
        }, 800);
    };

    const addNumber = (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) handleLogin(newPin);
        }
    };

    const deleteLast = () => setPin(prev => prev.slice(0, -1));

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Header */}
            <div className="pt-12 px-6 flex items-center justify-between">
                <button 
                    onClick={() => step === 1 ? navigate('/lodge') : setStep(1)}
                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol</p>
                    <p className="text-xs font-bold text-[#2D5BE3]">V2.0-SECURE</p>
                </div>
            </div>

            <div className="flex-grow flex flex-col px-8 py-10 max-w-lg mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <div className="space-y-2 text-center sm:text-left">
                                <h1 className="text-3xl font-black text-slate-800 font-poppins">Identify Room</h1>
                                <p className="text-slate-500 font-medium">Select your allocated room number to continue.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {rooms.map((room) => (
                                    <button
                                        key={room.id}
                                        onClick={() => handleRoomSelect(room)}
                                        disabled={room.status !== 'occupied'}
                                        className={`group relative flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${
                                            room.status === 'occupied' 
                                            ? 'bg-white border-slate-100 hover:border-[#2D5BE3] shadow-lg shadow-slate-200/50' 
                                            : 'bg-slate-50 border-transparent opacity-50 grayscale cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                                                room.status === 'occupied' ? 'bg-blue-50 text-[#2D5BE3]' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <DoorOpen className="w-7 h-7" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xl font-black text-slate-800 font-poppins">Room {room.number}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {room.status === 'occupied' ? 'Access Permitted' : 'Vacant Unit'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-[#2D5BE3] transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-16 h-16 bg-[#2D5BE3] rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-200">
                                <Key className="w-8 h-8" />
                            </div>
                            
                            <h2 className="text-2xl font-black text-slate-800 mb-1 font-poppins">Room {selectedRoom?.number}</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">Enter Temporary PIN</p>

                            {/* PIN Display */}
                            <div className="flex gap-4 mb-12">
                                {[...Array(4)].map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                            pin.length > i 
                                            ? 'border-[#2D5BE3] bg-blue-50' 
                                            : 'border-slate-100 bg-white'
                                        } ${error ? 'border-red-500 bg-red-50 animate-shake' : ''}`}
                                    >
                                        {pin.length > i && <div className="w-3 h-3 bg-[#2D5BE3] rounded-full"></div>}
                                    </div>
                                ))}
                            </div>

                            {/* Number Pad */}
                            <div className="grid grid-cols-3 gap-y-6 gap-x-10 max-w-[300px] w-full">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => addNumber(num.toString())}
                                        className="w-16 h-16 rounded-full bg-white text-xl font-bold text-slate-700 shadow-sm border border-slate-50 hover:bg-slate-50 active:scale-90 transition-all"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button onClick={() => setPin('')} className="w-16 h-16 flex items-center justify-center text-slate-400 transition-opacity">
                                    <Hash className="w-5 h-5" />
                                </button>
                                <button onClick={() => addNumber('0')} className="w-16 h-16 rounded-full bg-white text-xl font-bold text-slate-700 shadow-sm border border-slate-50 active:scale-90 transition-all">0</button>
                                <button onClick={deleteLast} className="w-16 h-16 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                                    <ArrowLeft className="w-6 h-6"/>
                                </button>
                            </div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 flex items-center gap-2 text-red-500"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Invalid Access Key</span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Verification Overlay */}
            <AnimatePresence>
                {loading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
                    >
                        <div className="w-12 h-12 bg-[#2D5BE3] rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Validating Credentials...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                .animate-shake { animation: shake 0.52s cubic-bezier(.36,.07,.19,.97) both; }
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

export default TenantLogin;
