import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
    Truck, MapPin, Calendar, Clock, Navigation, CheckCircle2, 
    AlertTriangle, ShieldAlert, ArrowLeft, ArrowRight, FileText, 
    Fuel, Gauge, ShieldCheck, Eye, Download, Play, Pause, 
    CheckSquare, Camera, RefreshCw, X, Check, Phone, Scale, Package
} from 'lucide-react';
import { openGoogleMapsNavigation } from '../../utils/mapsUtil';

const ISSUE_CATEGORIES = [
    'Vehicle Breakdown',
    'Traffic Delay',
    'Accident',
    'Material Damage',
    'Quantity Mismatch',
    'Delivery Location Issue',
    'Other Issues'
];

const DriverTripDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modals
    const [showStartModal, setShowStartModal] = useState(false);
    const [showReportIssueModal, setShowReportIssueModal] = useState(false);
    const [showUpdateDeliveryModal, setShowUpdateDeliveryModal] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    // Start form fields
    const [startOdo, setStartOdo] = useState('');
    const [fuelLevel, setFuelLevel] = useState('Full');
    const [vehicleCondition, setVehicleCondition] = useState('Good (Inspection Clear)');
    const [startLocationName, setStartLocationName] = useState('');

    // Report Issue fields
    const [issueCategory, setIssueCategory] = useState('Vehicle Breakdown');
    const [issueDescription, setIssueDescription] = useState('');
    const [issuePhotoUrl, setIssuePhotoUrl] = useState('');
    const [issueUrgency, setIssueUrgency] = useState('Medium');

    // Update Delivery fields
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [deliverySignatureUrl, setDeliverySignatureUrl] = useState('');
    const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState('');
    const [deliveryRemarks, setDeliveryRemarks] = useState('');
    const [deliveryItemsList, setDeliveryItemsList] = useState([]);

    // Finish Trip fields
    const [finishOutcome, setFinishOutcome] = useState('FULLY DELIVERED');
    const [endOdo, setEndOdo] = useState('');
    const [fuelConsumption, setFuelConsumption] = useState('');
    const [finishRemarks, setFinishRemarks] = useState('');

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
            if (res.data?.success) {
                const t = res.data.trip;
                setTrip(t);
                if (t.vehicleId?.currentOdometer) {
                    setStartOdo(t.vehicleId.currentOdometer);
                }
                if (t.items && t.items.length > 0) {
                    setDeliveryItemsList(t.items.map(it => ({
                        inventoryItemId: it.inventoryItemId || null,
                        itemName: it.itemName,
                        unit: it.unit || 'Pcs',
                        dispatchedQuantity: it.dispatchedQuantity || 0,
                        deliveredQuantity: it.deliveredQuantity !== undefined ? it.deliveredQuantity : it.dispatchedQuantity,
                        damagedQuantity: it.damagedQuantity || 0,
                        missingQuantity: it.missingQuantity || 0,
                        returnedQuantity: it.returnedQuantity || 0,
                        condition: it.condition || 'Good',
                        remarks: it.remarks || ''
                    })));
                }
                if (t.proofOfDelivery?.receiverName) {
                    setReceiverName(t.proofOfDelivery.receiverName);
                }
                if (t.proofOfDelivery?.receiverPhone) {
                    setReceiverPhone(t.proofOfDelivery.receiverPhone);
                }
                if (t.proofOfDelivery?.remarks) {
                    setDeliveryRemarks(t.proofOfDelivery.remarks);
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

    // 1. START TRIP
    const handleStartTripSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                odometer: parseFloat(startOdo) || 0,
                fuelLevel,
                vehicleCondition,
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: startLocationName || trip.startLocation
                }
            };
            const res = await api.post(`/fleet-trips/${id}/start`, payload);
            if (res.data?.success) {
                setShowStartModal(false);
                setTrip(res.data.trip);
                alert('Trip started! Status set to IN TRANSIT. Drive safely.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to start trip.');
        } finally {
            setActionLoading(false);
        }
    };

    // 2. REPORT ISSUE
    const handleReportIssueSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                issueType: issueCategory,
                description: issueDescription,
                urgency: issueUrgency,
                photos: issuePhotoUrl ? [issuePhotoUrl] : [],
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: trip.destination || 'In Transit'
                }
            };
            const res = await api.post(`/fleet-trips/${id}/report-issue`, payload);
            if (res.data?.success) {
                setShowReportIssueModal(false);
                setTrip(res.data.trip);
                setIssueDescription('');
                setIssuePhotoUrl('');
                alert('Issue reported successfully. Admin logistics desk notified.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit issue report.');
        } finally {
            setActionLoading(false);
        }
    };

    // 3. UPDATE DELIVERY
    const handleUpdateDeliverySubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const payload = {
                receiverName,
                receiverPhone,
                signatureUrl: deliverySignatureUrl,
                photos: deliveryPhotoUrl ? [deliveryPhotoUrl] : [],
                remarks: deliveryRemarks,
                items: deliveryItemsList
            };
            const res = await api.put(`/fleet-trips/${id}/delivery`, payload);
            if (res.data?.success) {
                setShowUpdateDeliveryModal(false);
                setTrip(res.data.trip);
                alert('Delivery details updated successfully.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update delivery report.');
        } finally {
            setActionLoading(false);
        }
    };

    // 4. FINISH TRIP
    const handleFinishTripSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const minOdo = trip.startReport?.odometer || 0;
            if (parseFloat(endOdo) < minOdo) {
                alert(`Ending odometer (${endOdo}) cannot be less than starting odometer (${minOdo}).`);
                setActionLoading(false);
                return;
            }
            const payload = {
                deliveryOutcome: finishOutcome,
                odometer: parseFloat(endOdo) || minOdo,
                fuelConsumption: parseFloat(fuelConsumption) || 0,
                remarks: finishRemarks,
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: trip.destination
                }
            };
            const res = await api.post(`/fleet-trips/${id}/finish`, payload);
            if (res.data?.success) {
                setShowFinishModal(false);
                setTrip(res.data.trip);
                alert(`Trip completed! Outcome recorded as ${finishOutcome}. Ready for Admin stock verification.`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to finish trip.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !trip) {
        return (
            <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Driver Trip Console...</p>
            </div>
        );
    }

    const isInTransit = trip.status === 'In Transit' || trip.status === 'Started';
    const isCompleted = trip.status === 'Completed' || trip.status === 'Closed';

    return (
        <div className="space-y-5">
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/driver')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to My Trips
                </button>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{trip.tripNumber}</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        isInTransit ? 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' :
                        isCompleted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                        {trip.status}
                    </span>
                    {trip.deliveryOutcome && trip.deliveryOutcome !== 'Pending' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {trip.deliveryOutcome}
                        </span>
                    )}
                </div>
            </div>

            {/* Key Trip Info & Route Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Assigned Delivery Route</span>
                            {trip.stockTransferNumber && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                    Transfer ID: {trip.stockTransferNumber}
                                </span>
                            )}
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400">{trip.startLocation}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400">{trip.destination}</span>
                        </h2>
                        {trip.destinationAddress && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {trip.destinationAddress}
                            </p>
                        )}
                        {trip.dropPoint && (
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Drop Point: {trip.dropPoint}
                            </p>
                        )}
                        {trip.mapLink && (
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                🗺️ Verified Navigation Link Configured
                            </p>
                        )}
                        {!trip.mapLink && !trip.dropPoint && !trip.destinationCoords?.lat && (
                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> Map location was not added. Please confirm destination before navigating.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => openGoogleMapsNavigation(trip)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                            title="Open Trip Destination in Google Maps"
                        >
                            <MapPin className="w-4 h-4 text-emerald-100" />
                            <span>Navigate in Maps</span>
                        </button>
                        <div className="text-right text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle</span>
                            <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
                                {trip.vehicleRegistration}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{trip.vehicleName || trip.vehicleType}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Dispatch Schedule</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {new Date(trip.pickupDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Arrival</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {trip.deliveryExpectedDateTime ? new Date(trip.deliveryExpectedDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Flexible'}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Cargo Packages</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                            {trip.loadingDetails?.packages || 1} Pkgs {trip.loadingDetails?.weight ? `(${trip.loadingDetails.weight} ${trip.loadingDetails.weightUnit || 'Kg'})` : ''}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Location</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate text-[11px]">
                            {gpsStatus}
                        </span>
                    </div>
                </div>

                {trip.specialInstructions && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs">
                        <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 block mb-0.5">Admin / Handling Instructions:</span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{trip.specialInstructions}</p>
                    </div>
                )}
            </div>

            {/* Materials & Cargo Manifest */}
            {trip.items && trip.items.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Materials & Quantities Manifest ({trip.items.length} Lines)
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {trip.items.map((it, idx) => (
                            <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white">{it.itemName}</span>
                                    {it.itemCode && <span className="text-[10px] text-slate-400 ml-2 font-mono">({it.itemCode})</span>}
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-500">Dispatched: <strong className="text-slate-800 dark:text-slate-200">{it.dispatchedQuantity} {it.unit}</strong></span>
                                    {it.deliveredQuantity > 0 && (
                                        <span className="text-emerald-600 font-bold">Delivered: {it.deliveredQuantity}</span>
                                    )}
                                    {it.damagedQuantity > 0 && (
                                        <span className="text-rose-600 font-bold">Damaged: {it.damagedQuantity}</span>
                                    )}
                                    {it.returnedQuantity > 0 && (
                                        <span className="text-purple-600 font-bold">Returned: {it.returnedQuantity}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4 PRIMARY FUNCTIONAL DRIVER BUTTONS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400">Driver Workflow Action Center</h3>
                    <button
                        onClick={() => setShowTimelineModal(true)}
                        className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                    >
                        <Clock className="w-3.5 h-3.5" /> View Live Timeline
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* BUTTON 1: START TRIP */}
                    <button
                        onClick={() => setShowStartModal(true)}
                        disabled={isInTransit || isCompleted || actionLoading}
                        className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition ${
                            isInTransit || isCompleted
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
                        }`}
                    >
                        <Play className="w-4 h-4 fill-current" />
                        {isInTransit ? '✓ Trip Started' : 'Start Trip'}
                    </button>

                    {/* BUTTON 2: REPORT ISSUE */}
                    <button
                        onClick={() => setShowReportIssueModal(true)}
                        disabled={isCompleted}
                        className="py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 transition disabled:opacity-50"
                    >
                        <AlertTriangle className="w-4 h-4" /> Report Issue
                    </button>

                    {/* BUTTON 3: UPDATE DELIVERY */}
                    <button
                        onClick={() => setShowUpdateDeliveryModal(true)}
                        disabled={isCompleted}
                        className="py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition disabled:opacity-50"
                    >
                        <CheckSquare className="w-4 h-4" /> Update Delivery
                    </button>

                    {/* BUTTON 4: FINISH TRIP */}
                    <button
                        onClick={() => setShowFinishModal(true)}
                        disabled={isCompleted || (!isInTransit && trip.status !== 'In Transit')}
                        className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition ${
                            isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-95 disabled:opacity-50'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        {isCompleted ? '✓ Trip Finished' : 'Finish Trip'}
                    </button>
                </div>
            </div>

            {/* MODAL 1: START TRIP */}
            {showStartModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Start Trip: Record Departure & Odometer
                                </h3>
                                <p className="text-xs text-slate-500">{trip.tripNumber} • Vehicle: {trip.vehicleRegistration}</p>
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
                                    placeholder="Enter current odometer reading"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold text-slate-900 dark:text-white text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fuel Level *</label>
                                    <select
                                        value={fuelLevel}
                                        onChange={(e) => setFuelLevel(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="100% (Full)">100% (Full)</option>
                                        <option value="75% (3/4)">75% (3/4)</option>
                                        <option value="50% (Half)">50% (Half)</option>
                                        <option value="25% (Quarter)">25% (Quarter)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pre-Trip Inspection *</label>
                                    <select
                                        value={vehicleCondition}
                                        onChange={(e) => setVehicleCondition(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="Good (Inspection Clear)">Good (Inspection Clear)</option>
                                        <option value="Minor Body Scratches">Minor Body Scratches</option>
                                        <option value="Tyre Pressure Checked">Tyre Pressure Checked</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Departure Location Name</label>
                                <input
                                    type="text"
                                    value={startLocationName}
                                    onChange={(e) => setStartLocationName(e.target.value)}
                                    placeholder={trip.startLocation}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Status: {gpsStatus}</p>
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

            {/* MODAL 2: REPORT ISSUE */}
            {showReportIssueModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-rose-600 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Report Issue / Emergency Alert
                                </h3>
                                <p className="text-xs text-slate-500">Trip {trip.tripNumber} • Instantly alerts dispatch desk</p>
                            </div>
                            <button onClick={() => setShowReportIssueModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleReportIssueSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Issue Category *</label>
                                <select
                                    value={issueCategory}
                                    onChange={(e) => setIssueCategory(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    {ISSUE_CATEGORIES.map((cat, i) => (
                                        <option key={i} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Urgency Level</label>
                                <select
                                    value={issueUrgency}
                                    onChange={(e) => setIssueUrgency(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="Low">Low - Informational delay</option>
                                    <option value="Medium">Medium - Route delay / minor issue</option>
                                    <option value="Critical">Critical - Urgent assistance needed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Description / Location Details *</label>
                                <textarea
                                    required
                                    rows="3"
                                    placeholder="Explain the breakdown, delay, accident, or material issue in detail..."
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Photo / Evidence URL</label>
                                <input
                                    type="text"
                                    placeholder="https://... photo link (optional)"
                                    value={issuePhotoUrl}
                                    onChange={(e) => setIssuePhotoUrl(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <p className="text-[10px] text-slate-400">Current GPS location will be captured automatically with this report.</p>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReportIssueModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {actionLoading ? 'Reporting...' : 'Transmit Issue Alert'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: UPDATE DELIVERY (LINE ITEM RECONCILIATION & POD) */}
            {showUpdateDeliveryModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-blue-600">
                                    Update Delivery Quantities & Proof of Delivery
                                </h3>
                                <p className="text-xs text-slate-500">Trip {trip.tripNumber} • Record arrived materials and receiver details</p>
                            </div>
                            <button onClick={() => setShowUpdateDeliveryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleUpdateDeliverySubmit} className="space-y-4">
                            {/* Line items update */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-slate-400">Arrived Items Count:</span>
                                {deliveryItemsList.map((it, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                            <span>{it.itemName}</span>
                                            <span className="text-blue-600">Dispatched: {it.dispatchedQuantity} {it.unit}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-emerald-600 block mb-0.5">Delivered Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.deliveredQuantity}
                                                    onChange={(e) => {
                                                        const copy = [...deliveryItemsList];
                                                        copy[idx].deliveredQuantity = Number(e.target.value);
                                                        setDeliveryItemsList(copy);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-black"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-rose-500 block mb-0.5">Damaged Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.damagedQuantity}
                                                    onChange={(e) => {
                                                        const copy = [...deliveryItemsList];
                                                        copy[idx].damagedQuantity = Number(e.target.value);
                                                        setDeliveryItemsList(copy);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-rose-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-amber-500 block mb-0.5">Missing Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.missingQuantity}
                                                    onChange={(e) => {
                                                        const copy = [...deliveryItemsList];
                                                        copy[idx].missingQuantity = Number(e.target.value);
                                                        setDeliveryItemsList(copy);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-amber-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-purple-500 block mb-0.5">Returned Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.returnedQuantity}
                                                    onChange={(e) => {
                                                        const copy = [...deliveryItemsList];
                                                        copy[idx].returnedQuantity = Number(e.target.value);
                                                        setDeliveryItemsList(copy);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-purple-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Receiver Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Name of site engineer / recipient"
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Receiver Contact Phone</label>
                                    <input
                                        type="text"
                                        placeholder="+91 9876543210"
                                        value={receiverPhone}
                                        onChange={(e) => setReceiverPhone(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Signature / POD Image URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://... signature photo link"
                                        value={deliverySignatureUrl}
                                        onChange={(e) => setDeliverySignatureUrl(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Unloading Photo URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://... delivery photo link"
                                        value={deliveryPhotoUrl}
                                        onChange={(e) => setDeliveryPhotoUrl(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Delivery Remarks</label>
                                <textarea
                                    rows="2"
                                    placeholder="Handover remarks, gate pass notes..."
                                    value={deliveryRemarks}
                                    onChange={(e) => setDeliveryRemarks(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateDeliveryModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Delivery Progress'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: FINISH TRIP */}
            {showFinishModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> Finish Trip & Submit Final Report
                                </h3>
                                <p className="text-xs text-slate-500">{trip.tripNumber} • Complete handover</p>
                            </div>
                            <button onClick={() => setShowFinishModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleFinishTripSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Trip Outcome *</label>
                                <select
                                    required
                                    value={finishOutcome}
                                    onChange={(e) => setFinishOutcome(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200 text-sm"
                                >
                                    <option value="FULLY DELIVERED">FULLY DELIVERED</option>
                                    <option value="PARTIALLY DELIVERED">PARTIALLY DELIVERED</option>
                                    <option value="RETURNED TO SOURCE">RETURNED TO SOURCE</option>
                                    <option value="DELIVERY FAILED">DELIVERY FAILED</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Ending Odometer (km) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={trip.startReport?.odometer || 0}
                                        step="any"
                                        value={endOdo}
                                        onChange={(e) => setEndOdo(e.target.value)}
                                        placeholder={`Min: ${trip.startReport?.odometer || 0}`}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fuel Consumption (L)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 15"
                                        value={fuelConsumption}
                                        onChange={(e) => setFuelConsumption(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Final Remarks / Handover Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Summary of delivery outcome, vehicle return status..."
                                    value={finishRemarks}
                                    onChange={(e) => setFinishRemarks(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFinishModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {actionLoading ? 'Finalizing...' : 'Submit & Finish Trip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: 10-STAGE TIMELINE VIEWER */}
            {showTimelineModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Trip Audit & Delivery Timeline
                                </h3>
                                <p className="text-xs text-blue-600 font-mono font-bold">{trip.tripNumber}</p>
                            </div>
                            <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900">
                            {(trip.timeline || []).map((tl, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                                        <div className="flex items-center justify-between font-bold">
                                            <span className="text-slate-900 dark:text-white">{tl.stage}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(tl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {tl.notes && <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">{tl.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowTimelineModal(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverTripDetail;
