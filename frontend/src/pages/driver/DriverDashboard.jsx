import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
    Truck, MapPin, Calendar, Clock, Navigation, CheckCircle2, 
    AlertTriangle, ShieldAlert, ArrowRight, FileText, ChevronRight,
    Fuel, Gauge, ShieldCheck, AlertCircle, RefreshCw, Eye, Package, Scale, Phone,
    Home, ArrowLeft, UserCheck, Scan, Wallet
} from 'lucide-react';
import { openGoogleMapsNavigation } from '../../utils/mapsUtil';
import LocationSharingCard from '../../components/location/LocationSharingCard';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tripFilter, setTripFilter] = useState('all'); // 'all' | 'in_transit' | 'scheduled' | 'completed'

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setRefreshing(true);
            const [portalRes, attendanceRes] = await Promise.allSettled([
                api.get('/drivers/portal/me'),
                api.get('/attendance/my-logs')
            ]);

            if (portalRes.status === 'fulfilled' && portalRes.value.data?.success) {
                setPortalData(portalRes.value.data);
            }

            if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data?.success) {
                const sheets = attendanceRes.value.data.timesheets || [];
                const todayStr = new Date().toISOString().slice(0, 10);
                const match = sheets.find(s => s.date === todayStr);
                if (match) {
                    setTodayAttendance(match);
                }
            }
        } catch (err) {
            console.error('Error fetching driver portal data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'Assigned':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
            case 'Confirmed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
            case 'Started':
            case 'In Transit':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 animate-pulse';
            case 'Paused':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200';
            case 'Completed':
            case 'Closed':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Driver Portal...</p>
            </div>
        );
    }

    const { driver, assignedVehicle, todayTrips = [], upcomingTrips = [], allTrips = [], activeTrip, issues, metrics } = portalData || {};

    // Filtered list of trips
    const combinedTrips = allTrips.length > 0 ? allTrips : [...todayTrips, ...upcomingTrips];
    const displayTrips = combinedTrips.filter(t => {
        if (tripFilter === 'in_transit') return t.status === 'In Transit' || t.status === 'Started' || t.status === 'Paused';
        if (tripFilter === 'scheduled') return t.status === 'Assigned' || t.status === 'Confirmed';
        if (tripFilter === 'completed') return t.status === 'Completed' || t.status === 'Closed';
        return true;
    });

    return (
        <div className="space-y-5">
            {/* Navigation & Breadcrumb Bar */}
            <div className="flex items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/');
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition shadow-sm active:scale-95"
                        title="Go Back"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Back</span>
                    </button>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition shadow-sm active:scale-95"
                        title="Go to ERP Home"
                    >
                        <Home className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ERP Home</span>
                    </Link>
                </div>
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 hidden sm:block">
                    Portal Active · Driver Console
                </div>
            </div>

            {/* Top Welcome & Quick Refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">
                        Driver Control Center
                    </h2>
                    <p className="text-xs text-slate-500">Welcome, {driver?.name || 'Driver'} • Ready for dispatch</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition"
                    title="Refresh data"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Driver Face Attendance & Shift Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Staff & Driver Face Attendance
                            </h3>
                            {driver?.hasFaceEnrolled === false ? (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                                    Face Not Enrolled
                                </span>
                            ) : (
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                    todayAttendance?.check_out 
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300'
                                        : todayAttendance?.login_time 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}>
                                    {todayAttendance?.check_out ? 'Shift Completed' :
                                     todayAttendance?.login_time ? 'Shift Active (Checked In)' : 'Ready for Check-In'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {driver?.hasFaceEnrolled === false
                                ? 'Biometric template not registered. Please ask an admin to enroll your face in Staff Management.'
                                : todayAttendance?.check_out 
                                ? `Shift punch logged: In at ${todayAttendance.login_time} • Out at ${todayAttendance.check_out}`
                                : todayAttendance?.login_time 
                                ? `Active shift checked in at ${todayAttendance.login_time}. Punch out at end of shift.`
                                : 'Face recognition check-in with GPS verification for shift duties'}
                        </p>
                    </div>
                </div>

                <Link
                    to="/driver/attendance"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition shrink-0"
                >
                    <Scan className="w-4 h-4" />
                    <span>
                        {todayAttendance?.login_time && !todayAttendance?.check_out ? 'Face Check-Out' : 'Scan Face Attendance'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Driver Staff-Style Self-Service Suite */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                            Driver Self-Service Portal
                        </span>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Workplace, Attendance & Payout Services
                        </h3>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Driver Self-Service
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Attendance Calendar & Scores */}
                    <Link
                        to="/driver/attendance-hub"
                        className="p-3.5 bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl transition group flex flex-col justify-between space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-indigo-600">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                Attendance Hub
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                Monthly calendar & scores
                            </p>
                        </div>
                    </Link>

                    {/* My Timesheets */}
                    <Link
                        to="/driver/timesheets"
                        className="p-3.5 bg-slate-50 hover:bg-blue-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl transition group flex flex-col justify-between space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-blue-600">
                                <Clock className="w-4 h-4" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                My Timesheets
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                Shift logs & overtime hours
                            </p>
                        </div>
                    </Link>

                    {/* Leave Tracker */}
                    <Link
                        to="/driver/leave"
                        className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl transition group flex flex-col justify-between space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-emerald-600">
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                Leave Tracker
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                Apply & check balances
                            </p>
                        </div>
                    </Link>

                    {/* Payout Hub */}
                    <Link
                        to="/driver/salary"
                        className="p-3.5 bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl transition group flex flex-col justify-between space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-amber-600">
                                <Wallet className="w-4 h-4" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                                Payout Hub
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                Salary slips & OT earnings
                            </p>
                        </div>
                    </Link>

                    {/* Track Requests */}
                    <Link
                        to="/driver/applications"
                        className="p-3.5 bg-slate-50 hover:bg-purple-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl transition group flex flex-col justify-between space-y-3 col-span-2 sm:col-span-1"
                    >
                        <div className="flex items-center justify-between">
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs text-purple-600">
                                <FileText className="w-4 h-4" />
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                                Track Requests
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                OT claims & corrections
                            </p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Live Field & Route Location Sharing */}
            <LocationSharingCard userRole="driver" />

            {/* Active Ongoing Trip Banner */}
            {activeTrip && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white shadow-xl shadow-blue-900/30 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
                                    {activeTrip.status === 'Paused' ? '⏸️ Trip Paused' : '🟢 Active Trip in Progress'}
                                </span>
                                <span className="text-xs font-mono font-bold opacity-80">{activeTrip.tripNumber}</span>
                                {activeTrip.stockTransferNumber && (
                                    <span className="text-[10px] font-mono opacity-80 bg-white/10 px-2 py-0.5 rounded">
                                        Transfer: {activeTrip.stockTransferNumber}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight">
                                {activeTrip.startLocation} → {activeTrip.destination}
                            </h3>
                            <p className="text-xs opacity-80 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" /> Vehicle: {activeTrip.vehicleRegistration} • Start Odo: {activeTrip.startReport?.odometer || 0} km
                            </p>
                            {activeTrip.dropPoint && (
                                <p className="text-xs text-white/95 flex items-center gap-1 font-semibold mt-1">
                                    <MapPin className="w-3.5 h-3.5 text-amber-300" /> Drop Point: {activeTrip.dropPoint}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => openGoogleMapsNavigation(activeTrip)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
                                title="Open Destination in Google Maps"
                            >
                                <MapPin className="w-4 h-4 text-emerald-100" /> Map
                            </button>
                            <Link
                                to={`/driver/trip/${activeTrip._id}`}
                                className="bg-white text-blue-900 hover:bg-blue-50 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                            >
                                <Navigation className="w-4 h-4 text-blue-600" /> Open Trip Console
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total Assigned</p>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{combinedTrips.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400">Completed</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics?.completedTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400">Open Issues</p>
                    <p className={`text-xl font-black mt-0.5 ${(issues?.open || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {issues?.open || 0}
                    </p>
                </div>
            </div>

            {/* Current Assigned Vehicle Card (Read-Only) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-blue-600 dark:text-blue-400">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Current Assigned Vehicle
                            </h3>
                            <p className="text-[10px] text-slate-400">Official company transport asset (Read-Only)</p>
                        </div>
                    </div>
                    {assignedVehicle && (
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            assignedVehicle.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            assignedVehicle.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                            {assignedVehicle.status}
                        </span>
                    )}
                </div>

                {assignedVehicle ? (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reg Number</span>
                                <span className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5 block">
                                    {assignedVehicle.registrationNumber}
                                </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Model / Type</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                    {assignedVehicle.vehicleName} • {assignedVehicle.vehicleType}
                                </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Odometer</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {assignedVehicle.currentOdometer || 0} km
                                </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Fuel Tank</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {assignedVehicle.tankCapacityLiters || 60}L ({assignedVehicle.fuelType || 'Diesel'})
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 text-center text-xs text-slate-400 font-bold">
                        No vehicle currently assigned. Fleet manager will assign an authorized vehicle for your trips.
                    </div>
                )}
            </div>

            {/* DEDICATED SECTION: MY TRIPS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                My Trips ({displayTrips.length})
                            </h3>
                            <p className="text-[10px] text-slate-400">Strict driver-scoped delivery and transfer assignments</p>
                        </div>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        <button
                            onClick={() => setTripFilter('all')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                tripFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            All ({combinedTrips.length})
                        </button>
                        <button
                            onClick={() => setTripFilter('in_transit')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                tripFilter === 'in_transit' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            In Transit
                        </button>
                        <button
                            onClick={() => setTripFilter('scheduled')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                tripFilter === 'scheduled' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Scheduled
                        </button>
                        <button
                            onClick={() => setTripFilter('completed')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                tripFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                {displayTrips.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 font-bold">
                        No assigned trips in this category. Standby for dispatch.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayTrips.map(tr => (
                            <div 
                                key={tr._id} 
                                className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 transition space-y-3.5"
                            >
                                {/* Header with Trip ID & Transfer ID */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/40">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                            {tr.tripNumber}
                                        </span>
                                        {tr.stockTransferNumber && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                Transfer: {tr.stockTransferNumber}
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusChip(tr.status)}`}>
                                            {tr.status}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Pickup: {new Date(tr.pickupDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                </div>

                                {/* Source and Destination */}
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 flex-wrap">
                                    <span className="text-blue-600 dark:text-blue-400">{tr.startLocation}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-emerald-600 dark:text-emerald-400">{tr.destination}</span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Vehicle</span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                            {tr.vehicleRegistration}
                                        </span>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Load Details</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                            {tr.loadingDetails?.packages || 1} Pkgs {tr.loadingDetails?.weight ? `(${tr.loadingDetails.weight} ${tr.loadingDetails.weightUnit || 'Kg'})` : ''}
                                        </span>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Supervisor</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                            {tr.loadingDetails?.supervisor || 'Logistics Desk'}
                                        </span>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivery Outcome</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                            {tr.deliveryOutcome || 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                {/* Materials summary */}
                                {tr.items && tr.items.length > 0 && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800 truncate">
                                        <strong>Materials ({tr.items.length}):</strong>{' '}
                                        {tr.items.map(i => `${i.itemName} (${i.dispatchedQuantity} ${i.unit})`).join(', ')}
                                    </div>
                                )}

                                {/* Admin Instructions if present */}
                                {tr.specialInstructions && (
                                    <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                                        <strong>Admin Instructions:</strong> {tr.specialInstructions}
                                    </div>
                                )}

                                {/* Drop Point if present */}
                                {tr.dropPoint && (
                                    <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1.5 font-medium">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        <span><strong>Drop Point:</strong> {tr.dropPoint}</span>
                                    </div>
                                )}

                                {/* Action Console Link */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Driver: {tr.driverName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openGoogleMapsNavigation(tr)}
                                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                                            title="Open Trip Destination in Google Maps"
                                        >
                                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>Map</span>
                                        </button>
                                        <Link
                                            to={`/driver/trip/${tr._id}`}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition"
                                        >
                                            <Navigation className="w-3.5 h-3.5" /> Open Trip Actions <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;
