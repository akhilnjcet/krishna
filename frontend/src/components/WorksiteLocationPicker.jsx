import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Navigation, MapPin, Search, Crosshair, Check, 
    Copy, ExternalLink, Loader2, AlertCircle, ShieldCheck, 
    RefreshCw, Sparkles, CheckCircle2, Settings, HelpCircle,
    ChevronDown, ChevronUp, Smartphone, Monitor, Globe, Info
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

// Detect runtime environment / operating platform
const detectPlatform = () => {
    if (typeof window === 'undefined') return 'desktop';
    if (Capacitor.isNativePlatform()) return 'mobile_app';
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios_safari';
    if (/Android/i.test(ua)) return 'android_chrome';
    return 'desktop';
};

// Platform-specific instructions for enabling location permissions
const PLATFORM_GUIDES = {
    android_chrome: {
        id: 'android_chrome',
        label: 'Android Chrome',
        icon: Smartphone,
        subtitle: 'Chrome / Edge / Firefox on Android',
        steps: [
            { num: '1', title: 'Tap Site Info', desc: 'Tap the lock or tune icon 🔒 (or 3-dot menu ⋮) beside the URL in the address bar.' },
            { num: '2', title: 'Open Permissions', desc: 'Tap "Permissions" or "Site settings".' },
            { num: '3', title: 'Allow Location', desc: 'Select "Location" and change it to "Allow".' },
            { num: '4', title: 'Return & Try Again', desc: 'Return to this page and tap "Try Again" below without refreshing.' }
        ]
    },
    ios_safari: {
        id: 'ios_safari',
        label: 'iPhone Safari',
        icon: Smartphone,
        subtitle: 'Safari & Browsers on iPhone/iPad',
        steps: [
            { num: '1', title: 'Safari Website Settings', desc: 'Tap the "aA" (or website settings) icon on the left of the Safari search/address bar.' },
            { num: '2', title: 'Allow Location', desc: 'Tap "Website Settings" → "Location" → choose "Allow".' },
            { num: '3', title: 'Device Settings Check', desc: 'If still blocked, open iPhone Settings → Privacy & Security → Location Services (turn ON) → Safari Websites → choose "While Using the App".' },
            { num: '4', title: 'Return & Try Again', desc: 'Return to Safari and tap "Try Again" below.' }
        ]
    },
    desktop: {
        id: 'desktop',
        label: 'Desktop Browsers',
        icon: Monitor,
        subtitle: 'Chrome, Edge, Firefox, Safari on PC/Mac',
        steps: [
            { num: '1', title: 'Click Site Settings / Padlock', desc: 'Click the padlock 🔒 or tune icon on the left side of your browser address bar.' },
            { num: '2', title: 'Locate Location', desc: 'Find "Location" in the permissions list (or click "Site settings").' },
            { num: '3', title: 'Change to Allow', desc: 'Change the permission setting from "Blocked" or "Ask" to "Allow".' },
            { num: '4', title: 'Return & Try Again', desc: 'Return here and click "Try Again" below.' }
        ]
    },
    mobile_app: {
        id: 'mobile_app',
        label: 'Mobile App',
        icon: ShieldCheck,
        subtitle: 'Krishna Engineering Works Installed Mobile App',
        steps: [
            { num: '1', title: 'Open Device Settings', desc: 'Open your phone\'s Settings app.' },
            { num: '2', title: 'Find App Permissions', desc: 'Go to Apps (or Application Manager) → select "Krishna Engineering Works".' },
            { num: '3', title: 'Grant Location Access', desc: 'Tap "Permissions" → "Location" → choose "Allow only while using the app" and enable "Use Precise Location".' },
            { num: '4', title: 'Return & Try Again', desc: 'Switch back to the app and tap "Try Again".' }
        ]
    }
};

// Default center: Krishna Engineering Works region (Palakkad / Sreekrishnapuram, Kerala)
const DEFAULT_CENTER = { lat: 10.9022, lng: 76.3768, zoom: 12 };

const createCustomPin = (source = 'manual') => {
    const isGps = source === 'gps';
    const isSearch = source === 'search';
    const color = isGps ? '#10b981' : (isSearch ? '#3b82f6' : '#6366f1');
    const pulseRing = isGps 
        ? `<div style="position: absolute; top: -6px; left: -6px; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #10b981; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.6; pointer-events: none;"></div>` 
        : '';

    return L.divIcon({
        className: 'custom-worksite-marker',
        html: `
            <div style="position: relative; width: 38px; height: 42px; transform: translate(-50%, -100%);">
                ${pulseRing}
                <div style="
                    background: ${color};
                    color: white;
                    width: 38px;
                    height: 38px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.35);
                    border: 3px solid #ffffff;
                ">
                    <svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        ${isGps 
                            ? '<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>'
                            : '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>'
                        }
                    </svg>
                </div>
                <div style="
                    width: 14px;
                    height: 5px;
                    background: rgba(0,0,0,0.35);
                    border-radius: 50%;
                    margin: 2px auto 0;
                    filter: blur(1.5px);
                "></div>
            </div>
        `,
        iconSize: [38, 42],
        iconAnchor: [19, 42],
        popupAnchor: [0, -42]
    });
};

const WorksiteLocationPicker = ({ value, onChange, disabled = false }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const accuracyCircleRef = useRef(null);
    const userExplicitGpsRequestedRef = useRef(false);

    const [locationData, setLocationData] = useState({
        address: value?.address || '',
        latitude: value?.latitude ?? null,
        longitude: value?.longitude ?? null,
        source: value?.source || 'none', // 'gps' | 'manual' | 'search' | 'none'
        accuracy: value?.accuracy ?? null,
        capturedAt: value?.capturedAt || null
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResultsDropdown, setShowResultsDropdown] = useState(false);
    const [isLocatingGPS, setIsLocatingGPS] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [activePlatformTab, setActivePlatformTab] = useState(detectPlatform);
    const [permissionRestoredToast, setPermissionRestoredToast] = useState(false);
    const [copied, setCopied] = useState(false);

    // Keep internal state synchronized with incoming props if external value changes
    useEffect(() => {
        if (value) {
            setLocationData(prev => ({
                address: value.address ?? prev.address ?? '',
                latitude: value.latitude ?? prev.latitude ?? null,
                longitude: value.longitude ?? prev.longitude ?? null,
                source: value.source ?? prev.source ?? 'none',
                accuracy: value.accuracy ?? prev.accuracy ?? null,
                capturedAt: value.capturedAt ?? prev.capturedAt ?? null
            }));
        }
    }, [value?.latitude, value?.longitude, value?.address, value?.source]);

    // Reverse geocode via OpenStreetMap Nominatim
    const reverseGeocode = useCallback(async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!res.ok) return null;
            const data = await res.json();
            return data.display_name || '';
        } catch (err) {
            console.warn('Reverse geocode failed:', err);
            return null;
        }
    }, []);

    // Update location and notify parent
    const updateLocation = useCallback((updates) => {
        setLocationData(prev => {
            const next = { ...prev, ...updates };
            if (onChange) {
                onChange(next);
            }
            return next;
        });
    }, [onChange]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapInstanceRef.current) return; // Map already initialized

        const initialLat = locationData.latitude ?? DEFAULT_CENTER.lat;
        const initialLng = locationData.longitude ?? DEFAULT_CENTER.lng;
        const initialZoom = locationData.latitude ? 15 : DEFAULT_CENTER.zoom;

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: initialZoom,
            zoomControl: true,
            attributionControl: true
        });

        // High contrast OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // If coordinates already exist, place initial marker
        if (locationData.latitude !== null && locationData.longitude !== null) {
            const marker = L.marker([locationData.latitude, locationData.longitude], {
                draggable: !disabled,
                icon: createCustomPin(locationData.source)
            }).addTo(map);

            marker.on('dragend', async () => {
                const pos = marker.getLatLng();
                const lat = Number(pos.lat.toFixed(6));
                const lng = Number(pos.lng.toFixed(6));
                marker.setIcon(createCustomPin('manual'));
                
                const address = await reverseGeocode(lat, lng);
                updateLocation({
                    latitude: lat,
                    longitude: lng,
                    address: address || locationData.address,
                    source: 'manual',
                    accuracy: null,
                    capturedAt: new Date().toISOString()
                });
            });

            markerRef.current = marker;
        }

        // Click on map to place or reposition marker
        map.on('click', async (e) => {
            if (disabled) return;
            const lat = Number(e.latlng.lat.toFixed(6));
            const lng = Number(e.latlng.lng.toFixed(6));

            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.remove();
                accuracyCircleRef.current = null;
            }

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
                markerRef.current.setIcon(createCustomPin('manual'));
            } else {
                const marker = L.marker([lat, lng], {
                    draggable: !disabled,
                    icon: createCustomPin('manual')
                }).addTo(map);

                marker.on('dragend', async () => {
                    const pos = marker.getLatLng();
                    const newLat = Number(pos.lat.toFixed(6));
                    const newLng = Number(pos.lng.toFixed(6));
                    marker.setIcon(createCustomPin('manual'));
                    const addr = await reverseGeocode(newLat, newLng);
                    updateLocation({
                        latitude: newLat,
                        longitude: newLng,
                        address: addr || locationData.address,
                        source: 'manual',
                        accuracy: null,
                        capturedAt: new Date().toISOString()
                    });
                });

                markerRef.current = marker;
            }

            const address = await reverseGeocode(lat, lng);
            updateLocation({
                latitude: lat,
                longitude: lng,
                address: address || locationData.address || `Worksite (${lat}, ${lng})`,
                source: 'manual',
                accuracy: null,
                capturedAt: new Date().toISOString()
            });
        });

        // Trigger map resize after mounting
        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
            accuracyCircleRef.current = null;
        };
    }, []);

    // Sync marker position when locationData changes externally
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (locationData.latitude !== null && locationData.longitude !== null) {
            const lat = Number(locationData.latitude);
            const lng = Number(locationData.longitude);

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
                markerRef.current.setIcon(createCustomPin(locationData.source));
            } else {
                const marker = L.marker([lat, lng], {
                    draggable: !disabled,
                    icon: createCustomPin(locationData.source)
                }).addTo(map);

                marker.on('dragend', async () => {
                    const pos = marker.getLatLng();
                    const nLat = Number(pos.lat.toFixed(6));
                    const nLng = Number(pos.lng.toFixed(6));
                    marker.setIcon(createCustomPin('manual'));
                    const addr = await reverseGeocode(nLat, nLng);
                    updateLocation({
                        latitude: nLat,
                        longitude: nLng,
                        address: addr || locationData.address,
                        source: 'manual',
                        accuracy: null,
                        capturedAt: new Date().toISOString()
                    });
                });

                markerRef.current = marker;
            }
        }
    }, [locationData.latitude, locationData.longitude, locationData.source, disabled]);

    // "Use Current Location" (GPS) - Explicit user trigger only
    const handleUseCurrentLocation = useCallback(async (isRetry = false) => {
        // Enforce Privacy (Requirement 10): Mark that the user explicitly initiated a GPS request
        userExplicitGpsRequestedRef.current = true;
        setIsLocatingGPS(true);
        setGpsError('');
        setPermissionRestoredToast(false);

        // 1. Check for Secure Context (Requirement 9)
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setIsPermissionBlocked(false);
            setGpsError('Geolocation requires a secure connection (HTTPS). Please open this site over HTTPS or pin the location manually on the map.');
            setIsLocatingGPS(false);
            return;
        }

        try {
            let lat = null;
            let lng = null;
            let accuracy = null;

            // 2. Try Capacitor Geolocation if running in Native Mobile App (Requirement 8)
            if (Capacitor.isNativePlatform()) {
                try {
                    let perm = await Geolocation.checkPermissions();
                    if (perm.location === 'denied' || perm.coarseLocation === 'denied') {
                        // Attempt to request permission
                        try {
                            perm = await Geolocation.requestPermissions();
                        } catch (pErr) {
                            console.warn('Native permission request error:', pErr);
                        }
                    }

                    if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
                        const position = await Geolocation.getCurrentPosition({
                            enableHighAccuracy: true,
                            timeout: 12000
                        });
                        lat = position.coords.latitude;
                        lng = position.coords.longitude;
                        accuracy = position.coords.accuracy;
                    } else {
                        // Native permission permanently blocked
                        setIsPermissionBlocked(true);
                        setActivePlatformTab('mobile_app');
                        setGpsError('Location access is blocked. Enable location permission in your browser or device settings, then try again.');
                        setShowInstructions(true);
                        setIsLocatingGPS(false);
                        return;
                    }
                } catch (capErr) {
                    console.warn('Capacitor Geolocation error:', capErr);
                    const msg = capErr?.message?.toLowerCase() || '';
                    if (msg.includes('denied') || msg.includes('permission')) {
                        setIsPermissionBlocked(true);
                        setActivePlatformTab('mobile_app');
                        setGpsError('Location access is blocked. Enable location permission in your browser or device settings, then try again.');
                        setShowInstructions(true);
                        setIsLocatingGPS(false);
                        return;
                    }
                }
            }

            // 3. Web Geolocation API (Desktop Web and Mobile Web)
            if (lat === null) {
                if (typeof navigator === 'undefined' || !navigator.geolocation) {
                    throw new Error('GPS Geolocation is not supported by your browser or device. Please pin your worksite manually on the map.');
                }

                // If Permissions API is supported, check if state is already explicitly 'denied'
                if (navigator.permissions && navigator.permissions.query) {
                    try {
                        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
                        if (permStatus.state === 'denied') {
                            setIsPermissionBlocked(true);
                            setActivePlatformTab(detectPlatform());
                            setGpsError('Location access is blocked. Enable location permission in your browser or device settings, then try again.');
                            setShowInstructions(true);
                            setIsLocatingGPS(false);
                            return;
                        }
                    } catch (qErr) {
                        // permissions.query may fail in some environments; fallback gracefully
                    }
                }

                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        (err) => {
                            if (err.code === 1) { // PERMISSION_DENIED (Requirement 2)
                                setIsPermissionBlocked(true);
                                setActivePlatformTab(detectPlatform());
                                reject(new Error('Location access is blocked. Enable location permission in your browser or device settings, then try again.'));
                            } else if (err.code === 2) { // POSITION_UNAVAILABLE
                                setIsPermissionBlocked(false);
                                reject(new Error('GPS satellites or network location unavailable. Please verify GPS is turned ON or pin the worksite manually on the map.'));
                            } else if (err.code === 3) { // TIMEOUT
                                setIsPermissionBlocked(false);
                                reject(new Error('GPS location request timed out. Please tap "Try Again" or pin your worksite manually on the map.'));
                            } else {
                                setIsPermissionBlocked(false);
                                reject(new Error(err.message || 'Unable to acquire GPS location.'));
                            }
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 12000,
                            maximumAge: 0
                        }
                    );
                });

                lat = position.coords.latitude;
                lng = position.coords.longitude;
                accuracy = position.coords.accuracy;
            }

            // Successfully retrieved accurate coordinates (Requirement 7)
            setIsPermissionBlocked(false);
            setGpsError('');
            setShowInstructions(false);
            setPermissionRestoredToast(false);

            const cleanLat = Number(lat.toFixed(6));
            const cleanLng = Number(lng.toFixed(6));
            const cleanAcc = accuracy ? Math.round(accuracy) : null;

            const map = mapInstanceRef.current;
            if (map) {
                map.flyTo([cleanLat, cleanLng], 17, { duration: 1.2 });

                // Accuracy circle
                if (accuracyCircleRef.current) {
                    accuracyCircleRef.current.remove();
                }
                if (cleanAcc && cleanAcc < 500) {
                    accuracyCircleRef.current = L.circle([cleanLat, cleanLng], {
                        radius: cleanAcc,
                        color: '#10b981',
                        fillColor: '#10b981',
                        fillOpacity: 0.15,
                        weight: 1.5
                    }).addTo(map);
                }

                if (markerRef.current) {
                    markerRef.current.setLatLng([cleanLat, cleanLng]);
                    markerRef.current.setIcon(createCustomPin('gps'));
                } else {
                    const marker = L.marker([cleanLat, cleanLng], {
                        draggable: !disabled,
                        icon: createCustomPin('gps')
                    }).addTo(map);

                    marker.on('dragend', async () => {
                        const pos = marker.getLatLng();
                        const nLat = Number(pos.lat.toFixed(6));
                        const nLng = Number(pos.lng.toFixed(6));
                        marker.setIcon(createCustomPin('manual'));
                        const addr = await reverseGeocode(nLat, nLng);
                        updateLocation({
                            latitude: nLat,
                            longitude: nLng,
                            address: addr || locationData.address,
                            source: 'manual',
                            accuracy: null,
                            capturedAt: new Date().toISOString()
                        });
                    });

                    markerRef.current = marker;
                }
            }

            // Reverse geocode GPS location
            const address = await reverseGeocode(cleanLat, cleanLng);

            updateLocation({
                latitude: cleanLat,
                longitude: cleanLng,
                address: address || locationData.address || `GPS Tagged Location (${cleanLat}, ${cleanLng})`,
                source: 'gps',
                accuracy: cleanAcc,
                capturedAt: new Date().toISOString()
            });

        } catch (err) {
            setGpsError(err.message || 'Failed to detect current location.');
            if (err.message && err.message.includes('Location access is blocked')) {
                setIsPermissionBlocked(true);
                setShowInstructions(true);
            }
        } finally {
            setIsLocatingGPS(false);
        }
    }, [disabled, locationData.address, reverseGeocode, updateLocation]);

    // Automatic Permission Recovery (Requirement 5):
    // When the user switches to browser/device settings and returns,
    // detect that permission has been enabled and allow immediate retry or auto-recovery without page refresh.
    useEffect(() => {
        let permStatusObj = null;

        const checkAndRecoverPermission = async () => {
            // Only attempt recovery if permission was previously blocked or requested
            if (Capacitor.isNativePlatform()) {
                try {
                    const perm = await Geolocation.checkPermissions();
                    if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
                        if (isPermissionBlocked) {
                            setIsPermissionBlocked(false);
                            setGpsError('');
                            setPermissionRestoredToast(true);
                            if (userExplicitGpsRequestedRef.current) {
                                handleUseCurrentLocation(true);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Native permission recovery check error:', e);
                }
            } else if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({ name: 'geolocation' });
                    if (status.state === 'granted') {
                        if (isPermissionBlocked) {
                            setIsPermissionBlocked(false);
                            setGpsError('');
                            setPermissionRestoredToast(true);
                            if (userExplicitGpsRequestedRef.current) {
                                handleUseCurrentLocation(true);
                            }
                        }
                    } else if (status.state === 'prompt') {
                        // User reset the permission from blocked to prompt
                        if (isPermissionBlocked) {
                            setIsPermissionBlocked(false);
                            setGpsError('');
                        }
                    }
                } catch (e) {
                    // permissions.query may fail in some mobile browsers
                }
            }
        };

        // 1. Browser Permission Status Change Listener
        if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(status => {
                    permStatusObj = status;
                    permStatusObj.onchange = () => {
                        checkAndRecoverPermission();
                    };
                })
                .catch(() => {});
        }

        // 2. Window focus and document visibilitychange
        const handleFocus = () => {
            checkAndRecoverPermission();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAndRecoverPermission();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 3. Capacitor Native App State Listener
        let appStateHandle = null;
        if (Capacitor.isNativePlatform()) {
            App.addListener('appStateChange', (state) => {
                if (state.isActive) {
                    checkAndRecoverPermission();
                }
            }).then(handle => {
                appStateHandle = handle;
            }).catch(() => {});
        }

        return () => {
            if (permStatusObj) permStatusObj.onchange = null;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (appStateHandle && typeof appStateHandle.remove === 'function') {
                appStateHandle.remove();
            }
        };
    }, [isPermissionBlocked, handleUseCurrentLocation]);

    // Location Search (Nominatim)
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

        setIsSearching(true);
        setShowResultsDropdown(true);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!res.ok) throw new Error('Search request failed');
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSearchResult = (result) => {
        const lat = Number(parseFloat(result.lat).toFixed(6));
        const lng = Number(parseFloat(result.lon).toFixed(6));

        setShowResultsDropdown(false);
        setSearchQuery(result.display_name);

        const map = mapInstanceRef.current;
        if (map) {
            map.flyTo([lat, lng], 16, { duration: 1 });

            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.remove();
                accuracyCircleRef.current = null;
            }

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
                markerRef.current.setIcon(createCustomPin('search'));
            } else {
                const marker = L.marker([lat, lng], {
                    draggable: !disabled,
                    icon: createCustomPin('search')
                }).addTo(map);
                markerRef.current = marker;
            }
        }

        updateLocation({
            latitude: lat,
            longitude: lng,
            address: result.display_name,
            source: 'search',
            accuracy: null,
            capturedAt: new Date().toISOString()
        });
    };

    const handleAddressChange = (e) => {
        const newAddress = e.target.value;
        updateLocation({ address: newAddress });
    };

    const handleCopyCoordinates = () => {
        if (locationData.latitude !== null && locationData.longitude !== null) {
            const coordStr = `${locationData.latitude}, ${locationData.longitude}`;
            navigator.clipboard.writeText(coordStr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleOpenGoogleMaps = () => {
        if (locationData.latitude !== null && locationData.longitude !== null) {
            window.open(`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`, '_blank', 'noopener,noreferrer');
        }
    };

    const hasCoords = locationData.latitude !== null && locationData.longitude !== null;

    return (
        <div className="space-y-4">
            {/* Header controls: Search & GPS button */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <form onSubmit={handleSearch} className="flex">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search town, landmark, road or area..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!showResultsDropdown && e.target.value.length > 2) {
                                        setShowResultsDropdown(true);
                                    }
                                }}
                                onFocus={() => {
                                    if (searchResults.length > 0) setShowResultsDropdown(true);
                                }}
                                disabled={disabled}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-slate-700 text-brand-950 dark:text-white font-medium text-xs focus:border-brand-950 focus:ring-0 rounded-none shadow-[2px_2px_0_0_#d4d4d4] dark:shadow-none"
                            />
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        <button
                            type="submit"
                            disabled={disabled || isSearching}
                            className="px-4 bg-brand-950 text-white font-black text-xs uppercase tracking-wider hover:bg-brand-800 transition flex items-center justify-center border-2 border-brand-950"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </form>

                    {/* Search Results Dropdown */}
                    {showResultsDropdown && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border-2 border-brand-950 dark:border-slate-700 z-[1000] shadow-2xl max-h-56 overflow-y-auto">
                            {searchResults.map((res, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectSearchResult(res)}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-start gap-2.5 transition"
                                >
                                    <MapPin className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{res.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* "Use Current Location" (GPS) Button */}
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={disabled || isLocatingGPS}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 border-2 border-emerald-800 shadow-[2px_2px_0_0_#065f46] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                    {isLocatingGPS ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Detecting GPS...</span>
                        </>
                    ) : (
                        <>
                            <Crosshair className="w-4 h-4 text-white" />
                            <span>Use Current Location</span>
                        </>
                    )}
                </button>
            </div>

            {/* Permission Restored Notification (Requirement 5) */}
            {permissionRestoredToast && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center justify-between gap-2.5 shadow-[2px_2px_0_0_#059669]">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Location access restored! Fetching your exact worksite coordinates...</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleUseCurrentLocation(true)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider transition shrink-0"
                    >
                        Fetch Now
                    </button>
                </div>
            )}

            {/* GPS Error & Permission Guidance Block (Requirements 2, 3, 4, 6) */}
            {gpsError && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 rounded-none shadow-[2px_2px_0_0_#d97706] text-amber-900 dark:text-amber-100 space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs">
                            <div className="font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1">
                                {isPermissionBlocked ? 'GPS Permission Blocked' : 'Location Detection Notice'}
                            </div>
                            <p className="font-semibold leading-relaxed">
                                {gpsError}
                            </p>
                        </div>
                    </div>

                    {/* Action Controls: Try Again, Settings Guide, Manual Fallback */}
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center gap-2">
                        {/* Requirement 3: Try Again Button */}
                        <button
                            type="button"
                            onClick={() => handleUseCurrentLocation(true)}
                            disabled={disabled || isLocatingGPS}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-2 border-2 border-amber-800 shadow-[2px_2px_0_0_#78350f] active:translate-x-[1px] active:translate-y-[1px]"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                            <span>{isLocatingGPS ? 'Rechecking...' : 'Try Again'}</span>
                        </button>

                        {/* Requirement 4: How to Enable Instructions Toggle */}
                        {isPermissionBlocked && (
                            <button
                                type="button"
                                onClick={() => setShowInstructions(prev => !prev)}
                                className="px-3.5 py-2 bg-white dark:bg-slate-900 text-brand-950 dark:text-white hover:bg-brand-50 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 border-2 border-amber-600 shadow-[1px_1px_0_0_#d97706]"
                            >
                                <Settings className="w-3.5 h-3.5 text-amber-600" />
                                <span>{showInstructions ? 'Hide Instructions' : 'How to Enable Permission'}</span>
                                {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        )}

                        {/* Requirement 6: Manual Map Pin Fallback */}
                        <button
                            type="button"
                            onClick={() => {
                                if (mapContainerRef.current) {
                                    mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                            className="px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:text-brand-950 font-bold text-xs underline underline-offset-4 flex items-center gap-1.5 ml-auto"
                        >
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Pin worksite on map below</span>
                        </button>
                    </div>

                    {/* Requirement 4: Platform-Specific Instructions Drawer */}
                    {isPermissionBlocked && showInstructions && (
                        <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-800/80 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                                    <HelpCircle className="w-4 h-4 text-amber-600" />
                                    Choose Your Platform:
                                </span>
                                {/* Platform Switcher Tabs */}
                                <div className="inline-flex flex-wrap rounded-none border border-amber-300 dark:border-amber-800 p-0.5 bg-amber-100/60 dark:bg-amber-950/80 gap-1">
                                    {Object.values(PLATFORM_GUIDES).map(guide => {
                                        const IconComponent = guide.icon;
                                        const isActive = activePlatformTab === guide.id;
                                        return (
                                            <button
                                                key={guide.id}
                                                type="button"
                                                onClick={() => setActivePlatformTab(guide.id)}
                                                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                                                    isActive
                                                        ? 'bg-amber-600 text-white shadow-sm'
                                                        : 'text-amber-900 dark:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-900/50'
                                                }`}
                                            >
                                                <IconComponent className="w-3 h-3" />
                                                <span>{guide.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step list for selected platform */}
                            <div className="bg-white dark:bg-slate-900 p-3.5 border border-amber-400 dark:border-amber-700 text-xs">
                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
                                    <span>{PLATFORM_GUIDES[activePlatformTab]?.subtitle}</span>
                                    {activePlatformTab === detectPlatform() && (
                                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                                            (Auto-detected platform)
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2.5">
                                    {PLATFORM_GUIDES[activePlatformTab]?.steps.map((st, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {st.num}
                                            </span>
                                            <div>
                                                <span className="font-black text-brand-950 dark:text-white mr-1.5">{st.title}:</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{st.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    💡 After enabling in your browser/device settings, tap <strong>"Try Again"</strong> above. We automatically re-detect the permission without reloading the page or losing your form data.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Interactive Leaflet Map Container */}
            <div className="relative border-2 border-brand-950 dark:border-slate-700 shadow-[3px_3px_0_0_#0f172a] bg-slate-100 overflow-hidden">
                <div 
                    ref={mapContainerRef} 
                    className="w-full h-72 sm:h-80 z-0"
                    style={{ minHeight: '280px' }}
                />

                {/* Map Overlay Badge */}
                <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5 pointer-events-none">
                    {locationData.source === 'gps' && (
                        <div className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 border-2 border-white shadow-lg flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>GPS Verified {locationData.accuracy ? `(±${locationData.accuracy}m)` : ''}</span>
                        </div>
                    )}
                    {locationData.source === 'manual' && (
                        <div className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 border-2 border-white shadow-lg flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Manual Pin Placement</span>
                        </div>
                    )}
                    {locationData.source === 'search' && (
                        <div className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 border-2 border-white shadow-lg flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" />
                            <span>Address Search Tag</span>
                        </div>
                    )}
                </div>

                {/* Map Helper Instructions */}
                <div className="absolute bottom-2 left-2 bg-brand-950/85 backdrop-blur-sm text-white px-3 py-1 text-[10px] font-bold tracking-wider pointer-events-none z-[400]">
                    💡 Click anywhere or drag the pin to set the exact worksite
                </div>
            </div>

            {/* Formatted Address Field */}
            <div>
                <label className="block text-xs uppercase font-black text-brand-950 dark:text-slate-200 mb-1 tracking-widest flex items-center justify-between">
                    <span>Worksite Address / Landmark</span>
                    {hasCoords && (
                        <span className="text-[10px] font-bold text-slate-500 lowercase">
                            auto-detected & editable
                        </span>
                    )}
                </label>
                <textarea
                    rows={2}
                    value={locationData.address}
                    onChange={handleAddressChange}
                    placeholder="Exact worksite address, survey number, landmark or plot identification..."
                    disabled={disabled}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-slate-700 font-medium text-brand-950 dark:text-white text-xs rounded-none shadow-[2px_2px_0_0_#d4d4d4] dark:shadow-none focus:border-brand-950 focus:ring-0"
                />
            </div>

            {/* Coordinates Display & Quick Actions */}
            <div className="p-4 bg-brand-50 dark:bg-slate-800/80 border-2 border-brand-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-brand-950 text-white rounded-none border-2 border-brand-accent">
                        <MapPin className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                            GPS Coordinates
                        </div>
                        {hasCoords ? (
                            <div className="font-mono text-xs font-black text-brand-950 dark:text-white tracking-wider">
                                {locationData.latitude?.toFixed(6)}° N, {locationData.longitude?.toFixed(6)}° E
                            </div>
                        ) : (
                            <div className="text-xs font-bold text-slate-400 italic">
                                No GPS coordinate tagged yet — click map or use GPS
                            </div>
                        )}
                    </div>
                </div>

                {hasCoords && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleCopyCoordinates}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 hover:border-brand-950 text-brand-950 dark:text-white font-bold text-[11px] uppercase tracking-wider transition flex items-center gap-1.5"
                        >
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copied!' : 'Copy Coords'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenGoogleMaps}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-indigo-800"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View on Google Maps</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Privacy notice */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                🔒 <strong>Privacy Assurance:</strong> GPS coordinates are only accessed when you explicitly click "Use Current Location". Coordinates can be adjusted or set manually on the map at any time.
            </p>
        </div>
    );
};

export default WorksiteLocationPicker;
