import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, ShieldCheck, CheckCircle2, AlertCircle, 
    Loader2, UserCheck, Timer, Fingerprint, Scan,
    ArrowRight, Info, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { loadFaceModels } from '../../utils/faceApiLoader';
import { detectFaceAndLiveness } from '../../utils/faceApiUtils';

const AttendanceScanner = () => {
    const { user, login } = useAuthStore();
    const [status, setStatus] = useState('idle'); // idle, checking, loading_models, scanning, verifying, success, error
    const [message, setMessage] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);
    const [stats, setStats] = useState({ blinkCount: 0, quality: 0 });

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            scanActiveRef.current = false;
            stopCamera();
        };
    }, []);

    const startScan = async () => {
        setStatus('loading_models');
        setMessage('Synchronizing AI Biometrics...');

        const modelsReady = await loadFaceModels();
        if (!modelsReady) {
            setStatus('error');
            setMessage('Biometric Engine initialization failed.');
            return;
        }

        setStatus('scanning');
        setMessage('Activating Optical Sensor...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            scanActiveRef.current = true;
            let blinkDetected = false;
            let highestScore = 0;
            let bestDescriptor = null;

            const scanLoop = async () => {
                if (!scanActiveRef.current) return;

                const result = await detectFaceAndLiveness(videoRef, canvasRef);

                if (result) {
                    setStats(prev => ({ ...prev, quality: Math.round(result.score * 100) }));

                    if (!blinkDetected && result.isBlinking) {
                        blinkDetected = true;
                        setStats(prev => ({ ...prev, blinkCount: 1 }));
                        setMessage('Liveness Verified. Holding for profile match...');
                    }

                    if (blinkDetected && !result.isBlinking && result.score > 0.8) {
                        if (result.score > highestScore) {
                            highestScore = result.score;
                            bestDescriptor = result.descriptor;
                        }
                    }

                    if (bestDescriptor && highestScore > 0.88) {
                        scanActiveRef.current = false;
                        verifyIdentity(bestDescriptor);
                        return;
                    } else if (!blinkDetected) {
                        setMessage('Presence Detected. Please blink to verify.');
                    }
                } else {
                    setMessage('Align face within the secure perimeter.');
                    setStats(prev => ({ ...prev, quality: 0 }));
                }

                if (scanActiveRef.current) requestAnimationFrame(scanLoop);
            };

            scanLoop();
        } catch (_err) {
            setStatus('error');
            setMessage('Optical Hardware Access Denied.');
        }
    };

    const verifyIdentity = async (descriptor) => {
        setStatus('verifying');
        setMessage('Matching high-fidelity descriptor...');

        try {
            const res = await api.post('/auth/verify-face', { descriptor });

            if (res.data.success) {
                const matchedUser = res.data.user;
                if (!user) login(matchedUser, matchedUser.token);
                
                stopCamera();
                setStatus('success');
                setMessage(`${res.data.logType === 'IN' ? 'SHIFT IN' : 'SHIFT OUT'} REGISTERED: ${matchedUser.name}`);
            }
        } catch (error) {
            stopCamera();
            setStatus('error');
            setMessage(error.response?.data?.message === 'Face Not Recognized' 
                ? 'Identity Mismatch. Please retry with better lighting.' 
                : 'Cryptographic handshake failed.');
        }
    };

    return (
        <div className="min-h-[calc(100vh-100px)] p-6 lg:p-12 bg-slate-50 flex items-center justify-center">
            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* Left Side: Status & Controls */}
                <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-[0.3em]">
                            <Fingerprint className="w-4 h-4" /> Secure Auth Node
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                            BIOMETRIC <span className="text-indigo-600">RECOGNITION.</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Verify your identity to log shift attendance using enterprise-grade facial recognition.</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                <Info className="w-6 h-6" />
                            </div>
                            <div className="text-sm">
                                <p className="font-black text-indigo-900 uppercase tracking-widest text-[10px] mb-1">Scanning Guidelines</p>
                                <p className="text-indigo-600/80 font-bold leading-tight">Remove glasses, stand in good light, and blink once instructed.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={startScan}
                                disabled={['loading_models', 'scanning', 'verifying', 'success'].includes(status)}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
                                    status === 'success' 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                    : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/40'
                                } disabled:opacity-70 disabled:cursor-not-allowed`}
                            >
                                {status === 'idle' && <><Camera className="w-5 h-5" /> Initialize Scanner</>}
                                {status === 'loading_models' && <><Loader2 className="w-5 h-5 animate-spin" /> Loading AI...</>}
                                {status === 'scanning' && <><Scan className="w-5 h-5 animate-pulse" /> Scanning...</>}
                                {status === 'verifying' && <><UserCheck className="w-5 h-5 animate-bounce" /> Verifying...</>}
                                {status === 'success' && <><CheckCircle2 className="w-5 h-5" /> Logged In</>}
                                {status === 'error' && <><RefreshCw className="w-5 h-5" /> Retry Scan</>}
                            </button>

                            {status === 'success' && (
                                <p className="text-center text-emerald-600 font-black uppercase tracking-widest text-[10px]">Shift timestamp recorded successfully.</p>
                            )}
                        </div>
                    </div>

                    {/* Stats Widget */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <Timer className="w-5 h-5 text-indigo-500 mb-2" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality</span>
                            <span className="text-lg font-black text-slate-900">{stats.quality}%</span>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                            <ShieldCheck className={`w-5 h-5 mb-2 ${stats.blinkCount > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liveness</span>
                            <span className={`text-lg font-black ${stats.blinkCount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {stats.blinkCount > 0 ? 'Verified' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Camera Viewport */}
                <div className="lg:col-span-7 relative order-1 lg:order-2">
                    <div className="relative w-full aspect-square md:aspect-[4/3] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white ring-1 ring-slate-200 group">
                        
                        {/* Interactive UI Overlays */}
                        <AnimatePresence>
                            {(status === 'scanning' || status === 'verifying') && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10 pointer-events-none"
                                >
                                    {/* Scanning frame corners */}
                                    <div className="absolute top-10 left-10 w-20 h-20 border-t-4 border-l-4 border-indigo-400 rounded-tl-3xl opacity-60"></div>
                                    <div className="absolute top-10 right-10 w-20 h-20 border-t-4 border-r-4 border-indigo-400 rounded-tr-3xl opacity-60"></div>
                                    <div className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 border-indigo-400 rounded-bl-3xl opacity-60"></div>
                                    <div className="absolute bottom-10 right-10 w-20 h-20 border-b-4 border-r-4 border-indigo-400 rounded-br-3xl opacity-60"></div>
                                    
                                    {/* Scanning line animation */}
                                    <motion.div 
                                        animate={{ top: ['10%', '90%', '10%'] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                        className="absolute left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(129,140,248,0.8)]"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Status Message Overlay */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 w-[80%]">
                            <motion.div 
                                layout
                                className={`px-6 py-3 rounded-2xl backdrop-blur-md border shadow-xl flex items-center justify-center gap-3 text-center
                                    ${status === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 
                                      status === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
                                      'bg-black/60 border-white/20 text-white'}`}
                            >
                                {status === 'verifying' && <Loader2 className="w-4 h-4 animate-spin" />}
                                {status === 'error' && <AlertCircle className="w-4 h-4" />}
                                {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{message || 'System Standby'}</span>
                            </motion.div>
                        </div>

                        {/* Video Element */}
                        <video
                            ref={videoRef}
                            className={`w-full h-full object-cover transition-opacity duration-700 
                                ${['scanning', 'verifying', 'success'].includes(status) ? 'opacity-100' : 'opacity-20'}`}
                            muted
                            playsInline
                        />

                        {/* Canvas for Detections */}
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />

                        {/* Idle / Success Overlays */}
                        {status === 'idle' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                                    <Camera className="w-10 h-10 text-indigo-600 animate-pulse" />
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Sensor Standby</p>
                                    <div className="w-1 h-12 bg-gradient-to-b from-indigo-600 to-transparent"></div>
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="absolute inset-0 bg-emerald-600/20 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                                <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                                    className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl"
                                >
                                    <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceScanner;
