import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    Truck, Navigation, AlertOctagon, User, LogOut, PhoneCall, 
    ShieldAlert, AlertTriangle, CheckCircle2, FileText, ChevronRight,
    MapPin, Bell, Clock, Home, ChevronLeft, ArrowLeft
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';

const DriverLayout = () => {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const [driverInfo, setDriverInfo] = useState(null);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [emergencyDesc, setEmergencyDesc] = useState('');
    const [sendingAlert, setSendingAlert] = useState(false);
    const [sosSuccess, setSosSuccess] = useState(false);

    useEffect(() => {
        fetchPortalHeaderData();
        fetchEmergencyContacts();
    }, []);

    const fetchPortalHeaderData = async () => {
        try {
            const res = await api.get('/drivers/portal/me');
            if (res.data.success) {
                setDriverInfo(res.data.driver);
            }
        } catch (err) {
            console.warn('Driver header fetch:', err.message);
        }
    };

    const fetchEmergencyContacts = async () => {
        try {
            const res = await api.get('/drivers/emergency/contacts');
            if (res.data.success) {
                setEmergencyContacts(res.data.contacts);
            }
        } catch (err) {
            console.warn('Emergency contacts fetch:', err.message);
        }
    };

    const handleSendSos = async () => {
        setSendingAlert(true);
        try {
            let coords = { lat: null, lng: null, address: '' };
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    coords.lat = pos.coords.latitude;
                    coords.lng = pos.coords.longitude;
                    coords.address = `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
                } catch (e) {
                    // Graceful fallback
                    coords.address = 'Location not accessible or permission denied';
                }
            }

            const res = await api.post('/drivers/emergency/alert', {
                description: emergencyDesc || 'Emergency SOS triggered by driver',
                location: coords
            });

            if (res.data.success) {
                setSosSuccess(true);
                setTimeout(() => {
                    setSosSuccess(false);
                    setShowEmergencyModal(false);
                    setEmergencyDesc('');
                }, 3000);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to dispatch SOS alert. Please call the emergency hotline directly.');
        } finally {
            setSendingAlert(false);
        }
    };

    const navTabs = [
        { name: 'Trips & Tasks', path: '/driver', icon: Truck },
        { name: 'Report Issues', path: '/driver/issues', icon: AlertOctagon },
        { name: 'My Profile', path: '/driver/profile', icon: User },
        { name: 'ERP Home', path: '/', icon: Home }
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-20 md:pb-6">
            {/* Top Driver App Bar */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm px-3 sm:px-4 py-2.5">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
                    {/* Left: Back Button, Home Button & Brand */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                        {/* Back Going Navigation Button */}
                        <button
                            onClick={() => {
                                if (location.pathname !== '/driver') {
                                    navigate('/driver');
                                } else {
                                    navigate('/');
                                }
                            }}
                            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 active:scale-95"
                            title="Go Back"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4 stroke-[2.5]" />
                            <span className="hidden sm:inline">Back</span>
                        </button>

                        {/* Home Page Navigation Button */}
                        <Link
                            to="/"
                            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 active:scale-95"
                            title="ERP Home Page"
                        >
                            <Home className="w-4 h-4 stroke-[2.5]" />
                            <span className="hidden sm:inline">Home</span>
                        </Link>

                        {/* Brand Logo & Details */}
                        <Link to="/driver" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group ml-0.5 sm:ml-1">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 hidden xs:block sm:block">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                                        Krishna Fleet
                                    </h1>
                                    <span className="text-[9px] sm:text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                        Driver
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-[120px] sm:max-w-xs mt-0.5">
                                    {driverInfo?.name || user?.name || 'Driver'} • {driverInfo?.licenseNumber || 'Verified'}
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation Tabs */}
                    <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
                        {navTabs.map(tab => {
                            const active = location.pathname === tab.path;
                            return (
                                <Link
                                    key={tab.name}
                                    to={tab.path}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        active
                                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <tab.icon className={`w-3.5 h-3.5 ${active ? 'stroke-[2.5]' : ''}`} />
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Quick Actions & SOS */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Emergency SOS Button */}
                        <button
                            onClick={() => setShowEmergencyModal(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-3 sm:px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition shrink-0"
                            title="Emergency SOS"
                        >
                            <ShieldAlert className="w-4 h-4 animate-pulse" />
                            <span>SOS</span>
                        </button>

                        <ThemeToggle />

                        <button
                            onClick={() => {
                                logout();
                                navigate('/login', { replace: true });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-slate-200 dark:border-slate-800 shrink-0"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content View */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5">
                <Outlet />
            </main>

            {/* Bottom Navigation Bar for Mobile */}
            <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-30 md:hidden px-2 py-2 flex items-center justify-around shadow-xl">
                {navTabs.map(tab => {
                    const active = location.pathname === tab.path;
                    return (
                        <Link
                            key={tab.name}
                            to={tab.path}
                            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition ${
                                active
                                    ? 'text-blue-600 dark:text-blue-400 font-black scale-105'
                                    : 'text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <tab.icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                            <span className="text-[10px] uppercase tracking-wider">{tab.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Emergency SOS Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl">
                                <ShieldAlert className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-base font-black uppercase text-rose-600 tracking-tight">
                                    Emergency SOS Dispatch
                                </h2>
                                <p className="text-xs text-slate-500">Instant Help & 24/7 Hotline Contacts</p>
                            </div>
                        </div>

                        {sosSuccess ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                <h3 className="font-black text-sm text-emerald-800 dark:text-emerald-300 uppercase">
                                    SOS Broadcasted Successfully!
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Fleet Control and assigned logistics staff have received your emergency alert and coordinates. Stand by for contact.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Describe Emergency (Optional)
                                    </label>
                                    <textarea
                                        rows="2"
                                        placeholder="Accident, severe breakdown, highway harassment, medical issue..."
                                        value={emergencyDesc}
                                        onChange={(e) => setEmergencyDesc(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        * Current GPS coordinates will be attached automatically if permission is granted.
                                    </p>
                                </div>

                                <button
                                    onClick={handleSendSos}
                                    disabled={sendingAlert}
                                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    {sendingAlert ? 'Broadcasting Alert...' : 'Broadcast Immediate SOS'}
                                </button>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Direct Emergency Call Contacts:</p>
                                    <div className="space-y-2">
                                        {emergencyContacts.map((c, i) => (
                                            <a
                                                key={i}
                                                href={`tel:${c.phone}`}
                                                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                                            >
                                                <div>
                                                    <p className="font-black text-slate-800 dark:text-slate-200">{c.role} ({c.name})</p>
                                                    <p className="text-[10px] text-slate-400">{c.available}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold font-mono">
                                                    <PhoneCall className="w-4 h-4" /> {c.phone}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => setShowEmergencyModal(false)}
                                        className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverLayout;
