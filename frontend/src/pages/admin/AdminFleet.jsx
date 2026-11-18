import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Truck, Plus, Search, Filter, Calendar, AlertTriangle, ShieldCheck, 
    Clock, DollarSign, Fuel, Wrench, FileText, CheckCircle2, ChevronRight, 
    X, RefreshCw, Navigation, User, MapPin, Gauge
} from 'lucide-react';

const VEHICLE_TYPES = [
    'Pickup Truck',
    'Flatbed Truck',
    'Heavy Commercial Trailer',
    'Crane / Boom Truck',
    'Utility Van',
    'Company Car',
    'Two Wheeler'
];

const AdminFleet = () => {
    const [vehicles, setVehicles] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [expiringOnly, setExpiringOnly] = useState(false);

    // Modals
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showTripModal, setShowTripModal] = useState(false);
    const [showFuelModal, setShowFuelModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // Form states
    const [registerForm, setRegisterForm] = useState({
        registrationNumber: '',
        vehicleName: '',
        vehicleType: 'Pickup Truck',
        assignedDriverId: '',
        driverLicenseNumber: '',
        currentOdometer: '',
        fuelType: 'Diesel',
        tankCapacityLiters: '60',
        notes: ''
    });

    const [tripForm, setTripForm] = useState({
        projectId: '',
        destination: '',
        startOdometer: '',
        endOdometer: '',
        purpose: 'Material / Site Delivery',
        isCompleted: false
    });

    const [fuelForm, setFuelForm] = useState({
        liters: '',
        costPerLiter: '',
        totalCost: '',
        odometerReading: '',
        fuelStation: 'Local Fuel Pump',
        notes: ''
    });

    const [serviceForm, setServiceForm] = useState({
        serviceType: 'Scheduled Maintenance',
        odometerReading: '',
        garageName: 'Authorized Service Center',
        totalCost: '',
        nextServiceDueOdometer: '',
        notes: ''
    });

    const [docForm, setDocForm] = useState({
        docType: 'Insurance Policy',
        documentNumber: '',
        expiryDate: '',
        notes: ''
    });

    // Drivers & Projects
    const [drivers, setDrivers] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        fetchVehicles();
        fetchAuxiliaryData();
    }, [statusFilter, typeFilter, expiringOnly]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'All') params.status = statusFilter;
            if (typeFilter !== 'All') params.vehicleType = typeFilter;
            if (expiringOnly) params.expiringDocs = 'true';
            if (searchQuery) params.search = searchQuery;

            const [vehRes, repRes] = await Promise.all([
                api.get('/vehicles', { params }),
                api.get('/vehicles/reports/summary').catch(() => ({ data: { kpis: null } }))
            ]);

            if (vehRes.data?.vehicles) setVehicles(vehRes.data.vehicles);
            if (repRes.data?.kpis) setKpis(repRes.data.kpis);
        } catch (err) {
            console.error('Failed to load fleet:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuxiliaryData = async () => {
        try {
            const [staffRes, projRes] = await Promise.all([
                api.get('/admin/staff').catch(() => ({ data: { staff: [] } })),
                api.get('/projects').catch(() => ({ data: { projects: [] } }))
            ]);
            if (staffRes.data?.staff) setDrivers(staffRes.data.staff);
            if (projRes.data) {
                const list = Array.isArray(projRes.data) ? projRes.data : (projRes.data.projects || []);
                setProjects(list);
            }
        } catch (err) {
            console.warn('Auxiliary fetch error:', err);
        }
    };

    const handleRegisterVehicle = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vehicles', registerForm);
            setShowRegisterModal(false);
            setRegisterForm({
                registrationNumber: '',
                vehicleName: '',
                vehicleType: 'Pickup Truck',
                assignedDriverId: '',
                driverLicenseNumber: '',
                currentOdometer: '',
                fuelType: 'Diesel',
                tankCapacityLiters: '60',
                notes: ''
            });
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to register vehicle');
        }
    };

    const handleRecordTrip = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/trips`, tripForm);
            setShowTripModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to record trip');
        }
    };

    const handleRecordFuel = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/fuel`, fuelForm);
            setShowFuelModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to record fuel log');
        }
    };

    const handleRecordService = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/service`, serviceForm);
            setShowServiceModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to record service log');
        }
    };

    const handleAddDocument = async (e) => {
        e.preventDefault();
        if (!selectedVehicle) return;
        try {
            await api.post(`/vehicles/${selectedVehicle._id}/documents`, docForm);
            setShowDocModal(false);
            setSelectedVehicle(null);
            fetchVehicles();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to add document');
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            v.registrationNumber?.toLowerCase().includes(q) ||
            v.vehicleName?.toLowerCase().includes(q) ||
            v.assignedDriverName?.toLowerCase().includes(q)
        );
    });

    const expiringAlertCount = vehicles.filter(v => v.hasExpiringDocs).length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500/30 border border-blue-400/40 uppercase tracking-wider">
                            Logistics & Site Dispatches
                        </span>
                        {expiringAlertCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/30 border border-amber-400/40 flex items-center gap-1 text-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                {expiringAlertCount} Vehicle Document Renewal Due
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">Fleet & Vehicle Management</h1>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
                        Manage company logistics, delivery vehicles, driver assignments, trip logs, fuel mileage efficiency, and maintenance expenses integrated with finance.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowRegisterModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Register Vehicle
                    </button>
                    <button
                        type="button"
                        onClick={fetchVehicles}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {kpis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Total Fleet Size</span>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {kpis.totalVehicles}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-bold">{kpis.availableVehicles} Ready for Dispatch</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-indigo-500 uppercase">On Delivery Trips</span>
                        <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                            {kpis.onTripVehicles}
                        </p>
                        <span className="text-[10px] text-slate-400">{kpis.totalFleetDistance} km total logged</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-amber-500 uppercase">Total Fuel Expense</span>
                        <p className="text-xl sm:text-2xl font-black text-amber-600 font-poppins mt-1">
                            ₹{kpis.totalFleetFuelCost.toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-400">Synced to Financial Ledger</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Service & Repairs</span>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-poppins mt-1">
                            ₹{kpis.totalFleetMaintenanceCost.toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-400">Total Fleet Cost: ₹{kpis.totalFleetExpenses.toLocaleString()}</span>
                    </div>
                </div>
            )}

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by registration number, vehicle model, driver..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="In Maintenance">In Maintenance</option>
                        <option value="Out of Service">Out of Service</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold"
                    >
                        <option value="All">All Vehicle Types</option>
                        {VEHICLE_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => setExpiringOnly(!expiringOnly)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            expiringOnly ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Expiring Docs ({expiringAlertCount})
                    </button>
                </div>
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                    <h3 className="font-bold text-slate-800 dark:text-white">No Fleet Vehicles Found</h3>
                    <p className="text-xs text-slate-500 mt-1">Register delivery trucks, pickups or utility trailers to begin tracking logistics.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVehicles.map(vehicle => (
                        <div
                            key={vehicle._id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                        >
                            <div className="space-y-3">
                                {/* Top Badges */}
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-black text-sm px-2.5 py-1 bg-slate-900 text-amber-400 rounded-lg tracking-wider">
                                        {vehicle.registrationNumber}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                        vehicle.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                                        vehicle.status === 'On Trip' ? 'bg-indigo-100 text-indigo-700' :
                                        'bg-rose-100 text-rose-700'
                                    }`}>
                                        {vehicle.status}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-base">{vehicle.vehicleName}</h3>
                                    <p className="text-xs text-slate-500">{vehicle.vehicleType} • {vehicle.fuelType}</p>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Odometer</span>
                                        <span className="font-black text-slate-900 dark:text-white font-poppins">{vehicle.currentOdometer} km</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Mileage</span>
                                        <span className="font-black text-emerald-600 font-poppins">{vehicle.avgEfficiency || '—'} km/L</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Cost</span>
                                        <span className="font-black text-indigo-600 font-poppins">₹{vehicle.totalExpenses.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Driver & Site assignment */}
                                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Driver: <strong>{vehicle.assignedDriverName || 'Unassigned'}</strong></span>
                                    </div>
                                    {vehicle.expiringDocuments?.length > 0 && (
                                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                            <span>
                                                {vehicle.expiringDocuments[0].docType} expires in {vehicle.expiringDocuments[0].daysRemaining} days!
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1.5 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedVehicle(vehicle);
                                        setTripForm({
                                            projectId: '',
                                            destination: '',
                                            startOdometer: vehicle.currentOdometer,
                                            endOdometer: '',
                                            purpose: 'Fabrication Site Delivery',
                                            isCompleted: false
                                        });
                                        setShowTripModal(true);
                                    }}
                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                    <Navigation className="w-3 h-3" />
                                    Trip
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedVehicle(vehicle);
                                        setFuelForm({
                                            liters: '',
                                            costPerLiter: '',
                                            totalCost: '',
                                            odometerReading: vehicle.currentOdometer,
                                            fuelStation: 'Local Fuel Pump',
                                            notes: ''
                                        });
                                        setShowFuelModal(true);
                                    }}
                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                    <Fuel className="w-3 h-3" />
                                    Fuel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedVehicle(vehicle);
                                        setServiceForm({
                                            serviceType: 'Scheduled Maintenance',
                                            odometerReading: vehicle.currentOdometer,
                                            garageName: 'Authorized Service Center',
                                            totalCost: '',
                                            nextServiceDueOdometer: vehicle.currentOdometer + 5000,
                                            notes: ''
                                        });
                                        setShowServiceModal(true);
                                    }}
                                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                    <Wrench className="w-3 h-3" />
                                    Service
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════ MODAL: REGISTER VEHICLE ═══════════ */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Register Company Vehicle</h3>
                            <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterVehicle} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Registration Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="KL-52-A-1234"
                                        value={registerForm.registrationNumber}
                                        onChange={(e) => setRegisterForm({ ...registerForm, registrationNumber: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold uppercase font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Vehicle Name / Model *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Mahindra Bolero Pickup"
                                        value={registerForm.vehicleName}
                                        onChange={(e) => setRegisterForm({ ...registerForm, vehicleName: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Vehicle Type *</label>
                                    <select
                                        value={registerForm.vehicleType}
                                        onChange={(e) => setRegisterForm({ ...registerForm, vehicleType: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        {VEHICLE_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Assigned Driver</label>
                                    <select
                                        value={registerForm.assignedDriverId}
                                        onChange={(e) => setRegisterForm({ ...registerForm, assignedDriverId: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="">Unassigned</option>
                                        {drivers.map(d => (
                                            <option key={d._id} value={d._id}>{d.name} ({d.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Current Odometer (km)</label>
                                    <input
                                        type="number"
                                        value={registerForm.currentOdometer}
                                        onChange={(e) => setRegisterForm({ ...registerForm, currentOdometer: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Fuel Type</label>
                                    <select
                                        value={registerForm.fuelType}
                                        onChange={(e) => setRegisterForm({ ...registerForm, fuelType: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="Diesel">Diesel</option>
                                        <option value="Petrol">Petrol</option>
                                        <option value="Electric">Electric</option>
                                        <option value="CNG">CNG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Tank Capacity (L)</label>
                                    <input
                                        type="number"
                                        value={registerForm.tankCapacityLiters}
                                        onChange={(e) => setRegisterForm({ ...registerForm, tankCapacityLiters: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Save Vehicle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: LOG FUEL EXPENSE ═══════════ */}
            {showFuelModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Log Fuel Refill</h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber} — {selectedVehicle.vehicleName}</p>
                            </div>
                            <button onClick={() => setShowFuelModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordFuel} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Fuel Liters *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="e.g. 45.5"
                                        value={fuelForm.liters}
                                        onChange={(e) => {
                                            const l = parseFloat(e.target.value) || 0;
                                            const cpl = parseFloat(fuelForm.costPerLiter) || 0;
                                            setFuelForm({
                                                ...fuelForm,
                                                liters: e.target.value,
                                                totalCost: cpl > 0 ? (l * cpl).toFixed(2) : fuelForm.totalCost
                                            });
                                        }}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Total Cost (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="Total Amount"
                                        value={fuelForm.totalCost}
                                        onChange={(e) => setFuelForm({ ...fuelForm, totalCost: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-poppins"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Odometer Reading (km) *</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="Current km"
                                        value={fuelForm.odometerReading}
                                        onChange={(e) => setFuelForm({ ...fuelForm, odometerReading: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Fuel Station</label>
                                    <input
                                        type="text"
                                        value={fuelForm.fuelStation}
                                        onChange={(e) => setFuelForm({ ...fuelForm, fuelStation: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg font-bold">
                                🔒 Single Source of Truth: This will automatically record an Expense in the company finance ledger under category 'fuel'.
                            </p>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowFuelModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Record Fuel Refill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: LOG SERVICE / MAINTENANCE ═══════════ */}
            {showServiceModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Log Vehicle Service</h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber}</p>
                            </div>
                            <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordService} className="space-y-3.5">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Service Type *</label>
                                <select
                                    value={serviceForm.serviceType}
                                    onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                                    <option value="Oil & Filter Change">Oil & Filter Change</option>
                                    <option value="Brake Service">Brake Service</option>
                                    <option value="Tyre Replacement">Tyre Replacement</option>
                                    <option value="Engine / Transmission Repair">Engine / Transmission Repair</option>
                                    <option value="Accident Repair">Accident Repair</option>
                                    <option value="Electrical / Battery">Electrical / Battery</option>
                                    <option value="Suspension / Wheel Alignment">Suspension / Wheel Alignment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Total Cost (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="Service Bill"
                                        value={serviceForm.totalCost}
                                        onChange={(e) => setServiceForm({ ...serviceForm, totalCost: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-poppins"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Odometer Reading (km)</label>
                                    <input
                                        type="number"
                                        value={serviceForm.odometerReading}
                                        onChange={(e) => setServiceForm({ ...serviceForm, odometerReading: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Garage / Workshop Name</label>
                                <input
                                    type="text"
                                    value={serviceForm.garageName}
                                    onChange={(e) => setServiceForm({ ...serviceForm, garageName: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Service Notes / Replaced Parts</label>
                                <textarea
                                    rows="2"
                                    value={serviceForm.notes}
                                    onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <p className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg font-bold">
                                🔒 Single Source of Truth: This will automatically record an Expense in the company finance ledger under category 'machinery' & costType 'transportation'.
                            </p>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowServiceModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Save Service Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════ MODAL: LOG TRIP ═══════════ */}
            {showTripModal && selectedVehicle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Vehicle Trip</h3>
                                <p className="text-xs text-slate-500">{selectedVehicle.registrationNumber}</p>
                            </div>
                            <button onClick={() => setShowTripModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordTrip} className="space-y-3.5">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Linked Project (Optional)</label>
                                <select
                                    value={tripForm.projectId}
                                    onChange={(e) => setTripForm({ ...tripForm, projectId: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="">General Delivery / Internal</option>
                                    {projects.map(p => (
                                        <option key={p._id} value={p._id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Destination / Site Location *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Palakkad Commercial Site"
                                    value={tripForm.destination}
                                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Start Odometer (km)</label>
                                    <input
                                        type="number"
                                        value={tripForm.startOdometer}
                                        onChange={(e) => setTripForm({ ...tripForm, startOdometer: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">End Odometer (if completed)</label>
                                    <input
                                        type="number"
                                        value={tripForm.endOdometer}
                                        onChange={(e) => setTripForm({ ...tripForm, endOdometer: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="trip-completed-check"
                                    checked={tripForm.isCompleted}
                                    onChange={(e) => setTripForm({ ...tripForm, isCompleted: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="trip-completed-check" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Trip already completed
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowTripModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Save Trip
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFleet;
