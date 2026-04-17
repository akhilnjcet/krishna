import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, ArrowLeft, Search, DoorOpen, 
    Star, Info, ChevronRight, Loader2, IndianRupee,
    CalendarCheck, User
} from 'lucide-react';
import useBookingStore from '../../stores/bookingStore';
import useAuthStore from '../../stores/authStore';

const LodgeBooking = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { availableRooms, checkAvailability, createBooking, loading, error } = useBookingStore();
    
    const [dates, setDates] = useState({
        checkIn: '',
        checkOut: ''
    });
    const [searching, setSearching] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!dates.checkIn || !dates.checkOut) return;
        setSearching(true);
        await checkAvailability(dates.checkIn, dates.checkOut);
        setSearching(false);
    };

    const handleBook = async () => {
        if (!selectedRoom || !user) {
            if (!user) navigate('/login');
            return;
        }

        const bookingData = {
            roomId: selectedRoom._id,
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            guestName: user.name,
            guestPhone: user.mobile,
            totalAmount: selectedRoom.price // Simple calculation for now
        };

        const res = await createBooking(bookingData);
        if (res.success) {
            alert("Booking Successful!");
            navigate('/lodge');
        } else {
            alert("Booking Failed: " + res.error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-slate-900 pt-16 pb-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,91,227,0.15),transparent)]"></div>
                <div className="relative z-10">
                    <button 
                        onClick={() => navigate('/lodge')}
                        className="p-2 bg-white/5 rounded-xl text-slate-400 mb-6 border border-white/5"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Reserve <span className="text-blue-500">Your Space.</span></h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">Krishna Premium Residency Suite</p>
                </div>
            </div>

            <div className="px-6 -mt-10 pb-20 max-w-lg mx-auto w-full">
                {/* Search Form */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 mb-8"
                >
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Check-In Date
                                </p>
                                <input 
                                    type="date" 
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={dates.checkIn}
                                    onChange={(e) => setDates({...dates, checkIn: e.target.value})}
                                    className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0 text-lg"
                                />
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <CalendarCheck className="w-3 h-3" /> Check-Out Date
                                </p>
                                <input 
                                    type="date" 
                                    required
                                    min={dates.checkIn || new Date().toISOString().split('T')[0]}
                                    value={dates.checkOut}
                                    onChange={(e) => setDates({...dates, checkOut: e.target.value})}
                                    className="w-full bg-transparent border-0 p-0 font-bold text-slate-900 focus:ring-0 text-lg"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={searching}
                            className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-4 h-4" /> Finalize Availability</>}
                        </button>
                    </form>
                </motion.div>

                {/* Available Rooms */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 mb-4">
                        {availableRooms.length} Premium Options Found
                    </h3>

                    <AnimatePresence>
                        {availableRooms.map((room, idx) => (
                            <motion.div
                                key={room._id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => {
                                    setSelectedRoom(room);
                                    setShowConfirm(true);
                                }}
                                className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group flex items-center gap-5"
                            >
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100">
                                    <DoorOpen className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xl font-black text-slate-900 italic tracking-tight">Room {room.number}</h4>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Premium</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{room.type} Suite • AC • WiFi</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-blue-600">₹{room.price}<span className="text-[10px] font-bold text-slate-400">/night</span></span>
                                        <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {availableRooms.length === 0 && !searching && (
                        <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-100">
                            <Info className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Rooms Synchronized for these dates</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && selectedRoom && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirm(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        ></motion.div>
                        <motion.div 
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-8 relative z-10 shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <CalendarCheck className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 italic tracking-tight">Confirm Reservation</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Room {selectedRoom.number} Suite</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between">
                                    <div className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</div>
                                    <div className="text-right text-sm font-black text-slate-900 uppercase">
                                        {new Date(dates.checkIn).toLocaleDateString()} - {new Date(dates.checkOut).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between">
                                    <div className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Guest Account</div>
                                    <div className="text-right text-sm font-black text-slate-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-500" /> {user?.name}
                                    </div>
                                </div>
                                <div className="p-5 bg-blue-600 rounded-2xl flex items-center justify-between text-white">
                                    <div className="text-left text-xs font-bold uppercase tracking-widest opacity-80">Total Due</div>
                                    <div className="text-right text-2xl font-black flex items-center gap-1 tracking-tighter">
                                        <IndianRupee className="w-5 h-5" /> {selectedRoom.price}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8 px-2 flex items-start gap-4 cursor-pointer group" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                                    {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                    I agree to the <span className="text-blue-600 underline" onClick={(e) => { e.stopPropagation(); navigate('/lodge/privacy-policy'); }}>Privacy Policy and Rental Terms</span> including liability for property damage.
                                </p>
                            </div>

                            <button 
                                onClick={handleBook}
                                disabled={loading || !agreedToTerms}
                                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mb-4 ${
                                    (loading || !agreedToTerms) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white'
                                }`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><DoorOpen className="w-4 h-4" /> Secure Booking</>}
                            </button>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-center px-4 leading-tight italic">
                                * Payments can be finalized at the property or via the secure link in your dashboard.
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LodgeBooking;
