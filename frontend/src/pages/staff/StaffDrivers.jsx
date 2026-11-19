import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Truck, Plus, Search, Filter, Calendar, AlertTriangle, ShieldCheck, 
    Clock, Navigation, User, MapPin, Gauge, Eye, FileText, CheckCircle2, 
    AlertOctagon, PhoneCall, RefreshCw, X, ChevronRight, UploadCloud,
    MessageSquare, ShieldAlert
} from 'lucide-react';

const StaffDrivers = () => {
    const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' | 'trips' | 'issues' | 'emergency'

    // Driver state
    const [drivers, setDrivers] = useState([]);
    const [driverSummary, setDriverSummary] = useState(null);
    const [loadingDrivers, setLoadingDrivers] = useState(true);
    const [driverSearch, setDriverSearch] = useState('');
    const [driverStatusFilter, setDriverStatusFilter] = useState('All');

    // Trips state
    const [trips, setTrips] = useState([]);
    const [loadingTrips, setLoadingTrips] = useState(false);
    const [tripStatusFilter, setTripStatusFilter] = useState('All');
    const [tripSearch, setTripSearch] = useState('');

    // Issues state
    const [issues, setIssues] = useState([]);
    const [loadingIssues, setLoadingIssues] = useState(false);
    const [issueCategoryFilter, setIssueCategoryFilter] = useState('All');
    const [issueStatusFilter, setIssueStatusFilter] = useState('All');

    // Emergency alerts
    const [emergencyAlerts, setEmergencyAlerts] = useState([]);

    // Modals
    const [showAssignTripModal, setShowAssignTripModal] = useState(false);
    const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showTripDetailModal, setShowTripDetailModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [showDocUploadModal, setShowDocUploadModal] = useState(false);
    const [targetTripForDoc, setTargetTripForDoc] = useState(null);
    const [showIssueResolveModal, setShowIssueResolveModal] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);

    // Form: Assign Trip
    const [eligibleVehicles, setEligibleVehicles] = useState([]);
    const [assignDriverId, setAssignDriverId] = useState('');
    const [assignVehicleId, setAssignVehicleId] = useState('');
    const [startLocation, setStartLocation] = useState('Central Workshop Store');
    const [destination, setDestination] = useState('');
    const [pickupDateTime, setPickupDateTime] = useState('');
    const [deliveryExpectedDateTime, setDeliveryExpectedDateTime] = useState('');
    const [cargoDetails, setCargoDetails] = useState('');
    const [purpose, setPurpose] = useState('Material Delivery');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [assigningTrip, setAssigningTrip] = useState(false);

    // Form: Upload Doc to Trip
    const [docType, setDocType] = useState('E-Way Bill');
    const [docNumber, setDocNumber] = useState('');
    const [docValidUntil, setDocValidUntil] = useState('');
    const [docFileUrl, setDocFileUrl] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Form: Resolve Issue
    const [newIssueStatus, setNewIssueStatus] = useState('In Progress');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolvingIssue, setResolvingIssue] = useState(false);

    useEffect(() => {
        fetchDrivers();
        fetchSummary();
        fetchEmergencyAlerts();
    }, []);

    useEffect(() => {
        if (activeTab === 'trips') fetchTrips();
        if (activeTab === 'issues') fetchIssues();
        if (activeTab === 'emergency') fetchEmergencyAlerts();
    }, [activeTab]);

    const fetchDrivers = async () => {
        try {
            setLoadingDrivers(true);
            const res = await api.get('/drivers');
            if (res.data.success) {
                setDrivers(res.data.drivers);
            }
        } catch (err) {
            console.error('Fetch drivers error:', err);
        } finally {
            setLoadingDrivers(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await api.get('/drivers/summary');
            if (res.data.success) {
                setDriverSummary(res.data.kpis);
            }
        } catch (err) {
            console.warn('Fetch summary error:', err);
        }
    };

    const fetchTrips = async () => {
        try {
            setLoadingTrips(true);
            const res = await api.get('/fleet-trips');
            if (res.data.success) {
                setTrips(res.data.trips);
            }
        } catch (err) {
            console.error('Fetch trips error:', err);
        } finally {
            setLoadingTrips(false);
        }
    };

    const fetchIssues = async () => {
        try {
            setLoadingIssues(true);
            const res = await api.get('/drivers/issues');
            if (res.data.success) {
                setIssues(res.data.issues);
            }
        } catch (err) {
            console.error('Fetch issues error:', err);
        } finally {
            setLoadingIssues(false);
        }
    };

    const fetchEmergencyAlerts = async () => {
        try {
            const res = await api.get('/drivers/emergency/alerts');
            if (res.data.success) {
                setEmergencyAlerts(res.data.alerts);
            }
        } catch (err) {
            console.warn('Fetch emergency alerts error:', err);
        }
    };

    const handleOpenAssignTrip = async (defaultDriver = null) => {
        try {
            const vRes = await api.get('/vehicles');
            if (vRes.data.success) {
                setEligibleVehicles(vRes.data.vehicles.filter(v => v.status !== 'In Maintenance' && v.status !== 'Out of Service'));
            }
            if (defaultDriver) {
                setAssignDriverId(defaultDriver._id);
                if (defaultDriver.currentAssignedVehicle?.vehicleId) {
                    setAssignVehicleId(defaultDriver.currentAssignedVehicle.vehicleId);
                }
            } else if (drivers.length > 0) {
                setAssignDriverId(drivers[0]._id);
            }
            setShowAssignTripModal(true);
        } catch (err) {
            alert('Failed to load available fleet vehicles.');
        }
    };

    const handleAssignTripSubmit = async (e) => {
        e.preventDefault();
        setAssigningTrip(true);
        try {
            const payload = {
                driverId: assignDriverId,
                vehicleId: assignVehicleId,
                startLocation,
                destination,
                pickupDateTime: pickupDateTime || new Date(),
                deliveryExpectedDateTime: deliveryExpectedDateTime || null,
                cargoDetails,
                purpose,
                specialInstructions
            };

            const res = await api.post('/fleet-trips', payload);
            if (res.data.success) {
                setShowAssignTripModal(false);
                setDestination('');
                setCargoDetails('');
                setSpecialInstructions('');
                fetchTrips();
                fetchDrivers();
                alert(`Trip assigned successfully: ${res.data.trip.tripNumber}`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error assigning trip.');
        } finally {
            setAssigningTrip(false);
        }
    };

    const handleUploadDocSubmit = async (e) => {
        e.preventDefault();
        setUploadingDoc(true);
        try {
            const payload = {
                docType,
                docNumber,
                validUntil: docValidUntil || null,
                fileUrl: docFileUrl
            };
            const res = await api.post(`/fleet-trips/${targetTripForDoc._id}/documents`, payload);
            if (res.data.success) {
                setShowDocUploadModal(false);
                setDocNumber('');
                setDocFileUrl('');
                fetchTrips();
                alert('Transport document attached successfully.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to attach document.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleResolveIssueSubmit = async (e) => {
        e.preventDefault();
        setResolvingIssue(true);
        try {
            const res = await api.patch(`/drivers/issues/${selectedIssue._id}/status`, {
                status: newIssueStatus,
                resolutionNotes
            });
            if (res.data.success) {
                setShowIssueResolveModal(false);
                setResolutionNotes('');
                fetchIssues();
                alert(`Issue status updated to '${newIssueStatus}'.`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update issue status.');
        } finally {
            setResolvingIssue(false);
        }
    };

    // Filter drivers
    const filteredDrivers = drivers.filter(d => {
        const matchesSearch = !driverSearch || 
            d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
            d.phone.includes(driverSearch) ||
            d.licenseNumber.toLowerCase().includes(driverSearch.toLowerCase());
        const matchesStatus = driverStatusFilter === 'All' || d.status === driverStatusFilter;
        return matchesSearch && matchesStatus;
    });

    // Filter trips
    const filteredTrips = trips.filter(t => {
        const matchesStatus = tripStatusFilter === 'All' || t.status === tripStatusFilter;
        const matchesSearch = !tripSearch ||
            t.tripNumber.toLowerCase().includes(tripSearch.toLowerCase()) ||
            t.driverName.toLowerCase().includes(tripSearch.toLowerCase()) ||
            t.destination.toLowerCase().includes(tripSearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Filter issues
    const filteredIssues = issues.filter(i => {
        const matchesStatus = issueStatusFilter === 'All' || i.status === issueStatusFilter;
        const matchesCategory = issueCategoryFilter === 'All' || i.category === issueCategoryFilter;
        return matchesStatus && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header & Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Staff Driver & Dispatch Control
                            </h1>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">
                                Operations Only
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Monitor driver schedules, assign trips, inspect deliveries, and respond to route incidents
                        </p>
                    </div>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl flex-wrap">
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                            activeTab === 'drivers'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Drivers ({drivers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('trips')}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
                            activeTab === 'trips'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Trip Schedules
                    </button>
                    <button
                        onClick={() => setActiveTab('issues')}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
                            activeTab === 'issues'
                                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Incidents</span>
                        {issues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                    </button>
                    {emergencyAlerts.length > 0 && (
                        <button
                            onClick={() => setActiveTab('emergency')}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> SOS ({emergencyAlerts.length})
                        </button>
                    )}
                </div>
            </div>

            {/* TAB 1: DRIVERS LIST & AVAILABILITY */}
            {activeTab === 'drivers' && (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    placeholder="Search driver by name, mobile, licence..."
                                    value={driverSearch}
                                    onChange={(e) => setDriverSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                />
                            </div>
                            <select
                                value={driverStatusFilter}
                                onChange={(e) => setDriverStatusFilter(e.target.value)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <button
                            onClick={() => handleOpenAssignTrip()}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition self-start sm:self-auto"
                        >
                            <Plus className="w-4 h-4" /> Assign New Trip
                        </button>
                    </div>

                    {/* Drivers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDrivers.map(d => {
                            const isAssigned = !!d.currentAssignedVehicle?.vehicleId;
                            return (
                                <div key={d._id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 hover:border-blue-300 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md overflow-hidden flex-shrink-0">
                                                {d.photoUrl ? (
                                                    <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    d.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{d.name}</h4>
                                                <p className="text-xs text-slate-400 font-mono">{d.phone}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                            d.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}>
                                            {d.status}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Licence No:</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.licenseNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Category:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{d.licenseType}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Assigned Vehicle:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {isAssigned ? d.currentAssignedVehicle.registrationNumber : <span className="text-emerald-600">Available</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => {
                                                setSelectedDriver(d);
                                                setShowDriverProfileModal(true);
                                            }}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition"
                                        >
                                            View Profile
                                        </button>
                                        <button
                                            onClick={() => handleOpenAssignTrip(d)}
                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm transition"
                                        >
                                            Assign Trip
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: TRIP SCHEDULES & MONITORING */}
            {activeTab === 'trips' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                <input
                                    type="text"
                                    placeholder="Search trip number, destination, driver..."
                                    value={tripSearch}
                                    onChange={(e) => setTripSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                />
                            </div>
                            <select
                                value={tripStatusFilter}
                                onChange={(e) => setTripStatusFilter(e.target.value)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold"
                            >
                                <option value="All">All Trip Statuses</option>
                                <option value="Assigned">Assigned</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Started">In Progress</option>
                                <option value="Paused">Paused</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <button
                            onClick={() => handleOpenAssignTrip()}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition"
                        >
                            <Plus className="w-4 h-4" /> New Trip
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        {loadingTrips ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading trip ledger...</div>
                        ) : filteredTrips.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-bold">No trips found matching filter.</div>
                        ) : (
                            filteredTrips.map(tr => (
                                <div key={tr._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 transition space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-slate-900 dark:text-white">{tr.tripNumber}</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                tr.status === 'Started' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                                                tr.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {tr.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            Pickup: {new Date(tr.pickupDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 font-bold">
                                        <span className="text-blue-600">{tr.startLocation}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-emerald-600">{tr.destination}</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                                        <div>Driver: <strong className="text-slate-800 dark:text-slate-200">{tr.driverName}</strong></div>
                                        <div>Vehicle: <strong className="text-slate-800 dark:text-slate-200">{tr.vehicleRegistration}</strong></div>
                                        <div>Purpose: {tr.purpose}</div>
                                        <div>Docs Attached: {tr.documents?.length || 0}</div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setTargetTripForDoc(tr);
                                                    setShowDocUploadModal(true);
                                                }}
                                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1"
                                            >
                                                <UploadCloud className="w-3 h-3" /> Attach Document / E-Way Bill
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedTrip(tr);
                                                setShowTripDetailModal(true);
                                            }}
                                            className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            View Full Trip Report <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: DRIVER ISSUES & INCIDENTS */}
            {activeTab === 'issues' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2">
                            <select
                                value={issueStatusFilter}
                                onChange={(e) => setIssueStatusFilter(e.target.value)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Submitted">Submitted</option>
                                <option value="Acknowledged">Acknowledged</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                        <button onClick={fetchIssues} className="text-slate-400 hover:text-blue-600 p-2">
                            <RefreshCw className={`w-4 h-4 ${loadingIssues ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        {loadingIssues ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading incident records...</div>
                        ) : filteredIssues.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-bold">No issues reported matching criteria.</div>
                        ) : (
                            filteredIssues.map(iss => (
                                <div key={iss._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-slate-900 dark:text-white">{iss.issueNumber}</span>
                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                                                {iss.category}
                                            </span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md font-bold">
                                                {iss.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(iss.createdAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <p className="text-slate-800 dark:text-slate-200 font-medium">{iss.description}</p>

                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div>Driver: <strong>{iss.driverName}</strong> ({iss.driverPhone}) • Vehicle: {iss.vehicleRegistration || 'N/A'}</div>
                                        <button
                                            onClick={() => {
                                                setSelectedIssue(iss);
                                                setNewIssueStatus(iss.status);
                                                setResolutionNotes(iss.resolutionNotes || '');
                                                setShowIssueResolveModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                                        >
                                            Respond / Update Status
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: EMERGENCY ALERTS */}
            {activeTab === 'emergency' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 font-black uppercase text-sm">
                        <ShieldAlert className="w-5 h-5 animate-pulse" /> Live Driver Emergency SOS Broadcasts
                    </div>
                    {emergencyAlerts.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">No active emergency alerts recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {emergencyAlerts.map(alt => (
                                <div key={alt._id} className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-black text-rose-700 dark:text-rose-300">{alt.alertNumber}</span>
                                        <span className="text-slate-400">{new Date(alt.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{alt.description}</p>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                        Driver: <strong>{alt.driverName}</strong> ({alt.driverPhone}) • Vehicle: {alt.vehicleRegistration || 'N/A'} • Location: {alt.location?.address || `${alt.location?.lat}, ${alt.location?.lng}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Assign New Trip */}
            {showAssignTripModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                Assign New Transport Trip
                            </h3>
                            <button onClick={() => setShowAssignTripModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleAssignTripSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assigned Driver *</label>
                                    <select
                                        required
                                        value={assignDriverId}
                                        onChange={(e) => setAssignDriverId(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        {drivers.filter(d => d.status === 'Active').map(d => (
                                            <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assigned Vehicle *</label>
                                    <select
                                        required
                                        value={assignVehicleId}
                                        onChange={(e) => setAssignVehicleId(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold font-mono"
                                    >
                                        <option value="">Select vehicle...</option>
                                        {eligibleVehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.registrationNumber} ({v.vehicleName})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Starting Origin *</label>
                                    <input
                                        type="text"
                                        required
                                        value={startLocation}
                                        onChange={(e) => setStartLocation(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Destination Address *</label>
                                    <input
                                        type="text"
                                        required
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        placeholder="e.g. Site 4B, Electronic City"
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pickup Schedule</label>
                                    <input
                                        type="datetime-local"
                                        value={pickupDateTime}
                                        onChange={(e) => setPickupDateTime(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Expected Delivery</label>
                                    <input
                                        type="datetime-local"
                                        value={deliveryExpectedDateTime}
                                        onChange={(e) => setDeliveryExpectedDateTime(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cargo Details / Line Items</label>
                                <textarea
                                    rows="2"
                                    value={cargoDetails}
                                    onChange={(e) => setCargoDetails(e.target.value)}
                                    placeholder="500 Kg Steel Plates, Fasteners, Tools..."
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignTripModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningTrip}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md"
                                >
                                    {assigningTrip ? 'Assigning...' : 'Dispatch Trip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Upload Document to Trip */}
            {showDocUploadModal && targetTripForDoc && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Attach Document to {targetTripForDoc.tripNumber}
                        </h3>
                        <form onSubmit={handleUploadDocSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Document Type *</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="E-Way Bill">E-Way Bill</option>
                                    <option value="Delivery Challan">Delivery Challan</option>
                                    <option value="Transport Bill / Bilty">Transport Bill / Bilty</option>
                                    <option value="Tax Invoice">Tax Invoice</option>
                                    <option value="Material Gate Pass">Material Gate Pass</option>
                                    <option value="Consignment Note">Consignment Note</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Document Number / Ref</label>
                                <input
                                    type="text"
                                    value={docNumber}
                                    onChange={(e) => setDocNumber(e.target.value)}
                                    placeholder="e.g. EWB-123456789"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Validity Date (if applicable)</label>
                                <input
                                    type="date"
                                    value={docValidUntil}
                                    onChange={(e) => setDocValidUntil(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Document PDF / File URL *</label>
                                <input
                                    type="text"
                                    required
                                    value={docFileUrl}
                                    onChange={(e) => setDocFileUrl(e.target.value)}
                                    placeholder="https://... PDF URL"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowDocUploadModal(false)} className="px-3 py-1.5 text-slate-500 font-bold">
                                    Cancel
                                </button>
                                <button type="submit" disabled={uploadingDoc} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">
                                    {uploadingDoc ? 'Attaching...' : 'Attach Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Update Issue Status */}
            {showIssueResolveModal && selectedIssue && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            Respond to {selectedIssue.issueNumber} ({selectedIssue.category})
                        </h3>
                        <form onSubmit={handleResolveIssueSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">New Status</label>
                                <select
                                    value={newIssueStatus}
                                    onChange={(e) => setNewIssueStatus(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="Acknowledged">Acknowledged</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="In Progress">In Progress (Assistance Dispatched)</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Dispatcher / Staff Resolution Notes</label>
                                <textarea
                                    rows="3"
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Mechanical team dispatched / route revised / toll clear..."
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowIssueResolveModal(false)} className="px-3 py-1.5 text-slate-500 font-bold">
                                    Cancel
                                </button>
                                <button type="submit" disabled={resolvingIssue} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                                    {resolvingIssue ? 'Saving...' : 'Update & Notify Driver'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDrivers;
