import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { loadModels, detectFaceAndLiveness } from '../../utils/faceApiUtils';

const AttendanceScanner = () => {
    const { user, login } = useAuthStore();
    const [status, setStatus] = useState('idle'); // idle, loading, scanning, verifying, success, error
    const [message, setMessage] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanActiveRef = useRef(false);

    // Cleanup camera stream when unmounting
    useEffect(() => {
        return () => {
            scanActiveRef.current = false;
            stopCamera();
        };
    }, []);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startScan = async () => {
        setStatus('loading');
        setMessage('LOADING AI VERIFICATION MODELS...');

        const modelsReady = await loadModels();
        if (!modelsReady) {
            setStatus('error');
            setMessage('FAILED TO LOAD LOCAL AI MODELS.');
            return;
        }

        setStatus('scanning');
        setMessage('INITIALIZING CAMERA HARDWARE...');

        try {
            // Request camera feed
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            scanActiveRef.current = true;
            let blinkDetected = false;
            let highestScore = 0;
            let bestDescriptor = null;

            setMessage('ANALYZING FACIAL TOPOLOGY...');

            const scanLoop = async () => {
                if (!scanActiveRef.current) return;

                const result = await detectFaceAndLiveness(videoRef, canvasRef);

                if (result) {
                    if (!blinkDetected && result.isBlinking) {
                        blinkDetected = true;
                        setMessage('LIVENESS VERIFIED. KEEP STILL...');
                    }

                    if (blinkDetected && !result.isBlinking && result.score > 0.8) {
                        if (result.score > highestScore) {
                            highestScore = result.score;
                            bestDescriptor = result.descriptor;
                        }
                    }

                    // Proceed once we have a very clear shot
                    if (bestDescriptor && highestScore > 0.85) {
                        scanActiveRef.current = false;
                        if (canvasRef.current) {
                            canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        }
                        verifyIdentity(bestDescriptor);
                        return;
                    } else if (!blinkDetected && result.score > 0.6) {
                        setMessage('PLEASE BLINK TO VERIFY LIVENESS.');
                    }
                } else {
                    setMessage('POSITION FACE IN FRAME...');
                }

                if (scanActiveRef.current) {
                    requestAnimationFrame(scanLoop);
                }
            };

            scanLoop();
        } catch (err) {
            setStatus('error');
            setMessage('CAMERA ACCESS DENIED.');
            console.error("Camera error:", err);
        }
    };

    const verifyIdentity = async (descriptor) => {
        setStatus('verifying');
        setMessage('MATCHING WITH BIOMETRIC DATABASE...');

        try {
            // Backend verify-face handles both verification AND attendance logging now
            const res = await api.post('/auth/verify-face', { descriptor });

            if (res.data.success) {
                const matchedUser = res.data.user;
                // Sync session if needed
                if (!user) {
                    login(matchedUser, matchedUser.token);
                }
                
                stopCamera();
                setStatus('success');
                setMessage(`ATTENDANCE MARKED SUCCESSFULLY: ${matchedUser.name.toUpperCase()}`);
            }
        } catch (error) {
            stopCamera();
            setStatus('error');
            const errorMsg = error.response?.data?.message === 'Face Not Recognized' 
                ? 'FACE NOT RECOGNIZED. PLEASE ALIGN YOUR FACE AND TRY AGAIN.' 
                : 'AUTHORIZATION FAILED. TRY AGAIN.';
            setMessage(errorMsg);
        }
    };


    return (
        <div className="bg-white border-4 border-brand-950 p-8 shadow-solid">
            <div className="flex justify-between items-center mb-6 border-b-4 border-brand-950 pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-950">
                    <span className="text-brand-accent mr-3">■</span>
                    Biometric Shift Log
                </h2>
                <span className="bg-brand-950 text-brand-accent font-black text-[10px] uppercase tracking-widest px-3 py-1">LIVENESS SYSTEM V2.4</span>
            </div>

            <div className="bg-brand-50 border-l-4 border-brand-accent p-4 mb-8">
                <p className="text-brand-950 font-black text-xs uppercase tracking-widest mb-1">Authorization Protocol:</p>
                <p className="text-brand-600 text-xs font-bold leading-relaxed">
                    1. Align face in frame. <br/>
                    2. Perform one clear <span className="text-brand-950 underline">BLINK</span> for liveness proof. <br/>
                    3. System will auto-verify once human presence is confirmed.
                </p>
            </div>

            {/* Scanner UI block */}
            <div className="bg-black p-4 border-4 border-brand-800 mb-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                {/* Visual grid / scanning effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-10"></div>

                {/* Actual Video Feed */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${(status === 'scanning' || status === 'verifying') ? 'opacity-100' : 'opacity-0 hidden'}`}
                    muted
                    playsInline
                />

                {/* Tracking Canvas Overlay */}
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover z-20 ${status === 'scanning' ? 'opacity-100' : 'opacity-0 hidden'}`}
                />

                {status === 'idle' && (
                    <div className="text-brand-500 font-black uppercase tracking-widest text-xl text-center z-20">
                        CAMERA STANDBY<br />
                        <span className="text-xs text-brand-700">Awaiting engagement protocol</span>
                    </div>
                )}

                {(status === 'loading' || status === 'scanning' || status === 'verifying') && (
                    <div className="z-30 flex flex-col items-center absolute inset-0 justify-center pointer-events-none">
                        <div className="w-48 h-48 border-4 border-brand-accent border-dashed rounded-full animate-[spin_4s_linear_infinite] flex items-center justify-center mb-4">
                            <div className="w-32 h-32 border-4 border-brand-400 opacity-50 border-dotted rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                        </div>
                        <div className="absolute bottom-6 bg-black/80 px-4 py-2 text-brand-accent font-black uppercase tracking-widest text-sm animate-pulse border-2 border-brand-800">
                            {message}
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="z-20 flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-500 text-white flex items-center justify-center font-black text-4xl border-4 border-white mb-4">
                            ✓
                        </div>
                        <div className="text-green-500 bg-black/50 px-3 py-1 font-black uppercase tracking-widest text-sm text-center">
                            {message}
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="z-20 flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-600 text-white flex items-center justify-center font-black text-4xl border-4 border-white mb-4">
                            !
                        </div>
                        <div className="text-red-500 bg-black/50 px-3 py-1 font-black uppercase tracking-widest text-sm text-center">
                            {message}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
                <button
                    onClick={startScan}
                    disabled={status === 'loading' || status === 'scanning' || status === 'verifying' || status === 'success'}
                    className={`font-black uppercase tracking-widest py-4 px-8 border-4 border-brand-950 shadow-[4px_4px_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all flex-1 text-center ${status === 'success'
                        ? 'bg-brand-50 text-brand-400 cursor-not-allowed border-brand-200 shadow-none'
                        : 'bg-brand-accent hover:bg-brand-400 text-brand-950'
                        }`}
                >
                    {status === 'success' ? 'LOGGED' : 'Initiate Scan &rarr;'}
                </button>

                <div className="bg-brand-50 border-2 border-brand-200 p-4 flex-1 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Status Registry</span>
                    <span className={`font-black uppercase tracking-tight ${status === 'success' ? 'text-green-600' : 'text-brand-950'}`}>
                        {status === 'success' ? `Logged at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pending Shift Log'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceScanner;
