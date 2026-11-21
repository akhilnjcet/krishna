import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, ShieldCheck, CheckCircle2, AlertCircle,
    Loader2, UserCheck, Fingerprint, Scan,
    ArrowRight, Info, RefreshCw, MapPin, Eye,
    Send, HelpCircle, ShieldAlert, WifiOff, Check,
    Clock, Building, User, LogIn, ChevronRight, Phone, Truck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import hapticService from '../../services/hapticService';
import useAuthStore from '../../stores/authStore';
import { loadFaceModels } from '../../utils/faceApiLoader';
import { detectFaceAndLiveness } from '../../utils/faceApiUtils';
import { formatTimeIST } from '../../utils/dateTimeUtil';

const OFFLINE_QUEUE_KEY = 'krishna_offline_attendance_queue';

const AttendanceScanner = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const isDriver = user?.role === 'driver' || location.pathname.startsWith('/driver');

    // Workflow steps: 'consent' | 'idle' | 'scanning' | 'verifying' | 'success' | 'error'
    const [step, setStep] = useState('consent');
    const [action, setAction] = useState('Check in'); // 'Check in' | 'Check out'
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errorType, setErrorType] = useState('general'); // 'not_registered' | 'impersonation' | 'mismatch' | 'general'

    // Biometric & Camera refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);
    const isInitializingRef = useRef(false);
    const isSubmittingRef = useRef(false);

    // Live Detection Stats
    const [stats, setStats] = useState({ blinkCount: 0, quality: 0, livenessVerified: false, livenessProgress: 0 });

    // Location state
    const [locationData, setLocationData] = useState({
        latitude: null,
        longitude: null,
        accuracy: null,
        address: '',
        loading: false,
        error: null
    });

    // Confirmation details upon success
    const [confirmedRecord, setConfirmedRecord] = useState(null);

    // Correction Modal
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionReason, setCorrectionReason] = useState('');
    const [correctionNotes, setCorrectionNotes] = useState('');
    const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
    const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState('');

    // Offline Queue state
    const [offlineQueue, setOfflineQueue] = useState(() => {
        try {
            const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncingOffline, setSyncingOffline] = useState(false);

    // Listen to online/offline network transitions
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncOfflineQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Stop camera helper
    const stopCamera = () => {
        scanActiveRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Clean up camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Fetch GPS location on-demand
    const acquireLocation = useCallback(async () => {
        if (!('geolocation' in navigator)) {
            setLocationData(prev => ({ ...prev, error: 'Geolocation not supported by device' }));
            return null;
        }

        setLocationData(prev => ({ ...prev, loading: true, error: null }));

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    let address = `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

                    // Attempt reverse geocoding via OpenStreetMap Nominatim
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 4000);
                        const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                            { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
                        );
                        clearTimeout(timeoutId);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.display_name) {
                                // Shorten address for clean mobile display
                                const parts = data.display_name.split(', ');
                                address = parts.slice(0, 3).join(', ');
                            }
                        }
                    } catch {
                        // Fallback to coordinates on network timeout or CORS
                    }

                    const result = { latitude, longitude, accuracy, address, loading: false, error: null };
                    setLocationData(result);
                    resolve(result);
                },
                (err) => {
                    console.warn('Geolocation acquisition error:', err.message);
                    const errorMsg = err.code === 1
                        ? 'Location permission denied by user'
                        : 'Unable to acquire accurate GPS position';
                    const fallback = { latitude: null, longitude: null, accuracy: null, address: 'Location unavailable', loading: false, error: errorMsg };
                    setLocationData(fallback);
                    resolve(fallback);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    }, []);

    // Start on-demand camera scanning after consent is granted
    const startAttendanceScan = async () => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        hapticService.light();
        setStep('scanning');
        setStatusMessage('Initializing Camera & AI Biometrics...');
        setErrorMessage('');

        // Step 1: Preload AI face models
        const modelPromise = loadFaceModels();

        // Step 2: Acquire location concurrently
        acquireLocation();

        // Step 3: Request camera on-demand
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    console.warn('Video playback notice:', playErr);
                }
            }
            setStatusMessage('Align your face within the frame.');
        } catch (camErr) {
            console.error('Camera access error:', camErr);
            setStep('error');
            setErrorMessage('Camera access was denied or device camera is unavailable. Please check browser permissions.');
            isInitializingRef.current = false;
            return;
        }

        // Step 4: Ensure models are ready before detection loop
        const modelsReady = await modelPromise;
        if (!modelsReady) {
            setStep('error');
            setErrorMessage('Biometric AI models failed to load. Please check your connection and retry.');
            stopCamera();
            isInitializingRef.current = false;
            return;
        }

        isInitializingRef.current = false;
        runDetectionLoop();
    };

    // Detection & Liveness Loop
    const runDetectionLoop = () => {
        scanActiveRef.current = true;
        let blinkDetected = false;
        let highestScore = 0;
        let bestDescriptor = null;
        let lastAnalysisTime = 0;
        let steadyFrames = 0;
        let isProcessing = false;
        const ANALYSIS_INTERVAL = 100;

        const scanLoop = async () => {
            if (!scanActiveRef.current) return;

            const nowTime = performance.now();
            if (!isProcessing && nowTime - lastAnalysisTime >= ANALYSIS_INTERVAL) {
                lastAnalysisTime = nowTime;
                isProcessing = true;

                try {
                    const result = await detectFaceAndLiveness(videoRef, canvasRef);

                    if (!result || result.noFace) {
                        steadyFrames = 0;
                        setStatusMessage('Align face inside the frame.');
                        setStats(prev => ({ ...prev, quality: 0, livenessVerified: false, livenessProgress: 0 }));
                    } else if (result.multipleFaces) {
                        steadyFrames = 0;
                        setStatusMessage('Multiple faces detected. Please stand alone in frame.');
                        setStats(prev => ({ ...prev, quality: 0, livenessVerified: false, livenessProgress: 0 }));
                    } else if (result.invalid) {
                        steadyFrames = 0;
                        setStatusMessage(result.reason);
                        setStats(prev => ({ ...prev, quality: 0, livenessVerified: false, livenessProgress: 0 }));
                    } else if (result.detection) {
                        const quality = Math.round(result.score * 100);

                        if (!blinkDetected && result.isBlinking) {
                            blinkDetected = true;
                        }

                        if (result.score >= 0.65) {
                            steadyFrames++;
                            if (result.score > highestScore) {
                                highestScore = result.score;
                                bestDescriptor = result.descriptor;
                            }
                        } else {
                            steadyFrames = Math.max(0, steadyFrames - 1);
                        }

                        const livenessProgress = blinkDetected ? 100 : Math.min(100, Math.round((steadyFrames / 6) * 100));
                        const livenessVerified = blinkDetected || steadyFrames >= 5;

                        setStats({
                            blinkCount: blinkDetected ? 1 : 0,
                            quality,
                            livenessVerified,
                            livenessProgress
                        });

                        // Trigger verification when ready
                        const isReady = (blinkDetected && bestDescriptor && highestScore >= 0.65) ||
                            (steadyFrames >= 6 && (bestDescriptor || result.descriptor));

                        if (isReady) {
                            scanActiveRef.current = false;
                            setStats(prev => ({ ...prev, livenessVerified: true, livenessProgress: 100 }));

                            // Capture snapshot for authorized administrative verification
                            const snapshot = captureSnapshot();
                            submitAttendance(bestDescriptor || result.descriptor, snapshot);
                            return;
                        } else {
                            if (blinkDetected) {
                                setStatusMessage('Liveness verified! Hold still to complete scan...');
                            } else if (steadyFrames >= 2) {
                                setStatusMessage(`Hold still... (${livenessProgress}%) or blink`);
                            } else {
                                setStatusMessage('Face detected. Look straight or blink to verify.');
                            }
                        }
                    }
                } catch (err) {
                    console.error('Detection loop exception:', err);
                    scanActiveRef.current = false;
                    setStep('error');
                    setErrorMessage('Face detection encountered an issue. Tap retry to restart.');
                    return;
                } finally {
                    isProcessing = false;
                }
            }

            if (scanActiveRef.current) requestAnimationFrame(scanLoop);
        };

        scanLoop();
    };

    // Capture small compressed JPEG snapshot from video
    const captureSnapshot = () => {
        try {
            if (!videoRef.current) return null;
            const video = videoRef.current;
            const snapCanvas = document.createElement('canvas');
            snapCanvas.width = 320;
            snapCanvas.height = 240;
            const ctx = snapCanvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 320, 240);
            return snapCanvas.toDataURL('image/jpeg', 0.65);
        } catch (err) {
            console.warn('Snapshot capture warning:', err);
            return null;
        }
    };

    // Submit attendance payload to backend with concurrency lock
    const submitAttendance = async (descriptor, faceImage) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        scanActiveRef.current = false;
        stopCamera();

        setStep('verifying');
        setStatusMessage('Verifying facial biometric template & recording location...');

        // Ensure location is ready or fallback
        const loc = locationData.latitude ? locationData : await acquireLocation();

        const payload = {
            action,
            descriptor,
            face_image: faceImage,
            location: {
                latitude: loc?.latitude,
                longitude: loc?.longitude,
                accuracy: loc?.accuracy,
                address: loc?.address || ''
            },
            device_info: navigator.userAgent,
            consent_acknowledged: true
        };

        // If offline, queue immediately
        if (!navigator.onLine) {
            queueOfflineAttendance(payload);
            setStep('success');
            setConfirmedRecord({
                action,
                full_name: user?.name || 'Staff Member',
                login_time: new Date(),
                location: payload.location,
                is_offline: true
            });
            isSubmittingRef.current = false;
            return;
        }

        try {
            const res = await api.post('/attendance/record', payload);
            if (res.data.success) {
                hapticService.success();
                setStep('success');
                setConfirmedRecord({
                    ...res.data.record,
                    already_marked: res.data.already_marked,
                    already_checked_out: res.data.already_checked_out,
                    server_message: res.data.message
                });
            }
        } catch (err) {
            console.error('Attendance recording failed:', err);
            hapticService.error();

            // Check if network error => queue offline
            if (!err.response && !navigator.onLine) {
                queueOfflineAttendance(payload);
                setStep('success');
                setConfirmedRecord({
                    action,
                    full_name: user?.name || 'Staff Member',
                    login_time: new Date(),
                    location: payload.location,
                    is_offline: true
                });
                isSubmittingRef.current = false;
                return;
            }

            const isNotRegistered = !!err.response?.data?.face_not_registered || err.response?.status === 403;
            const isImpersonation = !!err.response?.data?.impersonation_detected;
            const errorText = err.response?.data?.message || 'Face verification failed or face not registered.';
            setStep('error');
            setErrorType(isNotRegistered ? 'not_registered' : isImpersonation ? 'impersonation' : 'mismatch');
            setErrorMessage(errorText);
        } finally {
            isSubmittingRef.current = false;
        }
    };

    // Save attendance payload to offline storage queue (deduplicated by action and date)
    const queueOfflineAttendance = (payload) => {
        const todayStr = new Date().toISOString().split('T')[0];
        // Check if an item for same action already queued
        const exists = offlineQueue.some(item => item.payload?.action === payload.action && item.dateStr === todayStr);
        if (exists) return;

        const item = {
            id: Date.now(),
            dateStr: todayStr,
            payload,
            timestamp: new Date().toISOString()
        };
        const nextQueue = [...offlineQueue, item];
        setOfflineQueue(nextQueue);
        try {
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
        } catch (e) {
            console.warn('Failed to save offline queue to storage', e);
        }
    };

    // Synchronize pending offline records when network recovers
    const syncOfflineQueue = async () => {
        if (!navigator.onLine || offlineQueue.length === 0 || syncingOffline) return;
        setSyncingOffline(true);

        const remaining = [];
        const seenActions = new Set();

        for (const item of offlineQueue) {
            const actionKey = `${item.dateStr || ''}_${item.payload?.action || ''}`;
            if (seenActions.has(actionKey)) {
                // Skip duplicate offline item
                continue;
            }
            seenActions.add(actionKey);

            try {
                await api.post('/attendance/record', item.payload);
            } catch (err) {
                // If already marked, it's satisfied!
                if (err.response?.status === 200 || err.response?.data?.already_marked) {
                    continue;
                }
                console.warn('Failed to sync offline item', err);
                remaining.push(item);
            }
        }

        setOfflineQueue(remaining);
        try {
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
        } catch (e) {
            console.warn('Failed to update offline storage', e);
        }
        setSyncingOffline(false);
    };

    // Submit manual correction request
    const handleCorrectionSubmit = async (e) => {
        e.preventDefault();
        if (!correctionReason.trim()) return;

        setCorrectionSubmitting(true);
        try {
            await api.post('/attendance/request-correction', {
                requested_action: action,
                reason: correctionReason,
                location_notes: correctionNotes || locationData.address || 'Reported from scanner view'
            });
            setCorrectionSuccessMsg('Correction request successfully submitted to administrators.');
            setTimeout(() => {
                setShowCorrectionModal(false);
                setCorrectionSuccessMsg('');
                setCorrectionReason('');
                setCorrectionNotes('');
            }, 2500);
        } catch (err) {
            console.error('Correction submission failed:', err);
            alert(err.response?.data?.message || 'Failed to submit correction request.');
        } finally {
            setCorrectionSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <div className="max-w-4xl w-full space-y-6">

                {/* Offline Banner Indicator */}
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between text-amber-900 dark:text-amber-200 text-xs font-bold shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <WifiOff className="w-4 h-4 text-amber-600" />
                            <span>You are currently offline. Attendance scans will be securely queued and synced when connection returns.</span>
                        </div>
                        {offlineQueue.length > 0 && (
                            <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                                {offlineQueue.length} queued
                            </span>
                        )}
                    </motion.div>
                )}

                {/* Top Header Card: User Account Badge */}
                <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${
                            isDriver 
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                        }`}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : (isDriver ? <Truck className="w-6 h-6" /> : <User className="w-6 h-6" />)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-black uppercase tracking-wider ${
                                    isDriver ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'
                                }`}>
                                    {isDriver ? 'Signed in Driver Account' : 'Signed in Staff Account'}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                {user?.name || (isDriver ? 'Driver' : 'Staff Member')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                ID: {user?.staff_id || user?.employeeId || user?._id || 'KEW-EMP'} • {isDriver ? 'Fleet Driver' : (user?.designation || user?.department || 'Operations')}
                            </p>
                        </div>
                    </div>

                    {/* Quick navigation buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {isDriver ? (
                            <Link 
                                to="/driver"
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <Truck className="w-3.5 h-3.5 text-blue-500" /> Driver Console
                            </Link>
                        ) : (
                            <Link 
                                to="/staff/attendance-hub"
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Attendance History
                            </Link>
                        )}
                    </div>
                </div>

                {/* STEP 1: Pre-Scan Privacy Notice & Consent Card */}
                {step === 'consent' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
                    >
                        <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5" /> Privacy & Consent Policy
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Staff Biometric & Location Attendance Policy
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Please review how your camera, face scan, and location information are handled before recording attendance.
                            </p>
                        </div>

                        {/* Privacy Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                                    <Camera className="w-4 h-4" /> Camera Access
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Camera is activated on-demand solely for identity verification during check in and check out. No background video is ever recorded.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase">
                                    <MapPin className="w-4 h-4" /> Single Location Stamp
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Your location is captured once when you submit attendance to confirm work yard presence. Continuous tracking is never enabled.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase">
                                    <Eye className="w-4 h-4" /> Admin Audit Access
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Captured face snapshots may only be viewed by authorized administrators for verification audits. Each view is logged in an immutable audit trail.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">
                                    <ShieldAlert className="w-4 h-4" /> Admin Deletion & Retention
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Only administrators control deletion of captured face images per organizational retention policy. Staff cannot delete audit images directly.
                                </p>
                            </div>
                        </div>

                        {/* Action Selection & Consent Button */}
                        <div className="space-y-4 pt-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                                Select Action
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAction('Check in')}
                                    className={`py-3 sm:py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider border transition flex items-center justify-center gap-2 ${action === 'Check in'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                                        }`}
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Check in (Shift Start)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAction('Check out')}
                                    className={`py-3 sm:py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider border transition flex items-center justify-center gap-2 ${action === 'Check out'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                                        }`}
                                >
                                    <Clock className="w-4 h-4 shrink-0" /> Check out (Shift End)
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={startAttendanceScan}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Scan className="w-4 h-4" /> I Understand & Consent — Start Face Scan
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: Live Scanning & Biometric Verification */}
                {(step === 'scanning' || step === 'verifying') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${action === 'Check in' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                    Target Action: {action}
                                </span>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                    Face Scan & Liveness Check
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAction(prev => prev === 'Check in' ? 'Check out' : 'Check in')}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                    Switch to {action === 'Check in' ? 'Check out' : 'Check in'}
                                </button>
                            </div>
                        </div>

                        {/* Camera Viewport & Face Guide HUD */}
                        <div className="relative max-w-md mx-auto aspect-4/3 rounded-3xl overflow-hidden bg-slate-950 shadow-inner border-2 border-indigo-500/30 flex items-center justify-center">
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                            />

                            {/* Circular / Rounded Face Perimeter Outline */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className={`w-56 h-72 rounded-[45%] border-2 transition-all duration-300 ${stats.livenessVerified
                                    ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                                    : stats.quality > 50
                                        ? 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse'
                                        : 'border-white/30 border-dashed'
                                    }`} />
                            </div>

                            {/* Top HUD: Status Message */}
                            <div className="absolute top-4 inset-x-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-2xl text-center shadow-lg">
                                {statusMessage}
                            </div>

                            {/* Bottom HUD: Liveness & Progress */}
                            <div className="absolute bottom-4 inset-x-4 bg-black/70 backdrop-blur-md p-3 rounded-2xl text-white space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        {stats.livenessVerified ? 'Liveness Confirmed' : 'Liveness Progress'}
                                    </span>
                                    <span>{stats.livenessProgress}%</span>
                                </div>
                                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-200 ${stats.livenessVerified ? 'bg-emerald-400' : 'bg-indigo-400'
                                            }`}
                                        style={{ width: `${stats.livenessProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Preview Indicator */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span className="font-medium truncate max-w-sm">
                                    {locationData.loading
                                        ? 'Acquiring GPS location...'
                                        : locationData.address || 'Location ready'}
                                </span>
                            </div>
                            {locationData.accuracy && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                    ±{Math.round(locationData.accuracy)}m
                                </span>
                            )}
                        </div>

                        {/* Cancel or switch back */}
                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    stopCamera();
                                    setStep('consent');
                                }}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                Cancel Scan
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCorrectionModal(true)}
                                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                                Camera issue? Request Manual Correction
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: Success Confirmation Screen */}
                {step === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {confirmedRecord?.server_message || `${confirmedRecord?.action || action} Successfully Recorded!`}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Your attendance and location have been verified and submitted into the staff registry.
                            </p>
                        </div>

                        {/* Confirmation summary card */}
                        <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Staff Member</span>
                                <span className="font-bold text-slate-900 dark:text-white">{confirmedRecord?.full_name || user?.name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Timestamp (IST)</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {formatTimeIST(confirmedRecord?.check_out || confirmedRecord?.login_time || Date.now(), true)}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Verification Result</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Biometric Match {confirmedRecord?.face_match_confidence ? `(${confirmedRecord.face_match_confidence}%)` : ''}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Recorded Location</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-right truncate max-w-[200px]" title={confirmedRecord?.location?.address || locationData.address}>
                                    {confirmedRecord?.location?.address || locationData.address || 'Yard Coordinates Logged'}
                                </span>
                            </div>
                            {confirmedRecord?.is_offline && (
                                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
                                    Stored in offline queue. Will sync automatically when connection recovers.
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('consent');
                                    setConfirmedRecord(null);
                                }}
                                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition"
                            >
                                Record Another Scan
                            </button>
                            {isDriver ? (
                                <Link
                                    to="/driver"
                                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition inline-flex items-center justify-center gap-1.5"
                                >
                                    <Truck className="w-4 h-4" /> Return to Driver Dashboard
                                </Link>
                            ) : (
                                <Link
                                    to="/staff/attendance-hub"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition inline-flex items-center justify-center gap-1.5"
                                >
                                    View My Attendance Records <ChevronRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: Error / Mismatch Screen */}
                {step === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-xl space-y-6 text-center ${
                            errorType === 'impersonation'
                                ? 'border-rose-400 dark:border-rose-700/60'
                                : errorType === 'not_registered'
                                ? 'border-amber-300 dark:border-amber-700/60'
                                : 'border-rose-200 dark:border-rose-900/40'
                        }`}
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md ${
                            errorType === 'not_registered'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                        }`}>
                            {errorType === 'not_registered' ? (
                                <Fingerprint className="w-8 h-8" />
                            ) : errorType === 'impersonation' ? (
                                <ShieldAlert className="w-8 h-8" />
                            ) : (
                                <AlertCircle className="w-8 h-8" />
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                {errorType === 'not_registered'
                                    ? 'Biometric Enrollment Required'
                                    : errorType === 'impersonation'
                                    ? 'Identity Mismatch Detected'
                                    : 'Verification Unsuccessful'}
                            </h3>

                            {errorType === 'impersonation' && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-semibold max-w-md mx-auto">
                                    <ShieldAlert className="w-4 h-4 inline-block mr-1.5 text-rose-600" />
                                    Proxy Attendance Rejected: Face matches another registered staff member.
                                </div>
                            )}

                            {errorType === 'not_registered' && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 font-semibold max-w-md mx-auto">
                                    <Info className="w-4 h-4 inline-block mr-1.5 text-amber-600" />
                                    Account Not Enrolled: An administrator must register your facial biometric template before attendance can be recorded.
                                </div>
                            )}

                            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold max-w-md mx-auto">
                                {errorMessage}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                {errorType === 'not_registered'
                                    ? 'Please reach out to your administrator, branch manager, or fleet supervisor to complete your facial enrollment in Staff Management.'
                                    : errorType === 'impersonation'
                                    ? 'Attendance is personal and can only be recorded when the authenticated user presents their own face to the camera.'
                                    : 'Ensure your face is clearly visible, well-lit, and directly facing the camera without glare or obstructions.'}
                            </p>
                        </div>

                        {/* Buttons to retry or request manual correction */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            {errorType !== 'not_registered' && (
                                <button
                                    type="button"
                                    onClick={startAttendanceScan}
                                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4" /> Retry Scan
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowCorrectionModal(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Send className="w-4 h-4" /> Request Manual Attendance Correction
                            </button>
                            {isDriver && (
                                <Link
                                    to="/driver"
                                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2"
                                >
                                    <Truck className="w-4 h-4" /> Back to Dashboard
                                </Link>
                            )}
                        </div>

                        {/* Safe Contact Admin fallback */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> Support: +91 9447940835
                            </span>
                            <span>•</span>
                            <Link to="/staff/support" className="text-indigo-600 hover:underline">
                                Help Center
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* MODAL: Manual Attendance Correction Request */}
                <AnimatePresence>
                    {showCorrectionModal && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
                            >
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
                                        <Send className="w-3.5 h-3.5" /> Manual Attendance Exception
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                        Request Attendance Correction
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Experiencing camera, GPS, or device errors? Submit a manual attendance correction. An administrator will review and verify your request.
                                    </p>
                                </div>

                                {correctionSuccessMsg ? (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center">
                                        {correctionSuccessMsg}
                                    </div>
                                ) : (
                                    <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                                                Intended Action
                                            </label>
                                            <select
                                                value={action}
                                                onChange={(e) => setAction(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="Check in">Check in (Shift Start)</option>
                                                <option value="Check out">Check out (Shift End)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                                                Reason for Manual Correction *
                                            </label>
                                            <select
                                                required
                                                value={correctionReason}
                                                onChange={(e) => setCorrectionReason(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none mb-2"
                                            >
                                                <option value="">Select a reason...</option>
                                                <option value="Camera hardware failure / lens damaged">Camera hardware failure / lens damaged</option>
                                                <option value="Camera permission blocked by browser or OS">Camera permission blocked by browser or OS</option>
                                                <option value="GPS location acquisition timed out or inaccurate">GPS location acquisition timed out or inaccurate</option>
                                                <option value="Face mismatch due to lighting / temporary facial injury">Face mismatch due to lighting / temporary facial injury</option>
                                                <option value="Remote site network / device malfunction">Remote site network / device malfunction</option>
                                                <option value="Other technical issue">Other technical issue</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                                                Additional Details & Work Location Notes
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={correctionNotes}
                                                onChange={(e) => setCorrectionNotes(e.target.value)}
                                                placeholder="Provide your location or shift details (e.g., Working at Thiruvazhiyode yard gate since 09:00 AM)..."
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowCorrectionModal(false)}
                                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={correctionSubmitting || !correctionReason}
                                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center gap-2"
                                            >
                                                {correctionSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                Submit to Administrator
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default AttendanceScanner;
