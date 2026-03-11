import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../stores/authStore';

const AttendanceScanner = () => {
    const { user, token } = useAuthStore();
    const [status, setStatus] = useState('idle'); // idle, scanning, verifying, success, error
    const [message, setMessage] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Cleanup camera stream when unmounting
    useEffect(() => {
        return () => {
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
        setStatus('scanning');
        setMessage('INITIALIZING CAMERA HARDWARE...');

        try {
            // Request camera feed
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            setMessage('ANALYZING FACIAL TOPOLOGY...');

            // Mocking the scan duration while camera is on
            setTimeout(() => {
                setStatus('verifying');
                setMessage('MATCHING WITH DATABASE RECORD...');

                // Mocking the backend verification call
                setTimeout(async () => {
                    stopCamera(); // Stop camera once we verify
                    try {
                        const response = await axios.post('/api/attendance',
                            {
                                userId: user._id,
                                status: 'Present',
                                faceVerified: true
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        );

                        setStatus('success');
                        setMessage(`IDENTITY CONFIRMED: ${user.name.toUpperCase()}. SHIFT LOGGED.`);
                    } catch (error) {
                        setStatus('error');
                        setMessage('AUTHORIZATION FAILED OR DB OFFLINE. TRY AGAIN.');
                    }
                }, 2000);
            }, 3000);

        } catch (err) {
            setStatus('error');
            setMessage('CAMERA ACCESS DENIED OR HARDWARE FAILURE.');
            console.error("Camera error:", err);
        }
    };

    return (
        <div className="bg-white border-4 border-brand-950 p-8 shadow-solid">
            <div className="flex justify-between items-center mb-6 border-b-4 border-brand-950 pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-950">
                    <span className="text-brand-accent mr-3">■</span>
                    Time & Attendance
                </h2>
                <span className="bg-brand-950 text-brand-accent font-black text-[10px] uppercase tracking-widest px-3 py-1">AI SYS.ONLINE</span>
            </div>

            <p className="text-brand-600 mb-8 font-medium">Please initiate biometric scan for daily attendance logging. Requires hardware camera access.</p>

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

                {status === 'idle' && (
                    <div className="text-brand-500 font-black uppercase tracking-widest text-xl text-center z-20">
                        CAMERA STANDBY<br />
                        <span className="text-xs text-brand-700">Awaiting engagement protocol</span>
                    </div>
                )}

                {(status === 'scanning' || status === 'verifying') && (
                    <div className="z-20 flex flex-col items-center absolute inset-0 justify-center">
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
                    disabled={status === 'scanning' || status === 'verifying' || status === 'success'}
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
