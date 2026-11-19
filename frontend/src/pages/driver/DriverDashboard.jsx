import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
    Truck, MapPin, Calendar, Clock, Navigation, CheckCircle2, 
    AlertTriangle, ShieldAlert, ArrowRight, FileText, ChevronRight,
    Fuel, Gauge, ShieldCheck, AlertCircle, RefreshCw, Eye
} from 'lucide-react';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDocModal, setSelectedDocModal] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setRefreshing(true);
            const res = await api.get('/drivers/portal/me');
            if (res.data.success) {
                setPortalData(res.data);
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
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 animate-pulse';
            case 'Paused':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200';
            case 'Completed':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
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

    const { driver, assignedVehicle, todayTrips = [], upcomingTrips = [], activeTrip, issues, metrics } = portalData || {};

    return (
        <div className="space-y-5">
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
                            </div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight">
                                {activeTrip.startLocation} → {activeTrip.destination}
                            </h3>
                            <p className="text-xs opacity-80 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" /> Vehicle: {activeTrip.vehicleRegistration} • Start Odo: {activeTrip.startReport?.odometer || 0} km
                            </p>
                        </div>
                        <Link
                            to={`/driver/trip/${activeTrip._id}`}
                            className="bg-white text-blue-900 hover:bg-blue-50 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition self-start sm:self-auto"
                        >
                            <Navigation className="w-4 h-4 text-blue-600" /> Open Trip Console
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400">Today's Trips</p>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{todayTrips.length}</p>
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

                        {/* Vehicle Certificates & Validity */}
                        {assignedVehicle.documents && assignedVehicle.documents.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Compliance Certificates & Documents:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {assignedVehicle.documents.map((d, i) => {
                                        const isExp = d.expiryDate && new Date(d.expiryDate) < new Date();
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{d.docType}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold ${isExp ? 'text-rose-500' : 'text-slate-400'}`}>
                                                        Exp: {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    {d.fileUrl && (
                                                        <a 
                                                            href={d.fileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-blue-600 hover:underline p-1"
                                                            title="View Document"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-6 text-center text-xs text-slate-400 font-bold">
                        No vehicle currently assigned. Fleet manager will assign an authorized vehicle for your trips.
                    </div>
                )}
            </div>

            {/* Today's Assigned Trips */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Today's Scheduled Trips ({todayTrips.length})
                            </h3>
                            <p className="text-[10px] text-slate-400">Pickups and deliveries assigned for today</p>
                        </div>
                    </div>
                </div>

                {todayTrips.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-bold">
                        No trips scheduled for today. Check upcoming trips below or standby for dispatch.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todayTrips.map(tr => (
                            <div 
                                key={tr._id} 
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 transition space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{tr.tripNumber}</span>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusChip(tr.status)}`}>
                                            {tr.status}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(tr.pickupDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <span className="text-blue-600 dark:text-blue-400">{tr.startLocation}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-emerald-600 dark:text-emerald-400">{tr.destination}</span>
                                </div>

                                {tr.cargoDetails && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        <strong>Cargo:</strong> {tr.cargoDetails}
                                    </p>
                                )}

                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-medium">Vehicle: {tr.vehicleRegistration}</span>
                                    <Link
                                        to={`/driver/trip/${tr._id}`}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition"
                                    >
                                        View Details <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Upcoming Trips ({upcomingTrips.length})
                                </h3>
                                <p className="text-[10px] text-slate-400">Advance schedule</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {upcomingTrips.map(tr => (
                            <Link
                                key={tr._id}
                                to={`/driver/trip/${tr._id}`}
                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition"
                            >
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{tr.tripNumber}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(tr.pickupDateTime).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {tr.startLocation} → {tr.destination}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
