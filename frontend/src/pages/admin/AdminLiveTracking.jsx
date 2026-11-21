import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { getSocket } from '../../utils/socket';
import { openGoogleMapsNavigation } from '../../utils/mapsUtil';
import { 
    Navigation, MapPin, Truck, User, Search, RefreshCw, 
    ShieldCheck, AlertTriangle, Phone, ExternalLink, Battery, 
    BatteryCharging, Compass, Crosshair, ChevronRight, X, 
    Filter, Clock, CheckCircle2, ShieldAlert, Sparkles, Activity
} from 'lucide-react';

// Default map view: Palakkad & central Kerala region (Krishna Engineering Works hub)
const DEFAULT_CENTER = { lat: 10.9022, lng: 76.3768, zoom: 11 };

// Helper to create custom HTML markers for personnel
const createPersonnelPin = (person) => {
    const isDriver = person.role === 'driver';
    const isLive = person.freshness === 'live';
    const isStale = person.freshness === 'stale';
    
    // Color scheme
    let bgColor = '#3b82f6'; // blue for staff
    if (isDriver) bgColor = '#10b981'; // emerald for driver
    if (isStale) bgColor = '#f59e0b'; // amber for stale
    if (!person.isSharing || person.freshness === 'stopped' || person.freshness === 'offline') {
        bgColor = '#64748b'; // slate for stopped
    }

    const pulseRing = isLive ? `
        <div style="
            position: absolute;
            top: -6px;
            left: -6px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid ${bgColor};
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            opacity: 0.6;
            pointer-events: none;
        "></div>
    ` : '';

    const labelBadge = person.dutyStatus?.vehicleRegistration || person.staff_id || person.name.slice(0, 8);

    return L.divIcon({
        className: 'personnel-map-marker',
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42],
        html: `
            <div style="position: relative; width: 36px; height: 42px;">
                ${pulseRing}
                <div style="
                    background: ${bgColor};
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                    border: 2px solid white;
                    font-weight: 900;
                    font-size: 11px;
                ">
                    <span style="transform: rotate(45deg);">${isDriver ? '🚛' : '👷'}</span>
                </div>
                <div style="
                    position: absolute;
                    bottom: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 23, 42, 0.88);
                    color: white;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 1px 6px;
                    border-radius: 9999px;
                    white-space: nowrap;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    max-width: 90px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                ">
                    ${labelBadge}
                </div>
            </div>
        `
    });
};

const AdminLiveTracking = () => {
    const [locations, setLocations] = useState([]);
    const [summary, setSummary] = useState({ total: 0, live: 0, stale: 0, stopped: 0, drivers: 0, staff: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'driver' | 'staff'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'stale' | 'stopped'
    const [trailLoading, setTrailLoading] = useState(false);
    const [showingTrail, setShowingTrail] = useState(false);

    // Map refs
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef(new Map());
    const trailPolylineRef = useRef(null);

    // 1. Fetch live locations from API
    const fetchLocations = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const res = await api.get('/location/live-all');
            if (res.data?.success) {
                setLocations(res.data.locations || []);
                setSummary(res.data.summary || { total: 0, live: 0, stale: 0, stopped: 0, drivers: 0, staff: 0 });
            }
        } catch (err) {
            console.error('Fetch live locations error:', err);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // 2. Initialize Map once container is mounted
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
            zoom: DEFAULT_CENTER.zoom,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapInstanceRef.current = map;
    }, []);

    // 3. Socket.IO Real-Time Engine & Periodic Polling
    useEffect(() => {
        fetchLocations();

        // Connect Socket.IO
        const socket = getSocket();
        if (socket) {
            socket.connect();
            socket.emit('join-room', 'admin');

            // Handle real-time position updates
            const handleLiveUpdate = (updatedLoc) => {
                setLocations(prev => {
                    const idx = prev.findIndex(p => p.userId === updatedLoc.userId || p._id === updatedLoc._id);
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], ...updatedLoc, freshness: 'live' };
                        return copy;
                    }
                    return [updatedLoc, ...prev];
                });
            };

            // Handle real-time stop events
            const handleLiveStopped = (data) => {
                setLocations(prev => prev.map(p => {
                    if (p.userId === data.userId || String(p.userId) === String(data.userId)) {
                        return { ...p, isSharing: false, freshness: 'stopped' };
                    }
                    return p;
                }));
            };

            socket.on('live-location-update', handleLiveUpdate);
            socket.on('live-location-stopped', handleLiveStopped);

            return () => {
                socket.off('live-location-update', handleLiveUpdate);
                socket.off('live-location-stopped', handleLiveStopped);
            };
        }

        // Heartbeat polling fallback every 20s
        const interval = setInterval(() => {
            fetchLocations(true);
        }, 20000);

        return () => clearInterval(interval);
    }, [fetchLocations]);

    // 4. Synchronize Leaflet markers with filtered locations
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const activeIds = new Set();

        // Filter locations based on query, role, and freshness
        const filtered = locations.filter(person => {
            if (roleFilter !== 'all' && person.role !== roleFilter) return false;
            if (statusFilter !== 'all' && person.freshness !== statusFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = person.name?.toLowerCase().includes(q);
                const matchCode = person.staff_id?.toLowerCase().includes(q);
                const matchPhone = person.phone?.toLowerCase().includes(q);
                const matchVehicle = person.dutyStatus?.vehicleRegistration?.toLowerCase().includes(q);
                const matchDest = person.dutyStatus?.destination?.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchPhone && !matchVehicle && !matchDest) return false;
            }
            return true;
        });

        // Add or update markers
        filtered.forEach(person => {
            if (!person.coords || isNaN(person.coords.lat) || isNaN(person.coords.lng)) return;

            const markerKey = String(person.userId || person._id);
            activeIds.add(markerKey);

            let marker = markersRef.current.get(markerKey);
            if (!marker) {
                marker = L.marker([person.coords.lat, person.coords.lng], {
                    icon: createPersonnelPin(person)
                }).addTo(map);

                marker.on('click', () => {
                    setSelectedPerson(person);
                });

                markersRef.current.set(markerKey, marker);
            } else {
                // Smooth transition of position
                marker.setLatLng([person.coords.lat, person.coords.lng]);
                marker.setIcon(createPersonnelPin(person));
            }
        });

        // Remove markers that no longer match filters
        markersRef.current.forEach((marker, key) => {
            if (!activeIds.has(key)) {
                map.removeLayer(marker);
                markersRef.current.delete(key);
            }
        });
    }, [locations, roleFilter, statusFilter, searchQuery]);

    // 5. Fit bounds to all active personnel
    const handleFitAll = () => {
        const map = mapInstanceRef.current;
        if (!map || markersRef.current.size === 0) return;

        const group = L.featureGroup(Array.from(markersRef.current.values()));
        map.fitBounds(group.getBounds().pad(0.15));
    };

    // 6. Focus on a specific selected person
    const handleFocusPerson = (person) => {
        setSelectedPerson(person);
        const map = mapInstanceRef.current;
        if (map && person.coords?.lat && person.coords?.lng) {
            map.flyTo([person.coords.lat, person.coords.lng], 16, { duration: 1.2 });
        }
    };

    // 7. Load Breadcrumb Trail for Selected Person
    const handleToggleTrail = async () => {
        const map = mapInstanceRef.current;
        if (!map || !selectedPerson) return;

        if (showingTrail) {
            if (trailPolylineRef.current) {
                map.removeLayer(trailPolylineRef.current);
                trailPolylineRef.current = null;
            }
            setShowingTrail(false);
            return;
        }

        try {
            setTrailLoading(true);
            const res = await api.get(`/location/user/${selectedPerson.userId || selectedPerson._id}/trail`);
            if (res.data?.success && res.data.trail?.length > 0) {
                const latLngs = res.data.trail.map(p => [p.lat, p.lng]);
                if (trailPolylineRef.current) {
                    map.removeLayer(trailPolylineRef.current);
                }
                const poly = L.polyline(latLngs, {
                    color: selectedPerson.role === 'driver' ? '#10b981' : '#3b82f6',
                    weight: 4,
                    dashArray: '6, 8',
                    lineJoin: 'round'
                }).addTo(map);

                trailPolylineRef.current = poly;
                map.fitBounds(poly.getBounds().pad(0.2));
                setShowingTrail(true);
            } else {
                alert('No recent location history breadcrumbs recorded yet for this user.');
            }
        } catch (err) {
            console.error('Fetch trail error:', err);
            alert('Failed to load route trail: ' + (err.response?.data?.message || err.message));
        } finally {
            setTrailLoading(false);
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header Title & Refresh Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                        <Navigation className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Live Field & Fleet Location Tracking
                            </h1>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Real-time geospatial monitoring of authorized on-duty staff, logistics drivers, and field assets
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleFitAll}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                        title="Fit All Markers to Screen"
                    >
                        <Crosshair className="w-3.5 h-3.5" /> Fit All
                    </button>
                    <button
                        onClick={() => fetchLocations(false)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 block truncate">Total Tracked</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{summary.total || locations.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-500 block truncate">Live Pings (&lt;5m)</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 animate-pulse">{summary.live || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-500 block truncate">Stale Signal</span>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{summary.stale || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 block truncate">Sharing Stopped</span>
                    <p className="text-xl font-black text-slate-500 dark:text-slate-400 mt-0.5">{summary.stopped || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-blue-500 block truncate">Fleet Drivers</span>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{summary.drivers || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-500 block truncate">Operations Staff</span>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{summary.staff || 0}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by name, employee code, vehicle reg, destination, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300"
                    >
                        <option value="all">All Roles</option>
                        <option value="driver">Fleet Drivers Only</option>
                        <option value="staff">Staff Only</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300"
                    >
                        <option value="all">All Freshness</option>
                        <option value="live">Live (&lt;5m)</option>
                        <option value="stale">Stale (5-30m)</option>
                        <option value="stopped">Stopped / Offline</option>
                    </select>
                </div>
            </div>

            {/* Main Interactive Map & Details Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left/Center: Interactive Map Container */}
                <div className="lg:col-span-2 relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[460px] lg:min-h-[600px] flex flex-col">
                    <div ref={mapContainerRef} className="w-full h-full flex-1 z-10" />

                    {/* Live overlay banner */}
                    <div className="absolute top-3 left-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 shadow-md flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>OpenStreetMap Engine · Auto-Sync Active</span>
                    </div>
                </div>

                {/* Right: Personnel Roster & Detail Inspector */}
                <div className="space-y-4">
                    {/* Selected Person Card / Inspector */}
                    {selectedPerson ? (
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-900/60 shadow-lg space-y-4 animate-in fade-in">
                            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                                        selectedPerson.role === 'driver' ? 'bg-emerald-600' : 'bg-blue-600'
                                    }`}>
                                        {selectedPerson.name ? selectedPerson.name.charAt(0).toUpperCase() : '👤'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                                                {selectedPerson.name}
                                            </h3>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                selectedPerson.role === 'driver' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                            }`}>
                                                {selectedPerson.role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {selectedPerson.staff_id ? `ID: ${selectedPerson.staff_id} • ` : ''}{selectedPerson.department || 'Operations'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPerson(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Status and Freshness Badges */}
                            <div className="flex items-center justify-between text-xs">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                                    selectedPerson.freshness === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' :
                                    selectedPerson.freshness === 'stale' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300' :
                                    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                    {selectedPerson.freshness === 'live' ? '🟢 Live Signal' :
                                     selectedPerson.freshness === 'stale' ? '🟡 Stale (>5m)' : '⚪ Inactive / Stopped'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(selectedPerson.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>

                            {/* Telemetry Metrics */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Position</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                                        {selectedPerson.coords?.lat?.toFixed(5)}°, {selectedPerson.coords?.lng?.toFixed(5)}°
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Accuracy & Speed</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                                        ±{selectedPerson.accuracy || 10}m • {selectedPerson.speed ? `${selectedPerson.speed} km/h` : '0 km/h'}
                                    </span>
                                </div>
                            </div>

                            {/* Active Trip Info if Driver */}
                            {selectedPerson.dutyStatus?.activeTripNumber && (
                                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
                                    <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 block">
                                        Active Delivery Trip: {selectedPerson.dutyStatus.activeTripNumber}
                                    </span>
                                    <p className="text-slate-700 dark:text-slate-300 font-bold">
                                        Vehicle: {selectedPerson.dutyStatus.vehicleRegistration || 'Assigned Transport'}
                                    </p>
                                    {selectedPerson.dutyStatus.destination && (
                                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                            Destination: <strong>{selectedPerson.dutyStatus.destination}</strong>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions row: Call & Google Maps Navigation */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {selectedPerson.phone ? (
                                    <a
                                        href={`tel:${selectedPerson.phone}`}
                                        className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                                    >
                                        <Phone className="w-3.5 h-3.5 text-blue-500" /> Call
                                    </a>
                                ) : (
                                    <button
                                        disabled
                                        className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800/40 text-slate-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                                    >
                                        No Phone
                                    </button>
                                )}

                                <button
                                    onClick={() => openGoogleMapsNavigation({
                                        destinationLocation: selectedPerson.coords,
                                        destination: selectedPerson.name + ' Live Location'
                                    })}
                                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition"
                                >
                                    <MapPin className="w-3.5 h-3.5" /> Navigate
                                </button>
                            </div>

                            {/* Toggle Trail Button */}
                            <button
                                onClick={handleToggleTrail}
                                disabled={trailLoading}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                                <Compass className={`w-3.5 h-3.5 ${trailLoading ? 'animate-spin' : ''}`} />
                                <span>{showingTrail ? 'Hide Breadcrumb Trail' : 'Show Route History Trail'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center py-8 space-y-2">
                            <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                Select Personnel or Marker
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                Click any map marker or tap a person below to inspect coordinates, telemetry, vehicle status and route breadcrumbs.
                            </p>
                        </div>
                    )}

                    {/* Personnel List Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 max-h-[420px] overflow-y-auto">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Active Personnel ({locations.length})
                            </h3>
                            <span className="text-[10px] text-slate-400 font-bold">Auto-updates</span>
                        </div>

                        {locations.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 font-bold">
                                No active field locations recorded yet. Staff and drivers can start sharing from their dashboards.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {locations.map(p => {
                                    const isSelected = selectedPerson && (selectedPerson.userId === p.userId || selectedPerson._id === p._id);
                                    return (
                                        <div
                                            key={p._id || p.userId}
                                            onClick={() => handleFocusPerson(p)}
                                            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30' 
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                                                    p.role === 'driver' ? 'bg-emerald-600' : 'bg-blue-600'
                                                }`}>
                                                    {p.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                            {p.name}
                                                        </h4>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                            ({p.role})
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {p.dutyStatus?.vehicleRegistration || p.department || 'On Duty'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    p.freshness === 'live' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    p.freshness === 'stale' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {p.freshness}
                                                </span>
                                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                                    {p.timeSinceUpdateMinutes !== undefined ? `${p.timeSinceUpdateMinutes}m ago` : 'Recent'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLiveTracking;
