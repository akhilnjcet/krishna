import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, ArrowLeft, Search, DoorOpen, 
    Star, Info, ChevronRight, Loader2, IndianRupee,
    CalendarCheck, User, CheckCircle2, QrCode, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'qr'
    const [bookingConfirmed, setBookingConfirmed] = useState(null);

    const generateTicket = (booking) => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("KRISHNA LODGE - RESERVATION TICKET", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Booking ID: ${booking._id || 'REG-PENDING'}`, 105, 28, { align: "center" });

        const data = [
            ["Guest Name", user?.name || booking.guestName],
            ["Guest Phone", user?.mobile || booking.guestPhone],
            ["Room Number", selectedRoom?.number || "N/A"],
            ["Duration", `${booking.nights || 1} Night(s)`],
            ["Check-In", dates.checkIn],
            ["Check-Out", dates.checkOut],
            ["Payment Method", paymentMethod.toUpperCase()],
            ["Total Amount", `INR ${booking.finalPrice || selectedRoom.price}`],
            ["Status", "CONFIRMED"]
        ];

        autoTable(doc, {
            startY: 40,
            head: [["Reservation Parameter", "Metric"]],
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.setFontSize(8);
        doc.text("Present this digital ticket at the front desk for verification.", 105, doc.lastAutoTable.finalY + 10, { align: "center" });
        doc.save(`KRISHNA_ROOM_${selectedRoom?.number}_TICKET.pdf`);
    };

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

        if (!user.mobile && !user.phone) {
            const phone = prompt("Guest Mobile Number is Required for Cloud Backup:");
            if (!phone) return alert("Booking aborted: Phone number required.");
            user.mobile = phone; // Temporary set for this booking session
        }

        // Calculate Nights
        const start = new Date(dates.checkIn);
        const end = new Date(dates.checkOut);
        const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const finalPrice = selectedRoom.price * nights;

        const bookingData = {
            roomId: selectedRoom._id,
            checkIn: dates.checkIn,
            checkOut: dates.checkOut,
            guestName: user.name,
            guestPhone: user.mobile,
            totalAmount: finalPrice,
            paymentMethod
        };

        const res = await createBooking(bookingData);
        if (res._id || res.id) {
            setBookingConfirmed({...res, nights, finalPrice});
        } else if (res.success) {
            setBookingConfirmed({...(res.data || res), nights, finalPrice});
        } else {
            alert("Booking Failed: " + (res.error || "System Error"));
        }
    };

    if (bookingConfirmed) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8"
                >
                    <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Booking Secured</h1>
                <p className="text-slate-500 font-medium mb-12">Room {selectedRoom?.number} is reserved for your dates. All systems operational.</p>
                
                <div className="space-y-4 w-full max-w-xs">
                    <button 
                        onClick={() => generateTicket(bookingConfirmed)}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl"
                    >
                        <Download className="w-4 h-4" /> Download Room Ticket
                    </button>
                    <button 
                        onClick={() => navigate('/lodge')}
                        className="w-full py-5 bg-blue-50 text-blue-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-slate-900 pt-10 pb-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,91,227,0.15),transparent)]"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <button 
                            onClick={() => navigate('/lodge')}
                            className="p-2 bg-white/5 rounded-xl text-slate-400 mb-4 border border-white/5"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Find <span className="text-blue-500">Rooms.</span></h1>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-8 pb-20 max-w-lg mx-auto w-full">
                {/* Visual Progress Stepper */}
                <div className="flex items-center justify-between px-4 mb-8">
                    {[
                        { step: 1, label: 'Search', active: !searching && !selectedRoom },
                        { step: 2, label: 'Choose', active: !searching && selectedRoom && !bookingConfirmed },
                        { step: 3, label: 'Secure', active: bookingConfirmed }
                    ].map((s, i) => (
                        <React.Fragment key={i}>
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${s.active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-110' : 'bg-slate-200 text-slate-400'}`}>
                                    {s.step}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${s.active ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
                            </div>
                            {i < 2 && <div className="h-0.5 flex-grow bg-slate-100 mx-3 -mt-4"></div>}
                        </React.Fragment>
                    ))}
                </div>

                {/* Search Form */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 mb-8"
                >
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 text-left">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group focus-within:border-blue-500 transition-all">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Calendar className="w-3 h-3" /> Arrival Entry
                                </p>
                                <input 
                                    type="date" 
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={dates.checkIn}
                                    onChange={(e) => setDates({...dates, checkIn: e.target.value})}
                                    className="w-full bg-transparent border-0 p-0 font-black text-slate-800 focus:ring-0 text-lg uppercase"
                                />
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group focus-within:border-blue-500 transition-all">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <CalendarCheck className="w-3 h-3" /> Departure Flow
                                </p>
                                <input 
                                    type="date" 
                                    required
                                    min={dates.checkIn || new Date().toISOString().split('T')[0]}
                                    value={dates.checkOut}
                                    onChange={(e) => setDates({...dates, checkOut: e.target.value})}
                                    className="w-full bg-transparent border-0 p-0 font-black text-slate-800 focus:ring-0 text-lg uppercase"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={searching}
                            className="group w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-4 h-4" /> Initialize Availability</>}
                        </button>
                    </form>
                </motion.div>

                {/* Available Rooms */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                             Premium Inventory Discovery
                        </h3>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg uppercase">{availableRooms.length} Ready</span>
                    </div>

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
                                className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <DoorOpen className="w-24 h-24" />
                                </div>
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                                        <h4 className="text-2xl font-black italic">{room.number}</h4>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase tracking-widest">Sanitized</span>
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded uppercase tracking-widest">A/C Suite</span>
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 italic tracking-tight mb-3">Premium Residency</h4>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                 <span className="text-lg font-black text-blue-600 leading-none">₹{room.price}</span>
                                                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Per Night Settlement</span>
                                            </div>
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {availableRooms.length === 0 && !searching && (
                        <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-100">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Info className="w-8 h-8" />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed italic">
                                Inventory Depleted<br/>Try Synchronizing New Dates
                            </p>
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
                                 
                                 {/* Payment Method Selector */}
                                 <div className="p-2 bg-slate-50 rounded-2xl">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3">Select Payment Strategy</p>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button 
                                             onClick={() => setPaymentMethod('cash')}
                                             className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${paymentMethod === 'cash' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                                         >
                                             Cash at Desk
                                         </button>
                                         <button 
                                             onClick={() => setPaymentMethod('qr')}
                                             className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${paymentMethod === 'qr' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                                         >
                                             Scan & Pay (QR)
                                         </button>
                                     </div>
                                 </div>

                                 {paymentMethod === 'qr' && (
                                     <div className="p-6 bg-slate-900 rounded-[2rem] text-center border-4 border-blue-500/20">
                                         <div className="w-40 h-40 bg-white p-3 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                             <QrCode className="w-full h-full text-slate-900" />
                                         </div>
                                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">UPI ID: krishnaengineering@upi</p>
                                         <p className="text-[8px] font-medium text-slate-500 mt-1">Scan to settle ₹{selectedRoom.price}</p>
                                     </div>
                                 )}

                                 <div className="p-5 bg-blue-600 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-blue-500/20">
                                     <div className="text-left text-xs font-bold uppercase tracking-widest opacity-80">Final Total</div>
                                     <div className="text-right text-2xl font-black flex items-center gap-1 tracking-tighter">
                                         <IndianRupee className="w-5 h-5" /> {selectedRoom.price}
                                     </div>
                                 </div>
                            </div>

                            <div className="mb-6 px-2 flex items-start gap-3 cursor-pointer group" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                                    {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                    I agree to the <span className="text-blue-600 underline">Privacy Policy</span> and confirm check-in within standard hours.
                                </p>
                            </div>

                            <button 
                                onClick={handleBook}
                                disabled={loading || !agreedToTerms}
                                className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                                    (loading || !agreedToTerms) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white'
                                }`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><DoorOpen className="w-4 h-4" /> Finalize My Stay</>}
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
