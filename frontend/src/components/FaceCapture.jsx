import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, CheckCircle2, AlertCircle, Loader2, 
    ShieldCheck, UserPlus, Fingerprint, Eye,
    ScanLine, RefreshCw, Sun, Maximize2
} from 'lucide-react';
import { loadFaceModels } from '../utils/faceApiLoader';
import { detectFaceAndLiveness, averageAndNormalizeDescriptors } from '../utils/faceApiUtils';

const TARGET_SAMPLES = 5;

const FaceCapture = ({ onCapture, loading }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('initializing'); // initializing, idle, scanning, success, error
    const [message, setMessage] = useState('Initializing Biometric Engine...');
    const [capturedFrames, setCapturedFrames] = useState([]);
    const [finalDescriptor, setFinalDescriptor] = useState(null);
    const [metrics, setMetrics] = useState({ luminance: 120, blurriness: 50, distance: 'good' });
    const [facingMode, setFacingMode] = useState('user');
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);
    const isInitializingRef = useRef(false);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const stopVideo = () => {
        scanActiveRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        startVideo();

        return () => {
            stopVideo();
        };
    }, [facingMode]);

    const startVideo = async () => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        setStatus('initializing');
        setMessage('Initializing Biometric Engine...');

        // Step 1: Preload models in background
        const modelPromise = loadFaceModels();

        // Step 2: Initialize camera with ideal resolution and front camera facingMode
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280, min: 640 }, 
                    height: { ideal: 720, min: 480 }, 
                    facingMode: facingMode 
                } 
            });
            
            streamRef.current = stream;
            
            // Try applying advanced camera exposure & focus controls if supported
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                try {
                    const capabilities = videoTrack.getCapabilities();
                    const advancedConstraints = {};
                    if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                        advancedConstraints.exposureMode = 'continuous';
                    }
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                        advancedConstraints.focusMode = 'continuous';
                    }
                    if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
                        advancedConstraints.whiteBalanceMode = 'continuous';
                    }
                    if (Object.keys(advancedConstraints).length > 0) {
                        await videoTrack.applyConstraints({ advanced: [advancedConstraints] });
                    }
                } catch (cErr) {
                    console.log('Advanced camera constraints not supported on browser:', cErr);
                }
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setStatus('scanning');
            setMessage('Optical link active. Align face straight at camera...');
        } catch (camErr) {
            console.error('Camera initialization failed:', camErr);
            setStatus('error');
            setMessage("OPTICAL HARDWARE ACCESS DENIED.");
            isInitializingRef.current = false;
            return;
        }

        // Step 3: Wait for model initialization
        const loaded = await modelPromise;

        if (!loaded) {
            setStatus('error');
            setMessage("Biometric Engine failed to initialize.");
            stopVideo();
            isInitializingRef.current = false;
            return;
        }

        isInitializingRef.current = false;
        
        // Throttled scan loop
        scanActiveRef.current = true;
        let currentFrames = [];
        let lastAnalysisTime = 0;
        let blinkVerified = false;
        const ANALYSIS_INTERVAL = 150; // Fast 150ms cycle to catch blinks

        const scanLoop = async () => {
            if (!scanActiveRef.current) return;

            const nowTime = performance.now();
            if (nowTime - lastAnalysisTime >= ANALYSIS_INTERVAL) {
                lastAnalysisTime = nowTime;

                try {
                    const result = await detectFaceAndLiveness(videoRef, canvasRef);

                    if (result) {
                        setMetrics({
                            luminance: Math.round(result.luminance || 120),
                            blurriness: Math.round(result.blurriness || 50),
                            distance: result.distanceStatus || 'good'
                        });
                    }

                    if (!result) {
                        setMessage('ALIGN FACE WITHIN SCENE ANALYZER');
                    } else if (result.multipleFaces) {
                        setMessage('MULTIPLE FACES DETECTED. PLEASE ENSURE ONLY ONE FACE IS IN FRAME.');
                    } else if (result.noFace) {
                        if (result.luminance < 10) {
                            setMessage('LIGHTING IS TOO LOW. PLEASE MOVE TO A BRIGHTER AREA.');
                        } else {
                            setMessage('NO FACE DETECTED. POSITION YOUR FACE IN FRAME.');
                        }
                    } else if (result.invalid) {
                        setMessage(result.reason.toUpperCase());
                    } else if (result.detection) {
                        if (result.isBlinking) {
                            blinkVerified = true;
                        }

                        if (!blinkVerified) {
                            setMessage('PERFORM ONE CLEAR BLINK FOR LIVENESS CHECK');
                        } else {
                            setMessage(`CAPTURING BIOMETRIC SAMPLE [${currentFrames.length + 1}/${TARGET_SAMPLES}]...`);
                            currentFrames.push(result.descriptor);
                            setCapturedFrames([...currentFrames]);

                            await new Promise(resolve => setTimeout(resolve, 150));

                            if (currentFrames.length >= TARGET_SAMPLES) {
                                scanActiveRef.current = false;
                                const averagedDescriptor = averageAndNormalizeDescriptors(currentFrames);

                                setStatus('success');
                                setMessage('HIGH-QUALITY BIOMETRIC PROFILE GENERATED SUCCESSFULLY');
                                stopVideo();
                                setFinalDescriptor(averagedDescriptor);
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Face capture failure:', err);
                    scanActiveRef.current = false;
                    stopVideo();
                    setStatus('error');
                    setMessage('Face capture error. Please retry.');
                    return;
                }
            }

            if (scanActiveRef.current) requestAnimationFrame(scanLoop);
        };

        scanLoop();
    };

    return (
        <div className="w-full flex flex-col items-center gap-4 md:gap-8 py-2 md:py-4">
            
            <div className="relative w-full aspect-[3/4] sm:aspect-square md:aspect-[4/3] max-w-lg bg-slate-950 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-indigo-500/30 group">
                
                {/* Real-time Quality Meters */}
                {/* Real-time Quality Meters */}
                {status === 'scanning' && (
                    <div className="absolute top-4 left-4 right-4 z-30 flex justify-between gap-2">
                        <div className="flex gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl text-[9px] font-bold text-white border border-slate-700/50 flex-1 justify-between">
                            <div className="flex items-center gap-1">
                                <Sun className={`w-3 h-3 ${metrics.luminance < 10 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                                <span>Light: {metrics.luminance < 10 ? 'Low' : 'Good'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Maximize2 className="w-3 h-3 text-cyan-400" />
                                <span>Dist: {metrics.distance === 'too_far' ? 'Move Closer' : metrics.distance === 'too_close' ? 'Step Back' : 'Optimal'}</span>
                            </div>
                        </div>
                        <button onClick={toggleCamera} className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 transition-colors backdrop-blur-md rounded-xl border border-slate-700/50 text-white flex items-center justify-center shrink-0">
                            <RefreshCw className="w-4 h-4 text-indigo-400" />
                        </button>
                    </div>
                )}

                {/* Oval Face Guide Overlay */}
                <AnimatePresence>
                    {status === 'scanning' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                             <div className={`w-64 h-80 border-2 rounded-[50%] transition-colors duration-300 flex items-center justify-center ${
                                 metrics.luminance < 10 ? 'border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-emerald-400/70 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                             }`}>
                                 <div className="w-60 h-76 border border-dashed border-white/20 rounded-[50%] animate-spin-slow"></div>
                             </div>
                             <motion.div 
                                animate={{ top: ['22%', '78%', '22%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute left-[18%] right-[18%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                             />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Progress Indicators */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i < capturedFrames.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-800'}`}></div>
                    ))}
                </div>

                {/* Video / Canvas */}
                <video ref={videoRef} autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} className={`w-full h-full object-cover transition-opacity duration-700 ${['scanning', 'success'].includes(status) ? 'opacity-100' : 'opacity-20'}`} />
                <canvas ref={canvasRef} style={{ transform: 'scaleX(-1)' }} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />

                {/* Overlays */}
                <AnimatePresence mode="wait">
                    {status === 'initializing' && (
                        <motion.div key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <p className="text-white font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">{message}</p>
                        </motion.div>
                    )}

                    {status === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-6">
                                <ScanLine className="w-10 h-10 text-indigo-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.15em] text-xs leading-relaxed">System ready for biometric enrollment profile generation.</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-40 bg-emerald-600/20 backdrop-blur-md flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl">
                                <ShieldCheck className="w-14 h-14 text-emerald-500" />
                            </div>
                            <p className="text-white font-black uppercase tracking-[0.2em] text-xs text-center px-4">{message}</p>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-red-950/90 flex flex-col items-center justify-center px-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-white font-black uppercase tracking-widest text-[10px] mb-6">{message}</p>
                            <button onClick={() => setStatus('initializing')} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <RefreshCw className="w-3 h-3" /> Re-Initialize
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Message Banner */}
                {status === 'scanning' && (
                    <div className="absolute bottom-16 left-0 right-0 z-30 flex justify-center px-4">
                        <motion.div layout initial={{ y: 20 }} animate={{ y: 0 }} className="px-5 py-2 bg-indigo-600/90 backdrop-blur-md border border-indigo-400/30 rounded-full text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 text-center">
                             <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full animate-ping shrink-0" />
                             <span className="truncate max-w-xs">{message}</span>
                        </motion.div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center gap-6">
                {(status === 'idle' || status === 'error') && (
                    <button 
                        onClick={startVideo} 
                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <UserPlus className="w-5 h-5" /> Start Identity Scan
                    </button>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-[10px]">
                            <CheckCircle2 className="w-4 h-4" /> Biometric Token Generated
                        </div>
                        <p className="text-slate-400 text-xs font-medium max-w-sm text-center italic">Proceed to link this biometric profile with the staff member's digital account.</p>
                        <button 
                            onClick={() => {
                                if (finalDescriptor) {
                                    onCapture(finalDescriptor);
                                }
                            }}
                            disabled={loading}
                            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                            ) : (
                                <><ShieldCheck className="w-4 h-4" /> OK</>
                            )}
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4 py-3 px-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        <ShieldCheck className="w-3 h-3 text-indigo-400" /> AES-256 Encrypted
                    </div>
                    <div className="w-[1px] h-3 bg-slate-200"></div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        <Fingerprint className="w-3 h-3 text-indigo-400" /> Biometric Hash
                    </div>
                    <div className="w-[1px] h-3 bg-slate-200"></div>
                    <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        <Eye className="w-3 h-3 text-indigo-400" /> Liveness Active
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceCapture;
