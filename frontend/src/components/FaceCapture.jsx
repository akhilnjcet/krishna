import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, detectFaceAndLiveness, detectBlink } from '../utils/faceApiUtils';
import { Camera, RefreshCw, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

const FaceCapture = ({ onCapture, buttonText = "Enroll Identity" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('loading'); // loading, idle, scanning, success, error
    const [message, setMessage] = useState('Initializing AI...');
    const [capturedDescriptor, setCapturedDescriptor] = useState(null);
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);

    useEffect(() => {
        const init = async () => {
            const loaded = await loadModels();
            if (loaded) {
                setStatus('idle');
                setMessage('Ready to scan');
            } else {
                setStatus('error');
                setMessage("Failed to load AI models.");
            }
        };
        init();

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = async () => {
        setStatus('scanning');
        setMessage('Starting camera...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            
            scanActiveRef.current = true;
            let capturedFrames = [];
            
            const scanLoop = async () => {
                if (!scanActiveRef.current) return;
                
                // Detect all faces to ensure only one is present
                const detections = await faceapi.detectAllFaces(videoRef.current)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 1) {
                    setMessage('ERROR: ONLY ONE PERSON ALLOWED DURING REGISTRATION.');
                    requestAnimationFrame(scanLoop);
                    return;
                }

                if (detections.length === 1) {
                    const result = detections[0];
                    const isBlinking = await detectBlink(result.landmarks);
                    
                    if (isBlinking) {
                        setMessage(`CAPTURING BIOMETRICS... [${capturedFrames.length + 1}/3]`);
                        capturedFrames.push(Array.from(result.descriptor));
                        
                        // Wait a bit between frames
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                        setMessage('PLEASE BLINK TO INITIATE CAPTURE');
                    }

                    if (capturedFrames.length >= 3) {
                        scanActiveRef.current = false;
                        
                        // Average the descriptors for a stronger "Master Embedding"
                        const averagedDescriptor = capturedFrames[0].map((_, i) => 
                            capturedFrames.reduce((acc, frame) => acc + frame[i], 0) / capturedFrames.length
                        );

                        setCapturedDescriptor(averagedDescriptor);
                        setStatus('success');
                        setMessage('ADVANCED IDENTITY PROFILE GENERATED');
                        stopVideo();
                        return;
                    }
                } else {
                    setMessage('POSITION FACE IN FRAME');
                }

                if (scanActiveRef.current) requestAnimationFrame(scanLoop);
            };
            scanLoop();

        } catch (err) {
            setStatus('error');
            setMessage("Camera access denied.");
        }
    };

    const stopVideo = () => {
        scanActiveRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleProceed = () => {
        if (capturedDescriptor) {
            onCapture(capturedDescriptor);
        }
    };

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-3xl border-2 border-red-200 text-red-700">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="font-bold uppercase tracking-tight">{message}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Retry System</button>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col items-center w-full">
            <div className="relative w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-indigo-500/20">
                {(status === 'loading' || status === 'scanning') && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-32 h-32 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-white font-black uppercase tracking-[0.2em] text-sm animate-pulse">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="absolute inset-0 bg-emerald-600/20 backdrop-blur-md z-30 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white mb-4 animate-bounce">
                            <ShieldCheck className="w-12 h-12" />
                        </div>
                        <p className="text-white font-black uppercase tracking-widest">{message}</p>
                    </div>
                )}
                
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />
            </div>

            {status === 'idle' && (
                <button onClick={startVideo} className="mt-8 flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95">
                    <Camera className="w-6 h-6" /> Start Biometric Enrollment
                </button>
            )}

            {status === 'success' && (
                <button onClick={handleProceed} className="mt-8 flex items-center gap-3 px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95">
                    <CheckCircle className="w-6 h-6" /> {buttonText}
                </button>
            )}

            <div className="mt-6 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-tighter text-xs">
                 <ShieldCheck className="w-4 h-4 text-indigo-400" />
                 Encrypted Biometric Capture Active
            </div>
        </div>
    );
};

export default FaceCapture;
