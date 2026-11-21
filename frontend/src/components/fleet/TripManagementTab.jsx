import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    Truck, User, Calendar, Clock, MapPin, AlertTriangle, CheckCircle2,
    X, RefreshCw, FileText, Phone, ArrowRight, ShieldAlert, Download,
    Search, Filter, Plus, Eye, Check, ChevronRight, Navigation,
    RotateCcw, ShieldCheck, Scale, Package
} from 'lucide-react';

const TripManagementTab = () => {
    const [trips, setTrips] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [outcomeFilter, setOutcomeFilter] = useState('All');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [showIssuesModal, setShowIssuesModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);

    // Fleet data for dropdowns
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [availableVehicles, setAvailableVehicles] = useState([]);

    // Reassign form
    const [newDriverId, setNewDriverId] = useState('');
    const [newVehicleId, setNewVehicleId] = useState('');
    const [newPickupDate, setNewPickupDate] = useState('');
    const [newDeliveryExpectedDate, setNewDeliveryExpectedDate] = useState('');
    const [reassignNotes, setReassignNotes] = useState('');
    const [modalSubmitting, setModalSubmitting] = useState(false);

    // Verification & Reconciliation form
    const [reconcileStatus, setReconcileStatus] = useState('Approved');
    const [reconcileRemarks, setReconcileRemarks] = useState('');
    const [verifiedItemsList, setVerifiedItemsList] = useState([]);

    // Manual Trip Creation Form
    const [manualTripForm, setManualTripForm] = useState({
        driverId: '',
        vehicleId: '',
        startLocation: 'Central Yard / Workshop',
        startAddress: '',
        destination: '',
        destinationAddress: '',
        pickupDateTime: new Date().toISOString().slice(0, 16),
        deliveryExpectedDateTime: '',
        purpose: 'Material / Site Cargo Delivery',
        specialInstructions: '',
        packages: 1,
        weight: '',
        weightUnit: 'Kg',
        items: [{ itemName: '', quantity: 1, unit: 'Pcs', remarks: '' }]
    });

    useEffect(() => {
        fetchTrips();
        fetchMetrics();
        fetchFleetOptions();

        // 10-second polling for real-time tracking
        const interval = setInterval(() => {
            fetchTrips(true);
            fetchMetrics();
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const fetchTrips = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/fleet-trips');
            if (res.data?.success) {
                setTrips(res.data.trips || []);
            }
        } catch (err) {
            console.error('Error fetching fleet trips:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/fleet-trips/metrics/summary');
            if (res.data?.success) {
                setMetrics(res.data.metrics);
            }
        } catch (err) {
            console.warn('Could not fetch trip metrics:', err);
        }
    };

    const fetchFleetOptions = async () => {
        try {
            const [driversRes, vehsRes] = await Promise.all([
                api.get('/drivers'),
                api.get('/vehicles')
            ]);
            if (driversRes.data?.success) {
                setAvailableDrivers(driversRes.data.drivers || []);
            }
            if (vehsRes.data?.success) {
                setAvailableVehicles(vehsRes.data.vehicles || []);
            }
        } catch (err) {
            console.warn('Error loading fleet options:', err);
        }
    };

    // Open Reassign Modal
    const handleOpenReassign = (trip) => {
        setSelectedTrip(trip);
        setNewDriverId(trip.driverId?._id || trip.driverId || '');
        setNewVehicleId(trip.vehicleId?._id || trip.vehicleId || '');
        setNewPickupDate(trip.pickupDateTime ? new Date(trip.pickupDateTime).toISOString().slice(0, 16) : '');
        setNewDeliveryExpectedDate(trip.deliveryExpectedDateTime ? new Date(trip.deliveryExpectedDateTime).toISOString().slice(0, 16) : '');
        setReassignNotes('');
        setShowReassignModal(true);
    };

    const handleReassignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTrip) return;
        setModalSubmitting(true);
        try {
            const res = await api.put(`/fleet-trips/${selectedTrip._id}/reassign`, {
                driverId: newDriverId,
                vehicleId: newVehicleId,
                pickupDateTime: newPickupDate || null,
                deliveryExpectedDateTime: newDeliveryExpectedDate || null,
                notes: reassignNotes
            });
            if (res.data?.success) {
                alert('Trip assignments and schedule updated successfully.');
                setShowReassignModal(false);
                fetchTrips();
                fetchMetrics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reassign trip.');
        } finally {
            setModalSubmitting(false);
        }
    };

    // Open Reconcile Modal
    const handleOpenReconcile = (trip) => {
        setSelectedTrip(trip);
        setReconcileStatus('Approved');
        setReconcileRemarks('');
        // Initialize verified items list from trip items
        const initialItems = (trip.items || []).map(it => ({
            _id: it._id,
            inventoryItemId: it.inventoryItemId,
            itemName: it.itemName,
            unit: it.unit || 'Pcs',
            dispatchedQuantity: it.dispatchedQuantity || 0,
            deliveredQuantity: it.deliveredQuantity !== undefined ? it.deliveredQuantity : it.dispatchedQuantity,
            damagedQuantity: it.damagedQuantity || 0,
            missingQuantity: it.missingQuantity || 0,
            returnedQuantity: it.returnedQuantity || 0,
            remarks: it.remarks || ''
        }));
        setVerifiedItemsList(initialItems);
        setShowReconcileModal(true);
    };

    const handleReconcileSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTrip) return;
        setModalSubmitting(true);
        try {
            const res = await api.put(`/fleet-trips/${selectedTrip._id}/verify-reconcile`, {
                reconciliationStatus: reconcileStatus,
                adminRemarks: reconcileRemarks,
                verifiedItems: verifiedItemsList
            });
            if (res.data?.success) {
                alert('Trip verified and stock inventory successfully reconciled!');
                setShowReconcileModal(false);
                fetchTrips();
                fetchMetrics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to verify and reconcile trip.');
        } finally {
            setModalSubmitting(false);
        }
    };

    // Close Trip
    const handleCloseTrip = async (tripId) => {
        if (!window.confirm('Are you sure you want to officially close and archive this trip?')) return;
        try {
            const res = await api.put(`/fleet-trips/${tripId}/close`, { closeNotes: 'Trip officially closed by admin.' });
            if (res.data?.success) {
                alert('Trip closed successfully.');
                fetchTrips();
                fetchMetrics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close trip.');
        }
    };

    // Manual Trip Creation
    const handleAddManualItem = () => {
        setManualTripForm({
            ...manualTripForm,
            items: [...manualTripForm.items, { itemName: '', quantity: 1, unit: 'Pcs', remarks: '' }]
        });
    };

    const handleManualItemChange = (idx, field, val) => {
        const nextItems = [...manualTripForm.items];
        nextItems[idx][field] = val;
        setManualTripForm({ ...manualTripForm, items: nextItems });
    };

    const handleRemoveManualItem = (idx) => {
        setManualTripForm({
            ...manualTripForm,
            items: manualTripForm.items.filter((_, i) => i !== idx)
        });
    };

    const handleCreateManualTripSubmit = async (e) => {
        e.preventDefault();
        setModalSubmitting(true);
        try {
            const validItems = manualTripForm.items.filter(i => i.itemName.trim() && Number(i.quantity) > 0);
            const payload = {
                driverId: manualTripForm.driverId,
                vehicleId: manualTripForm.vehicleId,
                startLocation: manualTripForm.startLocation,
                startAddress: manualTripForm.startAddress,
                destination: manualTripForm.destination,
                destinationAddress: manualTripForm.destinationAddress,
                pickupDateTime: manualTripForm.pickupDateTime,
                deliveryExpectedDateTime: manualTripForm.deliveryExpectedDateTime || null,
                purpose: manualTripForm.purpose,
                specialInstructions: manualTripForm.specialInstructions,
                loadingDetails: {
                    packages: Number(manualTripForm.packages) || 0,
                    weight: Number(manualTripForm.weight) || 0,
                    weightUnit: manualTripForm.weightUnit,
                    specialInstructions: manualTripForm.specialInstructions
                },
                items: validItems.map(i => ({
                    itemName: i.itemName,
                    quantity: Number(i.quantity),
                    unit: i.unit,
                    remarks: i.remarks
                }))
            };
            const res = await api.post('/fleet-trips', payload);
            if (res.data?.success) {
                alert(`Trip ${res.data.trip.tripNumber} successfully created and assigned.`);
                setShowCreateModal(false);
                setManualTripForm({
                    driverId: '',
                    vehicleId: '',
                    startLocation: 'Central Yard / Workshop',
                    startAddress: '',
                    destination: '',
                    destinationAddress: '',
                    pickupDateTime: new Date().toISOString().slice(0, 16),
                    deliveryExpectedDateTime: '',
                    purpose: 'Material / Site Cargo Delivery',
                    specialInstructions: '',
                    packages: 1,
                    weight: '',
                    weightUnit: 'Kg',
                    items: [{ itemName: '', quantity: 1, unit: 'Pcs', remarks: '' }]
                });
                fetchTrips();
                fetchMetrics();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create trip.');
        } finally {
            setModalSubmitting(false);
        }
    };

    // Export CSV
    const handleExportCSV = () => {
        if (!trips.length) {
            alert('No trip data to export.');
            return;
        }
        const headers = ['Trip Number', 'Transfer Number', 'Status', 'Driver', 'Driver Phone', 'Vehicle', 'Start Location', 'Destination', 'Pickup Date', 'Delivery Outcome', 'Reconciled'];
        const rows = trips.map(t => [
            t.tripNumber,
            t.stockTransferNumber || 'Direct Trip',
            t.status,
            t.driverName,
            t.driverPhone || '',
            t.vehicleRegistration,
            `"${t.startLocation.replace(/"/g, '""')}"`,
            `"${t.destination.replace(/"/g, '""')}"`,
            t.pickupDateTime ? new Date(t.pickupDateTime).toLocaleDateString() : '',
            t.deliveryOutcome || 'Pending',
            t.isVerifiedByAdmin ? 'Yes' : 'No'
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Fleet_Trips_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtered trips
    const filteredTrips = trips.filter(tr => {
        const matchesQuery = 
            (tr.tripNumber && tr.tripNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tr.stockTransferNumber && tr.stockTransferNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tr.driverName && tr.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tr.vehicleRegistration && tr.vehicleRegistration.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tr.startLocation && tr.startLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tr.destination && tr.destination.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'All' || tr.status === statusFilter;
        const matchesOutcome = outcomeFilter === 'All' || tr.deliveryOutcome === outcomeFilter;
        return matchesQuery && matchesStatus && matchesOutcome;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Assigned': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';
            case 'In Transit':
            case 'Started': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 animate-pulse';
            case 'Paused': return 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200';
            case 'Completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
            case 'Closed': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
            case 'Cancelled': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 block truncate">Total Trips</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{metrics?.totalTrips || trips.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-500 block truncate">Scheduled</span>
                    <p className="text-xl font-black text-amber-600 mt-1">{metrics?.scheduledTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-500 block truncate">In Transit</span>
                    <p className="text-xl font-black text-indigo-600 mt-1 animate-pulse">{metrics?.inTransitTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-500 block truncate">Delivered</span>
                    <p className="text-xl font-black text-emerald-600 mt-1">{metrics?.deliveredTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-orange-500 block truncate">Partial</span>
                    <p className="text-xl font-black text-orange-600 mt-1">{metrics?.partialDeliveredTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-purple-500 block truncate">Returned</span>
                    <p className="text-xl font-black text-purple-600 mt-1">{metrics?.returnedTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-rose-500 block truncate">Delayed</span>
                    <p className="text-xl font-black text-rose-600 mt-1">{metrics?.delayedTrips || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-red-600 block truncate">Issues Reported</span>
                    <p className={`text-xl font-black mt-1 ${(metrics?.reportedIssuesTrips || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {metrics?.reportedIssuesTrips || 0}
                    </p>
                </div>
            </div>

            {/* Action Bar & Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                        <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Real-Time Trip Monitoring & Dispatch Console
                        </h2>
                        <p className="text-xs text-slate-500">Live vehicle tracking, driver updates, issue handling & authoritative stock reconciliation</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => fetchTrips()}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="Refresh Trips"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition"
                    >
                        <Plus className="w-4 h-4" /> New Cargo Trip
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by Trip ID, Transfer ID, Driver, Vehicle, or Location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                    >
                        <option value="All">All Trip Statuses</option>
                        <option value="Assigned">Assigned / Scheduled</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Paused">Paused</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                    </select>

                    <select
                        value={outcomeFilter}
                        onChange={(e) => setOutcomeFilter(e.target.value)}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                    >
                        <option value="All">All Outcomes</option>
                        <option value="Pending">Pending Outcome</option>
                        <option value="Fully Delivered">Fully Delivered</option>
                        <option value="Partially Delivered">Partially Delivered</option>
                        <option value="Returned to Source">Returned to Source</option>
                        <option value="Delivery Failed">Delivery Failed</option>
                    </select>
                </div>
            </div>

            {/* Trips List Cards */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-16 text-center text-xs font-bold text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        Loading active fleet trips...
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400">
                        No fleet trips found matching current filters.
                    </div>
                ) : (
                    filteredTrips.map(tr => {
                        const hasOpenIssue = tr.reportedIssues && tr.reportedIssues.some(i => i.status === 'Open');
                        const isReconciled = tr.isVerifiedByAdmin;

                        return (
                            <div 
                                key={tr._id} 
                                className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-slate-900 transition shadow-sm space-y-4 ${
                                    hasOpenIssue ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20' : 'border-slate-200 dark:border-slate-800'
                                }`}
                            >
                                {/* Trip Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                            {tr.tripNumber}
                                        </span>
                                        {tr.stockTransferNumber && (
                                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                Transfer: {tr.stockTransferNumber}
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusColor(tr.status)}`}>
                                            {tr.status}
                                        </span>
                                        {tr.deliveryOutcome && tr.deliveryOutcome !== 'Pending' && (
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                                tr.deliveryOutcome === 'Fully Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                tr.deliveryOutcome === 'Partially Delivered' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                {tr.deliveryOutcome}
                                            </span>
                                        )}
                                        {isReconciled && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Reconciled
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => {
                                                setSelectedTrip(tr);
                                                setShowTimelineModal(true);
                                            }}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <Clock className="w-3.5 h-3.5 text-blue-500" /> Timeline ({tr.timeline?.length || 0})
                                        </button>

                                        {tr.reportedIssues?.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedTrip(tr);
                                                    setShowIssuesModal(true);
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-xs flex items-center gap-1 hover:bg-rose-600 shadow-sm"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" /> Issues ({tr.reportedIssues.length})
                                            </button>
                                        )}

                                        {tr.status !== 'Completed' && tr.status !== 'Closed' && (
                                            <button
                                                onClick={() => handleOpenReassign(tr)}
                                                className="px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            >
                                                Reassign / Reschedule
                                            </button>
                                        )}

                                        {(tr.status === 'Completed' || tr.status === 'In Transit' || tr.deliveryOutcome !== 'Pending') && !isReconciled && (
                                            <button
                                                onClick={() => handleOpenReconcile(tr)}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Reconcile
                                            </button>
                                        )}

                                        {tr.status === 'Completed' && (
                                            <button
                                                onClick={() => handleCloseTrip(tr._id)}
                                                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100"
                                            >
                                                Close Trip
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Route & Asset Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Transit Route</span>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                            <span className="text-blue-600 dark:text-blue-400">{tr.startLocation}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                            <span className="text-emerald-600 dark:text-emerald-400">{tr.destination}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Driver</span>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                            <span>{tr.driverName}</span>
                                            {tr.driverPhone && (
                                                <a href={`tel:${tr.driverPhone}`} className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]" title="Call Driver">
                                                    <Phone className="w-3 h-3" /> {tr.driverPhone}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Registration</span>
                                        <div className="font-mono font-black text-slate-900 dark:text-white">
                                            {tr.vehicleRegistration} <span className="font-normal text-slate-400 text-[10px]">({tr.vehicleType || 'Fleet'})</span>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Schedule Times</span>
                                        <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                            <span>Pickup: {new Date(tr.pickupDateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items & POD Overview */}
                                {tr.items && tr.items.length > 0 && (
                                    <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500">
                                                Cargo Manifest ({tr.items.length} Line Items):
                                            </span>
                                            {tr.loadingDetails?.weight && (
                                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                                    <Scale className="w-3 h-3" /> Cargo Wt: {tr.loadingDetails.weight} {tr.loadingDetails.weightUnit || 'Kg'}
                                                    {tr.loadingDetails.packages ? ` • ${tr.loadingDetails.packages} Packages` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {tr.items.map((it, idx) => (
                                                <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{it.itemName}</span>
                                                    <div className="flex items-center gap-1.5 text-[11px]">
                                                        <span className="text-slate-500">Disp: {it.dispatchedQuantity}</span>
                                                        {it.deliveredQuantity > 0 && (
                                                            <span className="text-emerald-600 font-bold">Del: {it.deliveredQuantity}</span>
                                                        )}
                                                        {it.damagedQuantity > 0 && (
                                                            <span className="text-rose-600 font-bold">Dam: {it.damagedQuantity}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Proof of Delivery summary if present */}
                                {tr.proofOfDelivery?.receiverName && (
                                    <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <span>
                                                Receiver: <strong>{tr.proofOfDelivery.receiverName}</strong> {tr.proofOfDelivery.receiverPhone ? `(${tr.proofOfDelivery.receiverPhone})` : ''}
                                                {tr.proofOfDelivery.remarks ? ` — "${tr.proofOfDelivery.remarks}"` : ''}
                                            </span>
                                        </div>
                                        {tr.proofOfDelivery.signatureUrl && (
                                            <a href={tr.proofOfDelivery.signatureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px] font-bold">
                                                View Signature / POD
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL 1: 10-Stage Timeline Viewer */}
            {showTimelineModal && selectedTrip && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Trip Audit & Delivery Timeline
                                </h2>
                                <p className="text-xs text-blue-600 font-mono font-bold">{selectedTrip.tripNumber}</p>
                            </div>
                            <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-xs text-slate-500 mb-2">
                                Chain-of-custody tracking from dispatch order creation to final inventory reconciliation:
                            </div>

                            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900">
                                {(selectedTrip.timeline || []).map((tl, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900" />
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                                            <div className="flex items-center justify-between font-bold">
                                                <span className="text-slate-900 dark:text-white">{tl.stage}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(tl.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {tl.notes && <p className="text-slate-600 dark:text-slate-300 text-[11px]">{tl.notes}</p>}
                                            {tl.performedBy && <p className="text-[10px] text-slate-400">Recorded by: {tl.performedBy}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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

            {/* MODAL 2: View Reported Issues */}
            {showIssuesModal && selectedTrip && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-rose-600 flex items-center gap-1.5">
                                    <AlertTriangle className="w-5 h-5" /> Driver Reported Issues
                                </h2>
                                <p className="text-xs text-slate-500 font-mono">{selectedTrip.tripNumber} &middot; Driver: {selectedTrip.driverName}</p>
                            </div>
                            <button onClick={() => setShowIssuesModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(selectedTrip.reportedIssues || []).map((iss, i) => (
                                <div key={i} className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2 text-xs">
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-rose-800 dark:text-rose-300 text-sm">{iss.issueType}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(iss.reportedAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300">{iss.description}</p>
                                    {iss.location?.address && (
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-rose-500" /> Location: {iss.location.address}
                                        </p>
                                    )}
                                    {iss.photos && iss.photos.length > 0 && (
                                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                                            {iss.photos.map((ph, idx) => (
                                                <a key={idx} href={ph} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg border border-slate-200 overflow-hidden">
                                                    <img src={ph} alt="Issue photo" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowIssuesModal(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xs"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: Reassign Driver & Vehicle / Reschedule Trip */}
            {showReassignModal && selectedTrip && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Reassign Driver & Vehicle / Reschedule
                                </h2>
                                <p className="text-xs text-blue-600 font-mono font-bold">{selectedTrip.tripNumber}</p>
                            </div>
                            <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Driver *</label>
                                <select
                                    required
                                    value={newDriverId}
                                    onChange={(e) => setNewDriverId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="">Select an active driver...</option>
                                    {availableDrivers.map(d => (
                                        <option key={d._id} value={d._id}>
                                            {d.name} &middot; {d.phone || 'No phone'} ({d.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Fleet Vehicle *</label>
                                <select
                                    required
                                    value={newVehicleId}
                                    onChange={(e) => setNewVehicleId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="">Select available company vehicle...</option>
                                    {availableVehicles.map(v => (
                                        <option key={v._id} value={v._id}>
                                            {v.registrationNumber} &middot; {v.vehicleName || v.vehicleType} ({v.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pickup Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newPickupDate}
                                        onChange={(e) => setNewPickupDate(e.target.value)}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Expected Delivery Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newDeliveryExpectedDate}
                                        onChange={(e) => setNewDeliveryExpectedDate(e.target.value)}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Reason / Instructions</label>
                                <textarea
                                    rows="2"
                                    placeholder="Reason for reassignment or rescheduled departure..."
                                    value={reassignNotes}
                                    onChange={(e) => setReassignNotes(e.target.value)}
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReassignModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalSubmitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    {modalSubmitting ? 'Updating...' : 'Save Reassignment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: Authoritative Inventory Verification & Reconciliation */}
            {showReconcileModal && selectedTrip && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-emerald-600" /> Verify Delivery & Reconcile Stock Inventory
                                </h2>
                                <p className="text-xs text-slate-500 font-mono">
                                    {selectedTrip.tripNumber} {selectedTrip.stockTransferNumber ? `• Transfer: ${selectedTrip.stockTransferNumber}` : ''}
                                </p>
                            </div>
                            <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReconcileSubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
                                <strong>Strict Synchronization Policy:</strong> Verifying delivery will automatically credit destination stock with delivered quantities, return intact returned goods to source stock, and register damages/missing items as discrepancy losses.
                            </div>

                            {/* Item Ledger Table */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-slate-400">Review Item Quantities:</span>
                                {verifiedItemsList.map((it, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex justify-between font-bold text-slate-900 dark:text-white">
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
                                                        const copy = [...verifiedItemsList];
                                                        copy[idx].deliveredQuantity = Number(e.target.value);
                                                        setVerifiedItemsList(copy);
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
                                                        const copy = [...verifiedItemsList];
                                                        copy[idx].damagedQuantity = Number(e.target.value);
                                                        setVerifiedItemsList(copy);
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
                                                        const copy = [...verifiedItemsList];
                                                        copy[idx].missingQuantity = Number(e.target.value);
                                                        setVerifiedItemsList(copy);
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
                                                        const copy = [...verifiedItemsList];
                                                        copy[idx].returnedQuantity = Number(e.target.value);
                                                        setVerifiedItemsList(copy);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-purple-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Reconciliation Action</label>
                                <select
                                    value={reconcileStatus}
                                    onChange={(e) => setReconcileStatus(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="Approved">Approve & Synchronize Stock Balances</option>
                                    <option value="Discrepancy Flagged">Flag Discrepancy for Audit</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Admin Verification Remarks</label>
                                <textarea
                                    rows="2"
                                    placeholder="Enter physical inspection notes, signoff details..."
                                    value={reconcileRemarks}
                                    onChange={(e) => setReconcileRemarks(e.target.value)}
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReconcileModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalSubmitting}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    {modalSubmitting ? 'Synchronizing Stock...' : 'Confirm & Reconcile Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: Create Manual Cargo Trip */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-blue-600" /> Create Manual Cargo Trip
                                </h2>
                                <p className="text-xs text-slate-500">Dispatch cargo directly without prior inventory stock transfer</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateManualTripSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assigned Driver *</label>
                                    <select
                                        required
                                        value={manualTripForm.driverId}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, driverId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Select active driver...</option>
                                        {availableDrivers.map(d => (
                                            <option key={d._id} value={d._id}>{d.name} ({d.phone || 'No phone'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assigned Fleet Vehicle *</label>
                                    <select
                                        required
                                        value={manualTripForm.vehicleId}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, vehicleId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Select company vehicle...</option>
                                        {availableVehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.registrationNumber} &middot; {v.vehicleName || v.vehicleType}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Starting Location *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Central Yard, Palakkad"
                                        value={manualTripForm.startLocation}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, startLocation: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Destination *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Kochi Metro Project Site"
                                        value={manualTripForm.destination}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, destination: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pickup Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={manualTripForm.pickupDateTime}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, pickupDateTime: e.target.value })}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Expected Delivery Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={manualTripForm.deliveryExpectedDateTime}
                                        onChange={(e) => setManualTripForm({ ...manualTripForm, deliveryExpectedDateTime: e.target.value })}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs"
                                    />
                                </div>
                            </div>

                            {/* Cargo items */}
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Cargo Materials / Equipment</label>
                                    <button
                                        type="button"
                                        onClick={handleAddManualItem}
                                        className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px]"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Cargo Line
                                    </button>
                                </div>
                                {manualTripForm.items.map((it, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Material / Tool name"
                                            value={it.itemName}
                                            onChange={(e) => handleManualItemChange(idx, 'itemName', e.target.value)}
                                            className="col-span-6 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={it.quantity}
                                            onChange={(e) => handleManualItemChange(idx, 'quantity', e.target.value)}
                                            className="col-span-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-bold"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unit"
                                            value={it.unit}
                                            onChange={(e) => handleManualItemChange(idx, 'unit', e.target.value)}
                                            className="col-span-3 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center"
                                        />
                                        {manualTripForm.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveManualItem(idx)}
                                                className="col-span-1 text-rose-500 p-1 hover:bg-rose-50 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalSubmitting}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    {modalSubmitting ? 'Creating...' : 'Create & Assign Trip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripManagementTab;
