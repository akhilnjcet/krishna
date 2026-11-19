import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Truck, MapPin, Calendar, Clock, Navigation, CheckCircle2, 
    AlertTriangle, ShieldAlert, ArrowLeft, ArrowRight, FileText, 
    Fuel, Gauge, ShieldCheck, Eye, Download, Play, Pause, 
    CheckSquare, Camera, RefreshCw
} from 'lucide-react';

const DriverTripDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modals
    const [showStartModal, setShowStartModal] = useState(false);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Start form fields
    const [startOdo, setStartOdo] = useState('');
    const [fuelLevel, setFuelLevel] = useState('Full');
    const [vehicleCondition, setVehicleCondition] = useState('Good');
    const [startLocationName, setStartLocationName] = useState('');

    // Pause form fields
    const [pauseReason, setPauseReason] = useState('Driver Rest / Meal Break');

    // Complete form fields
    const [endOdo, setEndOdo] = useState('');
    const [fuelConsumption, setFuelConsumption] = useState('');
    const [deliveryConfirmation, setDeliveryConfirmation] = useState('Receiver Signature on Challan');
    const [remarks, setRemarks] = useState('');
    const [deliveryProofUrl, setDeliveryProofUrl] = useState('');

    // GPS Status
    const [gpsCoords, setGpsCoords] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('Detecting...');

    useEffect(() => {
        fetchTrip();
        captureGps();
    }, [id]);

    const fetchTrip = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/fleet-trips/${id}`);
            if (res.data.success) {
                setTrip(res.data.trip);
                if (res.data.trip.vehicleId?.currentOdometer) {
                    setStartOdo(res.data.trip.vehicleId.currentOdometer);
                }
            }
        } catch (err) {
            console.error('Fetch trip error:', err);
            alert(err.response?.data?.message || 'Error loading trip details.');
        } finally {
            setLoading(false);
        }
    };

    const captureGps = () => {
        if (!navigator.geolocation) {
            setGpsStatus('Geolocation not supported by device');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setGpsCoords(c);
                setGpsStatus(`GPS Active (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`);
            },
            (err) => {
                setGpsStatus('Location access permission denied / unavailable');
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    };

    const handleConfirmTrip = async () => {
        setActionLoading(true);
        try {
            const res = await api.post(`/fleet-trips/${id}/confirm`);
            if (res.data.success) {
                setTrip(res.data.trip);
                alert('Trip assignment confirmed successfully.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to confirm trip.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartTripSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                odometer: parseFloat(startOdo),
                fuelLevel,
                vehicleCondition,
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: startLocationName || trip.startLocation
                }
            };
            const res = await api.post(`/fleet-trips/${id}/start`, payload);
            if (res.data.success) {
                setShowStartModal(false);
                setTrip(res.data.trip);
                alert('Trip started! Drive safely.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to start trip.');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePauseTripSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await api.post(`/fleet-trips/${id}/pause`, { reason: pauseReason });
            if (res.data.success) {
                setShowPauseModal(false);
                setTrip(res.data.trip);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to pause trip.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResumeTrip = async () => {
        setActionLoading(true);
        try {
            const res = await api.post(`/fleet-trips/${id}/resume`);
            if (res.data.success) {
                setTrip(res.data.trip);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to resume trip.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteTripSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                odometer: parseFloat(endOdo),
                fuelConsumption: parseFloat(fuelConsumption) || 0,
                deliveryConfirmation,
                remarks,
                deliveryPhotos: deliveryProofUrl ? [deliveryProofUrl] : [],
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: trip.destination
                }
            };
            const res = await api.post(`/fleet-trips/${id}/complete`, payload);
            if (res.data.success) {
                setShowCompleteModal(false);
                setTrip(res.data.trip);
                alert('Trip completed! Delivery report submitted.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to complete trip.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !trip) {
        return (
            <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Trip Console...</p>
            </div>
        );
    }

    const isOngoing = trip.status === 'Started';
    const isPaused = trip.status === 'Paused';
    const isCompleted = trip.status === 'Completed';

    return (
        <div className="space-y-5">
            {/* Top Bar with Back Button */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/driver')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{trip.tripNumber}</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        trip.status === 'Started' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' :
                        trip.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        trip.status === 'Paused' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                        {trip.status}
                    </span>
                </div>
            </div>

            {/* Route & Cargo Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Assigned Route</span>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                            <span className="text-blue-600 dark:text-blue-400">{trip.startLocation}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">{trip.destination}</span>
                        </h2>
                    </div>
                    <div className="text-right text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle</span>
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                            {trip.vehicleRegistration}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickup Time</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {new Date(trip.pickupDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Delivery</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {trip.deliveryExpectedDateTime ? new Date(trip.deliveryExpectedDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Flexible'}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Purpose</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                            {trip.purpose || 'Transport'}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Consent</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate text-[11px]">
                            {gpsStatus}
                        </span>
                    </div>
                </div>

                {trip.cargoDetails && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs">
                        <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 block mb-0.5">Assigned Cargo / Materials:</span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{trip.cargoDetails}</p>
                    </div>
                )}

                {trip.specialInstructions && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs">
                        <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 block mb-0.5">Special Dispatch Instructions:</span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{trip.specialInstructions}</p>
                    </div>
                )}
            </div>

            {/* Official Transport Documents & E-Way Bills (Read-Only) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Official Transport Documents ({trip.documents?.length || 0})
                        </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Driver Read-Only</span>
                </div>

                {!trip.documents || trip.documents.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No digital documents attached to this trip yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {trip.documents.map((doc, idx) => (
                            <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                                <div className="space-y-0.5 truncate">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{doc.docType}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        {doc.docNumber ? `No: ${doc.docNumber}` : 'Official Doc'} • {doc.validUntil ? `Valid: ${new Date(doc.validUntil).toLocaleDateString()}` : 'Active'}
                                    </p>
                                </div>
                                <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center gap-1.5 flex-shrink-0 transition"
                                >
                                    <Eye className="w-3.5 h-3.5" /> View
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Start-to-End Report Summary (If Completed) */}
            {isCompleted && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-900/50 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black uppercase text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Trip Completed & Verified
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Start Odometer</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{trip.startReport?.odometer || 0} km</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">End Odometer</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{trip.endReport?.odometer || 0} km</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Distance Travelled</span>
                            <span className="font-mono font-black text-emerald-600">{trip.endReport?.distanceKm || 0} km</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Fuel Consumed</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{trip.endReport?.fuelConsumption || 0} L</span>
                        </div>
                    </div>
                    {trip.endReport?.deliveryConfirmation && (
                        <p className="text-slate-600 dark:text-slate-400">
                            <strong>Confirmation:</strong> {trip.endReport.deliveryConfirmation} • Remarks: {trip.endReport.remarks || 'None'}
                        </p>
                    )}
                </div>
            )}

            {/* Interactive Driver Action Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400">Driver Action Console</h3>

                <div className="flex flex-wrap items-center gap-2.5">
                    {trip.status === 'Assigned' && (
                        <button
                            onClick={handleConfirmTrip}
                            disabled={actionLoading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
                        >
                            <CheckSquare className="w-4 h-4" /> Confirm Trip Assignment
                        </button>
                    )}

                    {(trip.status === 'Assigned' || trip.status === 'Confirmed') && (
                        <button
                            onClick={() => setShowStartModal(true)}
                            disabled={actionLoading}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition disabled:opacity-50"
                        >
                            <Play className="w-4 h-4 fill-current" /> Start Trip (Inspection Report)
                        </button>
                    )}

                    {isOngoing && (
                        <>
                            <button
                                onClick={() => setShowPauseModal(true)}
                                disabled={actionLoading}
                                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                <Pause className="w-4 h-4 fill-current" /> Pause Trip
                            </button>
                            <button
                                onClick={() => setShowCompleteModal(true)}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Complete Delivery & Report
                            </button>
                        </>
                    )}

                    {isPaused && (
                        <>
                            <button
                                onClick={handleResumeTrip}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                <Play className="w-4 h-4 fill-current" /> Resume Trip
                            </button>
                            <button
                                onClick={() => setShowCompleteModal(true)}
                                disabled={actionLoading}
                                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Complete Trip
                            </button>
                        </>
                    )}

                    {isCompleted && (
                        <div className="w-full text-center py-2 text-xs text-slate-400 font-bold">
                            Trip completed. Historical records are locked and preserved for audit.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Start Trip Form */}
            {showStartModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Start Trip: Inspection & Odometer
                                </h3>
                                <p className="text-xs text-slate-500">{trip.tripNumber} • {trip.vehicleRegistration}</p>
                            </div>
                            <button onClick={() => setShowStartModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleStartTripSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Starting Odometer Reading (km) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="any"
                                    value={startOdo}
                                    onChange={(e) => setStartOdo(e.target.value)}
                                    placeholder="e.g. 45210"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Starting Fuel Level *
                                    </label>
                                    <select
                                        value={fuelLevel}
                                        onChange={(e) => setFuelLevel(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="100% (Full)">100% (Full)</option>
                                        <option value="75% (3/4)">75% (3/4)</option>
                                        <option value="50% (Half)">50% (Half)</option>
                                        <option value="25% (Quarter)">25% (Quarter)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Vehicle Condition *
                                    </label>
                                    <select
                                        value={vehicleCondition}
                                        onChange={(e) => setVehicleCondition(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="Good (Inspection Clear)">Good (Inspection Clear)</option>
                                        <option value="Minor Scratches / Dents">Minor Scratches / Dents</option>
                                        <option value="Tyre Pressure Warning">Tyre Pressure Warning</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Current Location / Yard Address
                                </label>
                                <input
                                    type="text"
                                    value={startLocationName}
                                    onChange={(e) => setStartLocationName(e.target.value)}
                                    placeholder={trip.startLocation}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    * Geolocation coordinates: {gpsStatus}
                                </p>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStartModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {actionLoading ? 'Starting...' : 'Confirm & Start Trip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Pause Trip Form */}
            {showPauseModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Pause Active Trip
                        </h3>
                        <form onSubmit={handlePauseTripSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Reason for Pause</label>
                                <select
                                    value={pauseReason}
                                    onChange={(e) => setPauseReason(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-bold"
                                >
                                    <option value="Driver Rest / Meal Break">Driver Rest / Meal Break</option>
                                    <option value="Heavy Traffic Jam">Heavy Traffic Jam</option>
                                    <option value="Tyre Inspection / Puncture Check">Tyre Inspection / Puncture Check</option>
                                    <option value="Toll Booth / Document Check">Toll Booth / Document Check</option>
                                    <option value="Site Gate Closed / Waiting Unload">Site Gate Closed / Waiting Unload</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPauseModal(false)}
                                    className="px-3 py-1.5 text-slate-500 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold"
                                >
                                    Pause Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Complete Delivery & End Report */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Complete Delivery & Trip Report
                                </h3>
                                <p className="text-xs text-slate-500">{trip.tripNumber} • Destination Arrival</p>
                            </div>
                            <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleCompleteTripSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Ending Odometer Reading (km) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={trip.startReport?.odometer || 0}
                                        step="any"
                                        value={endOdo}
                                        onChange={(e) => setEndOdo(e.target.value)}
                                        placeholder={`Min: ${trip.startReport?.odometer || 0}`}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold text-slate-900 dark:text-white"
                                    />
                                    {endOdo && trip.startReport?.odometer && (
                                        <p className="text-[10px] text-emerald-600 font-bold mt-1">
                                            Calculated Distance: {Math.max(0, parseFloat(endOdo) - trip.startReport.odometer)} km
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Fuel Consumed (approx L)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={fuelConsumption}
                                        onChange={(e) => setFuelConsumption(e.target.value)}
                                        placeholder="e.g. 25"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Delivery Confirmation / Proof *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={deliveryConfirmation}
                                    onChange={(e) => setDeliveryConfirmation(e.target.value)}
                                    placeholder="Receiver Name, Phone or Signed Gate Pass"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Delivery Photo / Signed Challan Image URL
                                </label>
                                <input
                                    type="text"
                                    value={deliveryProofUrl}
                                    onChange={(e) => setDeliveryProofUrl(e.target.value)}
                                    placeholder="https://... photo or document link"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Driver Remarks / Handover Notes
                                </label>
                                <textarea
                                    rows="2"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Unloading completed safely, materials intact..."
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCompleteModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {actionLoading ? 'Submitting...' : 'Submit Completion Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverTripDetail;
