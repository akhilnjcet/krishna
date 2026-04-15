import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, DoorOpen, Lightbulb, AlertTriangle, 
    LogOut, UserPlus, Trash2, CheckCircle2, Phone, 
    ArrowUpRight, IndianRupee, Clock, Plus, X, List, History
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const LodgeAdminDashboard = () => {
    const navigate = useNavigate();
    const { 
        rooms, payments, complaints, 
        isAdminLoggedIn, logoutAdmin,
        getOccupiedCount, getUnresolvedComplaints,
        getTotalIncome, getPendingDues,
        assignTenant, checkOutRoom, setBill, 
        markBillPaid, resolveComplaint, updateRoom
    } = useLodgeStore();

    const [activeTab, setActiveTab] = useState('overview');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Redirect if not logged in
    React.useEffect(() => {
        if (!isAdminLoggedIn) navigate('/lodge/admin-login');
    }, [isAdminLoggedIn, navigate]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'rooms', label: 'Rooms', icon: DoorOpen },
        { id: 'bills', label: 'Bills', icon: Lightbulb },
        { id: 'complaints', label: 'Issues', icon: AlertTriangle }
    ];

    const stats = [
        { label: 'Total Rooms', value: rooms.length, color: 'blue' },
        { label: 'Occupied', value: getOccupiedCount(), color: 'emerald' },
        { label: 'Pending Dues', value: `₹${getPendingDues()}`, color: 'amber' },
        { label: 'Open Issues', value: getUnresolvedComplaints().length, color: 'rose' }
    ];

    if (!isAdminLoggedIn) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Admin Header */}
            <div className="bg-[#111827] pt-12 pb-24 px-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-black font-poppins">Admin Terminal</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Krishna ERP Command</p>
                    </div>
                    <button 
                        onClick={() => { logoutAdmin(); navigate('/lodge'); }}
                        className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-slate-400"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                                activeTab === tab.id 
                                ? 'bg-[#2D5BE3] text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-6 -mt-12 pb-12 max-w-lg mx-auto min-h-[60vh]">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div 
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                {stats.map((stat, i) => (
                                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <p className={`text-2xl font-black text-slate-800`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Monthly Income Report */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center justify-between">
                                    Monthly Income Report
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">₹{getTotalIncome()} Total</span>
                                </h3>
                                
                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    {['rent', 'electricity', 'water'].map(type => {
                                        const typeTotal = payments.filter(p => p.type === type).reduce((s, p) => s + p.amount, 0);
                                        return (
                                            <div key={type} className="p-3 bg-slate-50 rounded-2xl text-center">
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{type}</p>
                                                <p className="text-xs font-black text-slate-800 tracking-tighter">₹{typeTotal.toLocaleString()}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <h3 className="text-sm font-bold text-slate-800 mb-6">Recent Activity</h3>
                                <div className="space-y-4">
                                    {payments.slice(0, 5).map((pay, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                                    <IndianRupee className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">Room {pay.roomNumber} - {pay.type}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{pay.method}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-slate-800">+₹{pay.amount}</p>
                                        </div>
                                    ))}
                                    {payments.length === 0 && (
                                        <p className="text-center py-8 text-xs font-bold text-slate-300 uppercase tracking-widest italic">No transactions yet</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'rooms' && (
                        <motion.div 
                            key="rooms"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {rooms.map((room) => (
                                <div key={room.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                                                {room.number}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{room.tenant || 'Unassigned'}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Rent: ₹{room.rent}</p>
                                                    {room.pin && (
                                                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-tight border-l border-slate-200 pl-2">PIN: {room.pin}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                            room.status === 'occupied' ? 'bg-emerald-50 text-emerald-600' : 
                                            room.status === 'maintenance' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {room.status}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {room.status === 'occupied' ? (
                                            <button 
                                                onClick={() => { if(confirm('Check-out tenant?')) checkOutRoom(room.id); }}
                                                className="flex-grow flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" /> Check-out
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => { setSelectedRoom(room); setIsAssignModalOpen(true); }}
                                                className="flex-grow flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors"
                                            >
                                                <UserPlus className="w-4 h-4" /> Assign Tenant
                                            </button>
                                        )}
                                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100" title="History">
                                            <History className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => updateRoom(room.id, { status: room.status === 'maintenance' ? 'available' : 'maintenance' })}
                                            className={`p-3 rounded-xl transition-all ${room.status === 'maintenance' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                                        >
                                            <Clock className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'bills' && (
                        <motion.div 
                            key="bills"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {rooms.filter(r => r.status === 'occupied').map((room) => (
                                <div key={room.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs">
                                            {room.number}
                                        </div>
                                        <p className="font-bold text-slate-800">{room.tenant}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Electricity */}
                                        <div className="flex items-center justify-between p-4 bg-yellow-50/30 rounded-2xl border border-yellow-100/50">
                                            <div className="flex items-center gap-3">
                                                <Lightbulb className="w-5 h-5 text-yellow-600" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Electricity</p>
                                                    <p className="text-sm font-black text-slate-800">₹{room.electricityBill}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const amt = prompt('Enter Electricity Bill Amount:');
                                                        if(amt) setBill(room.id, 'electricity', parseFloat(amt));
                                                    }}
                                                    className="p-3 bg-white text-slate-400 rounded-xl border border-yellow-100"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                {room.electricityBill > 0 && room.electricityStatus === 'pending' && (
                                                    <button 
                                                        onClick={() => markBillPaid(room.id, 'electricity')}
                                                        className="px-4 py-2 bg-yellow-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-yellow-200"
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                                {room.electricityStatus === 'paid' && (
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-2" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Water */}
                                        <div className="flex items-center justify-between p-4 bg-cyan-50/30 rounded-2xl border border-cyan-100/50">
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-5 h-5 text-cyan-600" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Water Bill</p>
                                                    <p className="text-sm font-black text-slate-800">₹{room.waterBill}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const amt = prompt('Enter Water Bill Amount:');
                                                        if(amt) setBill(room.id, 'water', parseFloat(amt));
                                                    }}
                                                    className="p-3 bg-white text-slate-400 rounded-xl border border-cyan-100"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                {room.waterBill > 0 && room.waterStatus === 'pending' && (
                                                    <button 
                                                        onClick={() => markBillPaid(room.id, 'water')}
                                                        className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-cyan-200"
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                                {room.waterStatus === 'paid' && (
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {rooms.filter(r => r.status === 'occupied').length === 0 && (
                                <div className="text-center py-20 text-slate-300 font-bold uppercase tracking-[0.2em] italic">No occupied rooms</div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'complaints' && (
                        <motion.div 
                            key="complaints"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {complaints.map((comp) => (
                                <div key={comp.id} className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm ${comp.resolved ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${comp.resolved ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-600'}`}>
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">Room {comp.roomNumber} - {comp.issueType}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(comp.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {!comp.resolved && (
                                            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase">Pending</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 bg-slate-50 p-4 rounded-2xl">{comp.description || 'No additional details provided.'}</p>
                                    
                                    {!comp.resolved && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => resolveComplaint(comp.id)}
                                                className="flex-grow py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors"
                                            >
                                                Resolve Issue
                                            </button>
                                            <button 
                                                onClick={() => window.open(`tel:9876543210`)}
                                                className="p-3 bg-blue-50 text-blue-600 rounded-xl"
                                            >
                                                <Phone className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {complaints.length === 0 && (
                                <div className="text-center py-20 text-slate-300 font-bold uppercase tracking-[0.2em] italic">No issues recorded</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Assign Tenant Modal */}
            <AnimatePresence>
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAssignModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-slate-800 font-poppins">Assign Room {selectedRoom?.number}</h3>
                                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                            </div>
                            
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const data = new FormData(e.target);
                                const newPin = assignTenant(selectedRoom.id, data.get('name'), parseFloat(data.get('rent')), data.get('date'), parseFloat(data.get('advance')));
                                setIsAssignModalOpen(false);
                                alert(`Tenancy Initialized.\n\nROOM: ${selectedRoom.number}\nTENANT: ${data.get('name')}\nACCESS PIN: ${newPin}\n\nPlease share this PIN with the tenant.`);
                            }} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tenant Name</p>
                                        <input name="name" required placeholder="John Doe" className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Rent</p>
                                            <input name="rent" type="number" required defaultValue="5000" className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0" />
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Advance</p>
                                            <input name="advance" type="number" defaultValue="0" className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                                        <input name="date" type="date" required className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-5 bg-[#2D5BE3] text-white rounded-2xl font-bold shadow-xl shadow-blue-200">Initialize Tenancy</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LodgeAdminDashboard;
