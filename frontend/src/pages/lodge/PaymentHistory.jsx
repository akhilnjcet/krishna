import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, History, IndianRupee, Calendar, 
    CreditCard, Zap, Droplets, ArrowUpRight 
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const PaymentHistory = () => {
    const { roomNumber } = useParams();
    const navigate = useNavigate();
    const getPaymentsByRoom = useLodgeStore(state => state.getPaymentsByRoom);
    const payments = getPaymentsByRoom(roomNumber);

    const typeIcons = {
        rent: { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50' },
        electricity: { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
        water: { icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-50' },
        advance: { icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50' }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className="bg-[#2D5BE3] pt-12 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white font-poppins">Transaction History</h1>
                </div>
            </div>

            <div className="px-6 -mt-10 pb-12 max-w-lg mx-auto">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-slate-100 min-h-[400px]">
                    <div className="flex items-center gap-3 mb-8">
                        <History className="w-5 h-5 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Archive for Room {roomNumber}</p>
                    </div>

                    <div className="space-y-6">
                        {payments.map((pay, i) => {
                            const typeInfo = typeIcons[pay.type] || typeIcons.rent;
                            return (
                                <motion.div 
                                    key={pay.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 ${typeInfo.bg} ${typeInfo.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                            <typeInfo.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 capitalize">{pay.type} Settlement</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(pay.timestamp).toLocaleDateString()} • {pay.method}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-800">₹{pay.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Verified</p>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {payments.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <History className="w-12 h-12 text-slate-300 mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">No transactions recorded <br/> on this terminal</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Settled</p>
                        <IndianRupee className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-3xl font-black font-poppins text-white">
                        ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistory;
