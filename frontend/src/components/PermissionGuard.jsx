import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, MapPin, HardDrive, 
    Lock, ArrowRight, Loader2, CheckCircle2 
} from 'lucide-react';

const PermissionGuard = ({ children }) => {
    const [permissions, setPermissions] = useState({
        location: 'prompt',
        storage: 'prompt',
        camera: 'prompt'
    });
    const [loading, setLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(false);

    const checkPermissions = async () => {
        // Skip on web or if already prompted to prevent white screen hangs
        if (!Capacitor.isNativePlatform() || localStorage.getItem('krishna_permissions_prompted')) {
            setLoading(false);
            return;
        }

        try {
            // High-resilience dynamic import for Capacitor plugins
            const { Camera } = await import('@capacitor/camera').catch(() => ({ Camera: null }));
            
            // Fail-safe permission checks
            const locStatus = await Geolocation.checkPermissions().catch(() => ({ location: 'granted' }));
            const storeStatus = await Filesystem.checkPermissions().catch(() => ({ publicStorage: 'granted' }));
            const camStatus = Camera ? await Camera.checkPermissions().catch(() => ({ camera: 'granted' })) : { camera: 'granted' };

            const statuses = {
                location: locStatus.location || 'granted',
                storage: storeStatus.publicStorage || 'granted',
                camera: camStatus.camera || 'granted'
            };

            setPermissions(statuses);
            
            if (statuses.location !== 'granted' || statuses.storage !== 'granted' || statuses.camera !== 'granted') {
                setShowOverlay(true);
            } else {
                localStorage.setItem('krishna_permissions_prompted', 'true');
            }
        } catch (err) {
            console.error("Critical Permission Engine Link Out:", err);
            // Emergency fallback: Continue to app to prevent terminal white screen
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkPermissions();
    }, []);

    const requestAll = async () => {
        setLoading(true);
        try {
            const { Camera } = await import('@capacitor/camera');
            if (permissions.location !== 'granted') {
                await Geolocation.requestPermissions();
            }
            if (permissions.storage !== 'granted') {
                await Filesystem.requestPermissions();
            }
            if (permissions.camera !== 'granted') {
                await Camera.requestPermissions();
            }
            
            // Re-check
            const loc = await Geolocation.checkPermissions();
            const store = await Filesystem.checkPermissions();
            const cam = await Camera.checkPermissions();
            
            if (loc.location === 'granted' && store.publicStorage === 'granted' && cam.camera === 'granted') {
                setPermissions({ location: 'granted', storage: 'granted', camera: 'granted' });
            }
            
            // Mark as prompted regardless so we don't nag the user again later.
            localStorage.setItem('krishna_permissions_prompted', 'true');
            setShowOverlay(false);
        } catch (err) {
            alert("Permission error: Some features may be restricted.");
            localStorage.setItem('krishna_permissions_prompted', 'true');
            setShowOverlay(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !showOverlay) return null;

    return (
        <>
            {children}
            <AnimatePresence>
                {showOverlay && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xl flex items-end md:items-center justify-center p-4 md:p-8"
                    >
                        <motion.div 
                            initial={{ y: 100, scale: 0.95 }}
                            animate={{ y: 0, scale: 1 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200"
                        >
                            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                                        <Lock className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Security <span className="text-indigo-400">Protocol.</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Access Authorization Required</p>
                                </div>
                            </div>

                            <div className="p-10 space-y-8">
                                <p className="text-slate-600 font-medium leading-relaxed">To ensure full operational functionality for downloads, reporting, and staff attendance, please authorize the following secure parameters:</p>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                            <MapPin className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Precise Location</h4>
                                            <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Required for high-integrity attendance geo-tagging.</p>
                                        </div>
                                        {permissions.location === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>

                                    <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                            <HardDrive className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">External Storage</h4>
                                            <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Allows secure downloading of PDF reports & invoices.</p>
                                        </div>
                                        {permissions.storage === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>

                                    <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Biometric Camera</h4>
                                            <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1">Required for facial recognition and attendance scanning.</p>
                                        </div>
                                        {permissions.camera === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => {
                                            localStorage.setItem('krishna_permissions_prompted', 'true');
                                            setShowOverlay(false);
                                        }}
                                        className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600 transition"
                                    >
                                        Ignore
                                    </button>
                                    <button 
                                        onClick={requestAll}
                                        disabled={loading}
                                        className="flex-[2] bg-indigo-600 hover:bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Initialize Access <ArrowRight className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PermissionGuard;
