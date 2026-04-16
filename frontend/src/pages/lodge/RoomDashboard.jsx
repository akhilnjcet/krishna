import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, User, DollarSign, Calendar, Zap, Droplets, 
    AlertCircle, CreditCard, History, ChevronRight, Activity
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const RoomDashboard = () => {
    const { roomNumber } = useParams();
    const navigate = useNavigate();
    const { getRoomByNumber, authenticatedTenantRoom, logoutTenant } = useLodgeStore();
    const room = getRoomByNumber(roomNumber);
    
    // Auth Guard
    React.useEffect(() => {
        if (!authenticatedTenantRoom || String(authenticatedTenantRoom) !== String(roomNumber)) {
            navigate('/lodge/tenant-login');
        }
    }, [authenticatedTenantRoom, roomNumber, navigate]);
    
    if (!room) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
                <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-center">Room Not Found</p>
                <button 
                    onClick={() => navigate('/lodge/rooms')}
                    className="mt-6 px-8 py-3 bg-[#2D5BE3] text-white rounded-2xl font-bold shadow-lg shadow-blue-200"
                >
                    Back to Rooms
                </button>
            </div>
        );
    }

    const stats = [
        { label: 'Monthly Rent', value: `₹${room.rent}`, icon: DollarSign, color: 'blue' },
        { label: 'Due Date', value: room.dueDate ? new Date(room.dueDate).toLocaleDateString() : 'Not Set', icon: Calendar, color: 'amber' },
        { label: 'Electricity', value: `₹${room.electricityBill}`, icon: Zap, color: 'yellow' },
        { label: 'Water', value: `₹${room.waterBill}`, icon: Droplets, color: 'cyan' }
    ];

    const actions = [
        { label: 'Pay Rent', icon: CreditCard, path: `/lodge/payment/${roomNumber}/rent`, color: 'bg-blue-600' },
        { label: 'Electricity Bill', icon: Zap, path: `/lodge/payment/${roomNumber}/electricity`, color: 'bg-yellow-500' },
        { label: 'Water Bill', icon: Droplets, path: `/lodge/payment/${roomNumber}/water`, color: 'bg-cyan-500' },
        { label: 'Report Complaint', icon: AlertCircle, path: `/lodge/complaint/${roomNumber}`, color: 'bg-red-500' }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col overflow-y-auto">
            {/* Compact Header */}
            <div className="bg-[#2D5BE3] pt-4 pb-14 px-5 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <button 
                            onClick={() => navigate('/lodge')}
                            className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white backdrop-blur-md"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => { logoutTenant(); navigate('/lodge/tenant-login'); }}
                            className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20"
                        >
                            Log Out
                        </button>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-white font-poppins leading-none">Room {room.number}</h1>
                            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mt-1">{room.tenant || 'Available'}</p>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/10">
                             <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">Live Status</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 -mt-14 pb-48 space-y-6 max-w-lg mx-auto w-full">
                {/* Status Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tenant Name</p>
                                <p className="text-lg font-bold text-slate-800">{room.tenant || 'Unassigned'}</p>
                            </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            room.status === 'occupied' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            {room.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {stats.map((stat, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <stat.icon className={`w-5 h-5 text-${stat.color}-500 mb-2`} />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-sm font-black text-slate-800">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {actions.map((action, i) => (
                        <motion.button
                            key={i}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-50 group hover:border-[#2D5BE3]/30 transition-all"
                        >
                            <div className={`w-12 h-12 ${action.color} text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-${action.color}/20 group-hover:scale-110 transition-transform`}>
                                <action.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-600 group-hover:text-[#2D5BE3]">{action.label}</span>
                        </motion.button>
                    ))}
                </div>

                {/* History Link */}
                <button 
                    onClick={() => navigate(`/lodge/history/${roomNumber}`)}
                    className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">Payment History</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>
            </div>
        </div>
    );
};

export default RoomDashboard;
