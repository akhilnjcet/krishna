import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Calendar, Heart, User, CreditCard, 
    LogOut, Star, MessageSquare, MapPin, Download, 
    Trash2, Search, ArrowRight, Shield, CheckCircle, 
    Clock, AlertCircle, RefreshCcw, Camera, Map, Plus, X
} from 'lucide-react';
import api from '../../services/api';

export default function LodgeCustomerDashboard() {
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [payments, setPayments] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [myComplaints, setMyComplaints] = useState([]);
    const [profile, setProfile] = useState({ name: '', email: '', phone: '', password: '' });
    const [loading, setLoading] = useState(true);

    // Modals
    const [reviewModal, setReviewModal] = useState({ show: false, bookingId: null, lodgeId: null, rating: 5, comment: '' });
    const [extendModal, setExtendModal] = useState({ show: false, booking: null, newDate: '', extraAmount: 0 });
    const [complaintModal, setComplaintModal] = useState({ show: false, bookingId: '', title: '', description: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookRes, wishRes, payRes, userRes, reviewRes, compRes] = await Promise.all([
                api.get('/bookings/my-bookings'),
                api.get('/lodge-extras/wishlist').catch(() => ({ data: [] })),
                api.get('/payments/my-payments').catch(() => ({ data: [] })),
                api.get('/auth/me'),
                api.get('/lodge-extras/reviews/my-reviews').catch(() => ({ data: [] })),
                api.get('/complaints/my-complaints').catch(() => ({ data: [] }))
            ]);
            setBookings(bookRes.data);
            setWishlist(wishRes.data || []);
            setPayments(payRes.data || []);
            setMyReviews(reviewRes.data || []);
            setMyComplaints(compRes.data || []);
            setProfile({ ...userRes.data, password: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (confirm('Are you sure you want to cancel this booking?')) {
            try {
                await api.put(`/bookings/${id}/cancel`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || 'Cancellation failed');
            }
        }
    };

    const handleToggleWishlist = async (lodgeId) => {
        try {
            await api.post('/lodge-extras/wishlist', { lodgeId });
            const wishRes = await api.get('/lodge-extras/wishlist');
            setWishlist(wishRes.data);
        } catch (err) { console.error(err); }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        try {
            await api.post('/lodge-extras/reviews', {
                lodgeId: reviewModal.lodgeId,
                bookingId: reviewModal.bookingId,
                rating: reviewModal.rating,
                comment: reviewModal.comment
            });
            alert('Thank you for your feedback!');
            setReviewModal({ show: false, bookingId: null, lodgeId: null, rating: 5, comment: '' });
        } catch (err) { alert('Failed to submit review'); }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put('/auth/profile', profile);
            alert('Krisha Buildings: Profile updated successfully.');
            fetchData(); // Refresh local state to ensure consistency
        } catch (err) { 
            const errorMsg = err.response?.data?.message || 'Update failed';
            alert(`Krisha Buildings: System Error - ${errorMsg}`); 
        }
    };

    const calculateExtensionAmount = (b, newDateStr) => {
        if (!b || !newDateStr) return 0;
        const start = new Date(b.checkOut);
        const end = new Date(newDateStr);
        if (end <= start) return 0;
        
        const msDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(msDiff / (1000 * 3600 * 24));
        
        // Very basic calculation logic (assumes price is per rent cycle)
        const price = b.roomId?.price || 0;
        const cycle = b.roomId?.rentCycle || 'daily';
        
        console.log('Calculating extension:', { price, cycle, daysDiff });

        let extraAmount = 0;
        if (cycle === 'daily') extraAmount = price * daysDiff;
        else if (cycle === 'weekly') extraAmount = (price / 7) * daysDiff;
        else if (cycle === 'monthly') extraAmount = (price / 30) * daysDiff;
        
        return Math.round(extraAmount);
    };

    const submitExtension = async (e) => {
        e.preventDefault();
        if (extendModal.extraAmount <= 0) return alert('Invalid date selected.');
        try {
            await api.post(`/bookings/${extendModal.booking._id}/extend`, {
                requestedCheckOut: extendModal.newDate,
                additionalAmount: extendModal.extraAmount
            });
            alert('Extension request sent to Admin!');
            setExtendModal({ show: false, booking: null, newDate: '', extraAmount: 0 });
            fetchData();
        } catch (err) { alert('Failed to send request'); }
    };

    const submitComplaint = async (e) => {
        e.preventDefault();
        try {
            const booking = bookings.find(b => b._id === complaintModal.bookingId);
            if (!booking) return alert('Select a valid booking');
            await api.post('/complaints', {
                lodgeId: booking.lodgeId._id,
                roomId: booking.roomId._id,
                bookingId: booking._id,
                title: complaintModal.title,
                description: complaintModal.description
            });
            alert('Ticket Raised successfully');
            setComplaintModal({ show: false, bookingId: '', title: '', description: '' });
            fetchData();
        } catch (err) { alert('Failed to raise ticket'); }
    };

    const downloadInvoice = (bookingId) => {
        alert(`Generating PDF Invoice for #${bookingId.slice(-6).toUpperCase()}...`);
        // Simulated download
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Accessing Portal...</p>
            </div>
        </div>
    );

    const TABS = [
        { id: 'bookings', label: 'My Bookings', icon: LayoutDashboard },
        { id: 'wishlist', label: 'Wishlist', icon: Heart },
        { id: 'payments', label: 'Payment History', icon: CreditCard },
        { id: 'reviews', label: 'My Reviews', icon: Star },
        { id: 'maintenance', label: 'Maintenance Support', icon: AlertCircle },
        { id: 'profile', label: 'Profile Management', icon: User },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-8 flex flex-col shadow-sm">
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-indigo-600 tracking-tight flex items-center">
                        <Shield className="w-8 h-8 mr-2" /> KRISHNA PORTAL
                    </h2>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] mt-1 ml-10">Client Dashboard</p>
                </div>

                <div className="space-y-2 flex-grow">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 -translate-y-0.5' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-auto pt-8 border-t border-slate-100">
                    <button onClick={() => window.location.href = '/lodge'} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow p-6 md:p-12 overflow-y-auto max-h-screen">
                
                {/* Bookings View */}
                {activeTab === 'bookings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-10 flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Stay Management</h1>
                                <p className="text-slate-500 font-medium mt-2">Oversee your active and historical residency records.</p>
                            </div>
                            <button onClick={() => window.location.href = '/lodge'} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center transition-all">
                                <Plus className="w-5 h-5 mr-2" /> Book New Residence
                            </button>
                        </div>

                        <div className="grid gap-6">
                            {bookings.map(b => (
                                <div key={b._id} className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16"></div>
                                    
                                    <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                                                    b.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    b.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                    {b.status === 'active' ? 'Live Residency' : b.status}
                                                </span>
                                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">ID: #{b._id.slice(-6).toUpperCase()}</span>
                                            </div>

                                            <h3 className="text-2xl font-black text-slate-900 mb-2 truncate max-w-md">{b.lodgeId?.name || 'Krishna Building'} Suite</h3>
                                            <div className="flex items-center text-slate-500 font-medium text-sm mb-6">
                                                <MapPin className="w-4 h-4 mr-1 text-slate-400" /> {b.lodgeId?.location?.address || 'Site A, Krishna Complex'}
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Check In</p>
                                                    <p className="text-sm font-black text-slate-800">{new Date(b.checkIn).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Check Out</p>
                                                    <p className="text-sm font-black text-slate-800">{new Date(b.checkOut).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Room Class</p>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-wide">{b.roomId?.type || 'Suite'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 font-poppins">Total Paid</p>
                                                    <p className="text-sm font-black text-indigo-600 font-poppins">₹{b.totalAmount}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center gap-3 lg:w-56 shrink-0">
                                            {b.status === 'active' ? (
                                                <>
                                                    {b.extensionRequest?.status === 'pending' ? (
                                                        <div className="w-full bg-amber-50 text-amber-600 py-3.5 rounded-2xl font-black text-sm border border-amber-100 flex items-center justify-center">
                                                            <Clock className="w-4 h-4 mr-2" /> Extension Pending
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setExtendModal({ show: true, booking: b, newDate: '', extraAmount: 0 })} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center hover:-translate-y-0.5 transition-all">
                                                            <RefreshCcw className="w-4 h-4 mr-2" /> Request Extension
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleCancel(b._id)} className="w-full bg-red-50 text-red-600 py-3.5 rounded-2xl font-black text-sm border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Cancel Request
                                                    </button>
                                                </>
                                            ) : b.status === 'completed' && (
                                                <button 
                                                    onClick={() => setReviewModal({ show: true, bookingId: b._id, lodgeId: b.lodgeId?._id, rating: 5, comment: '' })}
                                                    className="w-full bg-indigo-100 text-indigo-700 py-3.5 rounded-2xl font-black text-sm hover:bg-indigo-200 transition-all flex items-center justify-center"
                                                >
                                                    <Star className="w-4 h-4 mr-2" /> Review Experience
                                                </button>
                                            )}
                                            <button onClick={() => downloadInvoice(b._id)} className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center border border-slate-200">
                                                <Download className="w-4 h-4 mr-2" /> Get Invoice
                                            </button>
                                            <button onClick={() => { if(b.lodgeId?._id) window.location.href=`/lodge/details/${b.lodgeId._id}`; }} className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-all mt-2">
                                                View Location Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {bookings.length === 0 && (
                                <div className="text-center py-40 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                        <Calendar className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">No Residency History</h3>
                                    <p className="text-slate-400 max-w-xs mx-auto font-medium">Your historical records are empty. Book your first site visit residency today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Wishlist View */}
                {activeTab === 'wishlist' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-10">Saved Residencies</h1>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {wishlist.map(w => (
                                <div key={w._id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group">
                                    <div className="h-64 relative bg-slate-200 overflow-hidden">
                                        <img src={w.lodgeId?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'} alt={w.lodgeId?.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <button onClick={() => handleToggleWishlist(w.lodgeId?._id)} className="absolute top-6 right-6 p-4 bg-white/90 text-red-500 rounded-2xl shadow-xl backdrop-blur-md">
                                            <Heart className="w-6 h-6 fill-current" />
                                        </button>
                                    </div>
                                    <div className="p-8">
                                        <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{w.lodgeId?.name || 'Krishna Residency'}</h3>
                                        <p className="text-slate-500 font-medium mb-8 flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400" /> {w.lodgeId?.location?.address}</p>
                                        <div className="flex items-center justify-between">
                                            <p className="font-poppins text-2xl font-black text-indigo-600">₹{w.lodgeId?.priceRange || '3,500'}<span className="text-xs text-slate-400 font-bold uppercase ml-1">/ Night avg</span></p>
                                            <button onClick={() => window.location.href = `/lodge/book/${w.lodgeId?._id}`} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform active:scale-95">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {wishlist.length === 0 && (
                                <div className="col-span-2 text-center py-40">
                                    <Heart className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Wishlist is Empty</h3>
                                    <p className="text-slate-400">Save residency suites to access them quickly later.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Payments View */}
                {activeTab === 'payments' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Financial Ledger</h1>
                        <p className="text-slate-500 font-medium mb-10">Cross-verified transaction logs for all residency settlements.</p>

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference ID</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date / Time</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Channel</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-poppins">
                                        {payments.map(p => (
                                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6 font-black text-slate-900">#{p._id.slice(-8).toUpperCase()}</td>
                                                <td className="px-8 py-6 text-slate-500 font-medium">{new Date(p.createdAt).toLocaleString()}</td>
                                                <td className="px-8 py-6">
                                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{p.method}</span>
                                                </td>
                                                <td className="px-8 py-6 font-black text-indigo-600">₹{p.amount.toLocaleString()}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${
                                                        p.status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 
                                                        p.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {p.status === 'verified' && <CheckCircle className="w-3 h-3" />}
                                                        {p.status === 'pending' && <Clock className="w-3 h-3" />}
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {payments.length === 0 && (
                                <div className="text-center py-24 text-slate-400 font-bold uppercase text-xs tracking-widest opacity-40 italic">
                                    No transaction telemetry found.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile View */}
                {activeTab === 'profile' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center max-w-2xl mx-auto">
                        <div className="w-full text-center mb-12">
                            <div className="w-32 h-32 bg-indigo-600 text-white rounded-[3rem] items-center justify-center flex text-5xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-600/30 font-poppins relative group cursor-pointer">
                                {profile.name?.charAt(0) || 'U'}
                                <div className="absolute inset-0 bg-black/40 rounded-[3rem] items-center justify-center flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{profile.name}</h1>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">{profile.role || 'Residency Client'}</p>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="w-full space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Display Name</label>
                                    <input required className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                                </div>
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2 flex items-center gap-2">
                                        Primary Contact (Email Alerts)
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    </label>
                                    <input required className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-indigo-200" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
                                    <p className="text-[9px] font-bold text-slate-400 italic ml-2">Used for official booking receipts & verification.</p>
                                </div>
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2 flex items-center gap-2">
                                        Phone Telemetry (WhatsApp Link)
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </label>
                                    <input className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-emerald-200" value={profile.phone || profile.phoneNumber || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
                                    <p className="text-[9px] font-bold text-slate-400 italic ml-2">Enables real-time WhatsApp status updates.</p>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-600/30 hover:scale-105 hover:bg-indigo-700 transition-all flex items-center justify-center">
                                Commit Identity Changes
                            </button>
                        </form>
                    </div>
                )}

                {/* Reviews View */}
                {activeTab === 'reviews' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Reviews</h1>
                        <p className="text-slate-500 font-medium mb-10">Feedback you've provided for your past residencies.</p>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            {myReviews.map(r => (
                                <div key={r._id} className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-black text-xl text-slate-900">{r.lodgeId?.name || 'Krishna Building'}</h3>
                                        <div className="flex gap-0.5">
                                            {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${r.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                                        </div>
                                    </div>
                                    <p className="text-slate-600 font-medium italic">"{r.comment}"</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-6">{new Date(r.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {myReviews.length === 0 && (
                                <div className="col-span-2 text-center py-20 bg-slate-50 border border-slate-100 rounded-[2rem]">
                                    <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Reviews Yet</h3>
                                    <p className="text-slate-500">You haven't left any feedback for your completed stays.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Maintenance View */}
                {activeTab === 'maintenance' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Maintenance Support</h1>
                                <p className="text-slate-500 font-medium">Log requests for your active residency.</p>
                            </div>
                            <button onClick={() => setComplaintModal({ show: true, bookingId: '', title: '', description: '' })} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2" /> Raise Ticket
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {myComplaints.map(c => (
                                <div key={c._id} className={`p-6 rounded-[2rem] border ${c.status === 'resolved' ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-black text-lg text-slate-900">{c.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-200 text-amber-800'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 font-medium mb-4">{c.description}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {myComplaints.length === 0 && (
                                <div className="text-center py-20 bg-slate-50 border border-slate-100 rounded-[2rem]">
                                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Open Tickets</h3>
                                    <p className="text-slate-500">Your maintenance history is clear.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModal.show && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={submitReview} className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl relative animate-in zoom-in duration-300">
                        <button type="button" onClick={() => setReviewModal({ show: false, bookingId: null, lodgeId: null, rating: 5, comment: '' })} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Review Residency Stay</h3>
                            <p className="text-slate-500 font-medium mt-2 italic">How was your environment in Krishna Building?</p>
                        </div>

                        <div className="flex justify-center gap-2 mb-10">
                            {[1,2,3,4,5].map(star => (
                                <button key={star} type="button" onClick={() => setReviewModal({...reviewModal, rating: star})} className="p-2 transition-all hover:scale-110">
                                    <Star className={`w-12 h-12 ${reviewModal.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                </button>
                            ))}
                        </div>

                        <textarea required placeholder="Describe your stay experience..." rows="5" className="w-full bg-slate-50 border border-slate-200 p-6 rounded-3xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 mb-8 transition-all" value={reviewModal.comment} onChange={e => setReviewModal({...reviewModal, comment: e.target.value})} />
                        
                        <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all">
                            Submit Engineering Review
                        </button>
                    </form>
                </div>
            )}

            {/* Extension Modal */}
            {extendModal.show && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={submitExtension} className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-300">
                        <button type="button" onClick={() => setExtendModal({ show: false, booking: null, newDate: '', extraAmount: 0 })} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Extend Residency</h3>
                            <p className="text-slate-500 font-medium mt-2">Request more time for your stay.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Check Out</p>
                            <p className="font-bold text-slate-800 mb-6">{new Date(extendModal.booking.checkOut).toLocaleDateString()}</p>
                            
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Requested Check Out</label>
                            <input 
                                type="date" required 
                                min={new Date(extendModal.booking.checkOut).toISOString().split('T')[0]} 
                                className="w-full bg-white border border-slate-200 p-4 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none mb-6" 
                                value={extendModal.newDate} 
                                onChange={e => {
                                    const dateStr = e.target.value;
                                    setExtendModal({ 
                                        ...extendModal, 
                                        newDate: dateStr, 
                                        extraAmount: calculateExtensionAmount(extendModal.booking, dateStr) 
                                    });
                                }} 
                            />
                            
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Additional Amount</span>
                                <span className="font-black text-indigo-600 font-poppins text-lg">₹{extendModal.extraAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black text-sm shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all">
                            Send Request to Admin
                        </button>
                    </form>
                </div>
            )}

            {/* Complaint Modal */}
            {complaintModal.show && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={submitComplaint} className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300">
                        <button type="button" onClick={() => setComplaintModal({ show: false, bookingId: '', title: '', description: '' })} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-full transition-all">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Raise Ticket</h3>
                            <p className="text-slate-500 font-medium mt-1">Log a maintenance issue for your room.</p>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Active Booking</label>
                                <select required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 outline-none" value={complaintModal.bookingId} onChange={e => setComplaintModal({...complaintModal, bookingId: e.target.value})}>
                                    <option value="" disabled>Select Room...</option>
                                    {bookings.filter(b => b.status === 'active').map(b => (
                                        <option key={b._id} value={b._id}>{b.lodgeId?.name} - {b.roomId?.type} (#{b._id.slice(-4)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Issue Title</label>
                                <input placeholder="e.g., AC Not Working" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-900 outline-none" value={complaintModal.title} onChange={e => setComplaintModal({...complaintModal, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Description</label>
                                <textarea placeholder="Details about the issue..." required rows="4" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium text-slate-900 outline-none" value={complaintModal.description} onChange={e => setComplaintModal({...complaintModal, description: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-amber-500 text-white py-4 rounded-[2rem] font-black text-sm shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all">
                            Submit Ticket
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
