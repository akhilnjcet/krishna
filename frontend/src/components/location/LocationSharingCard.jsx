import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { 
    Navigation, MapPin, ShieldCheck, AlertCircle, RefreshCw, 
    WifiOff, Battery, BatteryCharging, Zap, Power, HelpCircle, 
    Smartphone, CheckCircle2, X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// Detect client platform
const detectPlatform = () => {
    if (typeof window === 'undefined') return 'desktop';
    if (Capacitor.isNativePlatform()) return 'capacitor_apk';
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'mobile_browser';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'mobile_browser';
    return 'browser';
};

const LocationSharingCard = ({ userRole = 'staff', onStatusChange }) => {
    const [isSharing, setIsSharing] = useState(false);
    const [starting, setStarting] = useState(false);
    const [lastCoords, setLastCoords] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [speed, setSpeed] = useState(null);
    const [batteryInfo, setBatteryInfo] = useState({ level: null, isCharging: false });
    const [errorMsg, setErrorMsg] = useState('');
    const [showPermissionGuide, setShowPermissionGuide] = useState(false);
    const [timeAgo, setTimeAgo] = useState('');

    const watchIdRef = useRef(null);
    const timerRef = useRef(null);
    const timeAgoTimerRef = useRef(null);
    const isSharingRef = useRef(false);

    // Synchronize isSharingRef
    useEffect(() => {
        isSharingRef.current = isSharing;
    }, [isSharing]);

    // Check battery level if Battery Status API is available
    const updateBattery = useCallback(async () => {
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            try {
                const batt = await navigator.getBattery();
                setBatteryInfo({
                    level: Math.round(batt.level * 100),
                    isCharging: batt.charging
                });
            } catch {
                // Battery API not supported or restricted
            }
        }
    }, []);

    // Check existing server-side location sharing state
    useEffect(() => {
        fetchLocationStatus();
        updateBattery();

        // Time ago updater every 10s
        timeAgoTimerRef.current = setInterval(() => {
            if (lastUpdate) {
                const seconds = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
                if (seconds < 15) setTimeAgo('Just now');
                else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
                else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
            }
        }, 10000);

        return () => {
            if (timeAgoTimerRef.current) clearInterval(timeAgoTimerRef.current);
            stopLocationWatch();
        };
    }, []);

    const fetchLocationStatus = async () => {
        try {
            const res = await api.get('/location/status');
            if (res.data?.success && res.data.location) {
                const loc = res.data.location;
                if (loc.isSharing) {
                    setIsSharing(true);
                    setLastCoords(loc.coords);
                    setLastUpdate(new Date(loc.lastUpdated));
                    setAccuracy(loc.accuracy);
                    // Automatically restart local watcher if server has active sharing session
                    startLocationWatch();
                }
            }
        } catch (err) {
            console.warn('Location status check:', err.message);
        }
    };

    // Push coordinates to backend
    const pushLocationToServer = async (position) => {
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
        setLastCoords({ lat: latitude, lng: longitude });
        setAccuracy(accuracy ? Math.round(accuracy) : null);
        setSpeed(speed ? Number((speed * 3.6).toFixed(1)) : 0); // Convert m/s to km/h
        const now = new Date();
        setLastUpdate(now);
        setTimeAgo('Just now');
        setErrorMsg('');

        try {
            await updateBattery();
            await api.post('/location/update', {
                lat: latitude,
                lng: longitude,
                accuracy,
                speed,
                heading,
                altitude,
                batteryLevel: batteryInfo.level,
                isCharging: batteryInfo.isCharging,
                source: detectPlatform()
            });
            if (onStatusChange) onStatusChange({ isSharing: true, coords: { lat: latitude, lng: longitude } });
        } catch (err) {
            console.warn('Push location failed:', err.message);
            if (!navigator.onLine) {
                setErrorMsg('Network paused. Coordinates will sync once connection recovers.');
            }
        }
    };

    // Start geolocation watcher
    const startLocationWatch = () => {
        if (!('geolocation' in navigator)) {
            setErrorMsg('Geolocation is not supported by your device or browser.');
            setIsSharing(false);
            return;
        }

        stopLocationWatch();

        // 1. One immediate position capture
        navigator.geolocation.getCurrentPosition(
            (pos) => pushLocationToServer(pos),
            (err) => handleLocationError(err),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
        );

        // 2. Continuous watch with battery-efficient options
        try {
            const id = navigator.geolocation.watchPosition(
                (pos) => {
                    if (isSharingRef.current) {
                        pushLocationToServer(pos);
                    }
                },
                (err) => handleLocationError(err),
                {
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 20000
                }
            );
            watchIdRef.current = id;
        } catch (watchErr) {
            console.warn('watchPosition fallback to interval:', watchErr);
        }

        // 3. Fallback heartbeat interval every 25 seconds for reliable updates
        timerRef.current = setInterval(() => {
            if (isSharingRef.current && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => pushLocationToServer(pos),
                    (err) => console.warn('Periodic GPS tick:', err.message),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
                );
            }
        }, 25000);
    };

    const stopLocationWatch = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleLocationError = (err) => {
        console.error('GPS error:', err);
        if (err.code === 1) { // PERMISSION_DENIED
            setErrorMsg('Location permission was denied. Tap "Troubleshoot" below to allow GPS access.');
            setShowPermissionGuide(true);
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
            setErrorMsg('GPS signal weak or unavailable. Move towards an open area or enable High Accuracy.');
        } else if (err.code === 3) { // TIMEOUT
            setErrorMsg('GPS request timed out. Retrying automatically...');
        } else {
            setErrorMsg(err.message || 'Unable to retrieve location.');
        }
    };

    // User triggers Start Sharing
    const handleStartSharing = async () => {
        setStarting(true);
        setErrorMsg('');
        setShowPermissionGuide(false);

        if (!('geolocation' in navigator)) {
            setErrorMsg('Geolocation is not supported by this browser.');
            setStarting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setIsSharing(true);
                isSharingRef.current = true;
                setStarting(false);
                await pushLocationToServer(pos);
                startLocationWatch();
            },
            (err) => {
                setStarting(false);
                handleLocationError(err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    // User triggers Stop Sharing
    const handleStopSharing = async () => {
        stopLocationWatch();
        setIsSharing(false);
        isSharingRef.current = false;
        try {
            await api.post('/location/stop');
            if (onStatusChange) onStatusChange({ isSharing: false, coords: null });
        } catch (err) {
            console.warn('Stop location sharing notification:', err.message);
        }
    };

    const platform = detectPlatform();

    return (
        <div className={`p-4 sm:p-5 rounded-3xl border transition shadow-sm space-y-4 ${
            isSharing 
                ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 relative transition-transform ${
                        isSharing 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                        <Navigation className={`w-5 h-5 ${isSharing ? 'animate-pulse' : ''}`} />
                        {isSharing && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-slate-900 animate-ping"></span>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Live Field Location Sharing
                            </h3>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isSharing 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' 
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}>
                                {isSharing ? 'Sharing Active' : 'Sharing Off'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {isSharing 
                                ? 'Your live location is visible to authorized project managers and logistics dispatch.'
                                : 'Share your real-time position during shift or transit for safety and route visibility.'}
                        </p>
                    </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {isSharing ? (
                        <button
                            type="button"
                            onClick={handleStopSharing}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition"
                        >
                            <Power className="w-3.5 h-3.5" /> Stop Sharing
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleStartSharing}
                            disabled={starting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition disabled:opacity-50"
                        >
                            {starting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                            <span>{starting ? 'Acquiring GPS...' : 'Start Sharing'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error & Permission Notification */}
            {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">{errorMsg}</p>
                            <p className="text-[11px] opacity-80 mt-0.5">Please check location toggles in phone settings or browser address bar.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                        className="text-[11px] font-black underline hover:text-rose-900 dark:hover:text-rose-100 shrink-0"
                    >
                        {showPermissionGuide ? 'Close' : 'Troubleshoot'}
                    </button>
                </div>
            )}

            {/* Permission Troubleshooting Guide */}
            {showPermissionGuide && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase text-[10px] flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-blue-500" /> Enabling Location Access
                        </span>
                        <button onClick={() => setShowPermissionGuide(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <ul className="text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 text-[11px]">
                        <li><strong>Android Chrome / Edge:</strong> Tap the lock icon 🔒 in the address bar → Tap <em>Permissions</em> → Change <em>Location</em> to <strong>Allow</strong>.</li>
                        <li><strong>iPhone Safari:</strong> Tap <em>aA</em> in address bar → <em>Website Settings</em> → <em>Location</em> → <strong>Allow</strong>.</li>
                        <li><strong>Installed Mobile App:</strong> Open phone <em>Settings</em> → <em>Apps</em> → <em>Krishna ERP</em> → <em>Permissions</em> → <em>Location</em> → <strong>Allow while using app</strong>.</li>
                    </ul>
                </div>
            )}

            {/* Live Telemetry Bar if sharing */}
            {isSharing && lastCoords && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 text-xs">
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Coordinates</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            {lastCoords.lat.toFixed(5)}°, {lastCoords.lng.toFixed(5)}°
                        </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Accuracy</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            ±{accuracy || 10} meters
                        </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Ping</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate mt-0.5">
                            {timeAgo || 'Just now'}
                        </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Battery & Mode</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5 flex items-center gap-1">
                            {batteryInfo.isCharging ? <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" /> : <Battery className="w-3.5 h-3.5 text-slate-500" />}
                            {batteryInfo.level !== null ? `${batteryInfo.level}%` : 'Normal'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationSharingCard;
