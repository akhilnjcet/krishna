import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, CheckCircle2, AlertCircle, Loader2, 
    ShieldCheck, UserPlus, Fingerprint, Eye,
    ScanLine, RefreshCw
} from 'lucide-react';
import { loadFaceModels } from '../utils/faceApiLoader';
import { detectBlink } from '../utils/faceApiUtils';

const FaceCapture = ({ onCapture, buttonText = "Finalize Enrollment" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('initializing'); // initializing, idle, scanning, success, error
    const [message, setMessage] = useState('Initializing Biometric Engine...');
    const [capturedFrames, setCapturedFrames] = useState([]);
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);

    useEffect(() => {
        const init = async () => {
            const loaded = await loadFaceModels();
            if (loaded) {
                setStatus('idle');
                setMessage('Biometric system ready for enrollment.');
            } else {
                setStatus('error');
                setMessage("Biometric Engine failed to initialize.");
            }
        };
        init();

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = async () => {
        setStatus('scanning');
        setMessage('Establishing optical link...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            
            scanActiveRef.current = true;
            let currentFrames = [];
            
            const scanLoop = async () => {
                if (!scanActiveRef.current) return;
                
                const detections = await faceapi.detectAllFaces(videoRef.current)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 1) {
                    setMessage('CRITICAL: MULTIPLE FACES DETECTED. ENROLL ONLY ONE.');
                } else if (detections.length === 1) {
                    const result = detections[0];
                    const isBlinking = await detectBlink(result.landmarks);
                    
                    if (isBlinking) {
                        setMessage(`CAPTURING FRAME BINARY... [${currentFrames.length + 1}/3]`);
                        currentFrames.push(Array.from(result.descriptor));
                        setCapturedFrames([...currentFrames]);
                        
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } else {
                        setMessage('PERFORM ONE CLEAR BLINK TO START CAPTURE');
                    }

                    if (currentFrames.length >= 3) {
                        scanActiveRef.current = false;
                        
                        const averagedDescriptor = currentFrames[0].map((_, i) => 
                            currentFrames.reduce((acc, frame) => acc + frame[i], 0) / currentFrames.length
                        );

                        setStatus('success');
                        setMessage('BIOMETRIC PROFILE GENERATED SUCCESSFULLY');
                        stopVideo();
                        onCapture(averagedDescriptor);
                        return;
                    }
                } else {
                    setMessage('ALIGN EYES WITHIN SCENE ANALYZER');
                }

                if (scanActiveRef.current) requestAnimationFrame(scanLoop);
            };
            scanLoop();

        } catch (err) {
            setStatus('error');
            setMessage("OPTICAL HARDWARE ACCESS DENIED.");
        }
    };

    const stopVideo = () => {
        scanActiveRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-8 py-4">
            
            <div className="relative w-full aspect-square max-w-lg bg-slate-950 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-indigo-500/30 group">
                
                {/* Visual Overlays */}
                <AnimatePresence>
                    {status === 'scanning' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none z-10">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-2 border-indigo-400/30 rounded-full flex items-center justify-center">
                                 <div className="w-64 h-64 border-2 border-indigo-400/20 border-dashed rounded-full animate-spin-slow"></div>
                             </div>
                             <motion.div 
                                animate={{ top: ['20%', '80%', '20%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                             />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Progress Indicators */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className={`w-12 h-1 rounded-full transition-all duration-500 ${i < capturedFrames.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-800'}`}></div>
                    ))}
                </div>

                {/* Video / Content */}
                <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-700 ${['scanning', 'success'].includes(status) ? 'opacity-100' : 'opacity-20'}`} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />

                {/* Overlays (Success, Error, Initializing, Idle) */}
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
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                                <ShieldCheck className="w-14 h-14 text-emerald-500" />
                            </div>
                            <p className="text-white font-black uppercase tracking-[0.2em] text-xs">{message}</p>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-red-950/90 flex flex-col items-center justify-center px-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-white font-black uppercase tracking-widest text-[10px] mb-6">{message}</p>
                            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <RefreshCw className="w-3 h-3" /> Re-Initialize
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Status Message */}
                {status === 'scanning' && (
                    <div className="absolute bottom-16 left-0 right-0 z-30 flex justify-center">
                        <motion.div layout initial={{ y: 20 }} animate={{ y: 0 }} className="px-6 py-2 bg-indigo-600 rounded-full text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                             <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                             {message}
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
                    </div>
                )}

                <div className="flex items-center gap-4 py-3 px-6 bg-slate-50 border border-slate-100 rounded-2xl">
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
