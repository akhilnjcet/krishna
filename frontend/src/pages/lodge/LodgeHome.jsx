import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Building2, ClipboardList, ExternalLink,
  Phone, Shield, ChevronRight, Zap, MapPin, Activity, Terminal,
  CalendarCheck, LogOut, Plus
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';
import useAuthStore from '../../stores/authStore';


const LodgeHome = () => {

    const navigate = useNavigate();
    const { user, isAuthenticated, logout: globalLogout } = useAuthStore();
    const { rooms, authenticatedTenantRoom, logoutTenant, appSettings } = useLodgeStore();
    const [hwInfo, setHwInfo] = useState({ batteryLevel: 0.98, isCharging: false });
    const [netStatus, setNetStatus] = useState({ connected: true, connectionType: 'wifi' });

    const activeAdminPhone = appSettings?.adminPhone || '9447940835';
    const adminWhatsAppUrl = `https://wa.me/91${activeAdminPhone.replace(/\D/g,'')}`;

    useEffect(() => {

        const getSystemTelemetry = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const bInfo = await Device.getBatteryInfo();
                    const nInfo = await Network.getStatus();
                    setHwInfo(bInfo);
                    setNetStatus(nInfo);
                } catch (e) { console.error(e); }
            }
        };
        getSystemTelemetry();
    }, []);

    const userRoom = rooms.find(r => r.number === authenticatedTenantRoom);

    const fullMenuItems = [
        { id: 'booking', icon: CalendarCheck, title: 'Book a Room', subtitle: 'Select dates & reserve', action: () => navigate('/lodge/booking'), color: 'bg-indigo-600', roles: ['guest', 'admin'] },
        { id: 'building', icon: Building2, title: 'Residency Login', subtitle: 'Manage your active stay', action: () => navigate('/lodge/tenant-login'), color: 'bg-blue-600', roles: ['guest', 'admin'] },
        { id: 'report', icon: ClipboardList, title: 'Maintenance Log', subtitle: 'Relay issues to command', action: () => navigate('/lodge/complaint'), color: 'bg-amber-500', roles: ['guest', 'tenant', 'admin'] },
        { id: 'privacy', icon: Shield, title: 'Privacy & Terms', subtitle: 'Legal & Data Protocols', action: () => navigate('/lodge/privacy-policy'), color: 'bg-emerald-600', roles: ['guest', 'tenant', 'admin'] },
        { id: 'engineering', icon: ExternalLink, title: 'Engineering Site', subtitle: 'Our Services & Portfolio', action: () => navigate('/engineering'), color: 'bg-indigo-600', roles: ['guest', 'tenant', 'admin'] },
        { id: 'admin', icon: Terminal, title: 'Admin Terminal', subtitle: 'Management access only', action: () => navigate('/lodge/admin-login'), color: 'bg-slate-800', roles: ['admin'] },
        { id: 'contact', icon: Phone, title: 'Emergency Relay', subtitle: 'Call Administrator duty line', action: () => window.open(`tel:${activeAdminPhone}`, '_self'), color: 'bg-rose-500', roles: ['tenant', 'admin'] },
        { id: 'map', icon: MapPin, title: 'Tactical Map', subtitle: 'Lodge location grid', action: () => window.open('https://maps.google.com/?q=Krishna+engineering+works+thiruzhiyode', '_blank'), color: 'bg-amber-600', roles: ['guest', 'tenant', 'admin'] }
    ];

    // Dynamic Filter: Only show what is relevant to the current session
    const menuItems = fullMenuItems.filter(item => {
        if (item.id === 'admin' && user?.role !== 'admin') return false;
        return true;
    });


    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Native Hardware Integration Header */}
            <div className="bg-[#111827] pt-12 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl shadow-2xl"></div>
                
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Krishna <br /><span className="text-blue-500">Lodge.</span></h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{isAuthenticated ? `Authenticated: ${user?.name || user?.email || 'Guest'}` : 'Public Guest Console'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isAuthenticated && (
                                <button 
                                    onClick={() => navigate('/customer/profile')}
                                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10"
                                >
                                    <Users className="w-5 h-5" />
                                </button>
                            )}
                            {isAuthenticated || authenticatedTenantRoom ? (
                                <button 
                                    onClick={() => {
                                        if (globalLogout) globalLogout();
                                        if (logoutTenant) logoutTenant();
                                        navigate('/lodge');
                                    }}
                                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-rose-500 border border-slate-700 shadow-2xl active:scale-95 transition-all"
                                    title="Exit Session"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {/* System Telemetry - Visual proof of Native functionality */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                            <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-black">
                                <Activity className="w-3 h-3" /> Hardware Health
                            </p>
                            <div className="flex items-center gap-2">
                                 <Zap className={`w-4 h-4 ${hwInfo.isCharging ? 'text-emerald-400' : 'text-slate-400'}`} />
                                 <span className="text-lg font-black text-white">{Math.round(hwInfo.batteryLevel * 100)}%</span>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                            <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-black">
                                <Shield className="w-3 h-3" /> Security Guard
                            </p>
                            <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                 <span className="text-lg font-black text-white uppercase">{netStatus.connectionType === 'none' ? 'OFFLINE' : 'LIVE NODE'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Grid */}
            <div className="px-6 -mt-10 pb-32 space-y-6 relative z-20">
                {userRoom ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#2D5BE3] p-8 rounded-[2.5rem] shadow-2xl shadow-blue-500/30 text-white relative overflow-hidden"
                        onClick={() => navigate(`/lodge/room/${userRoom.number}`)}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Building2 className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">CONNECTED RESIDENCY</p>
                            </div>
                            <h2 className="text-3xl font-black mb-1">Room {userRoom.number}</h2>
                            <p className="text-sm opacity-90 font-medium">Guest Identifier: {userRoom.tenant}</p>
                            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-5 py-2.5 rounded-2xl backdrop-blur-md">
                                Open Dashboard <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.25rem] flex items-center justify-center">
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-slate-800">Stay Login</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Link active room PIN</p>
                                </div>
                            </div>
                            <button onClick={() => navigate('/lodge/tenant-login')} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {!isAuthenticated && (
                            <div className="bg-blue-600 p-7 rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-white flex items-center justify-between group" onClick={() => navigate('/login')}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md">
                                        <Shield className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black italic">Cloud Backup</p>
                                        <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold">Register or Login for Data Safety</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); navigate('/register'); }} className="px-4 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all">Register</button>
                                     <button onClick={(e) => { e.stopPropagation(); navigate('/login'); }} className="px-4 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Login</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Subsidary Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {menuItems.map((m) => (
                        <button
                            key={m.id}
                            onClick={m.action}
                            className="bg-white p-6 rounded-[2.25rem] border border-slate-100 shadow-sm text-left group transition-all hover:bg-slate-50 active:scale-95"
                        >
                            <div className={`w-12 h-12 ${m.color} text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10`}>
                                <m.icon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{m.title}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em]">{m.subtitle}</p>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Native Tab Bar Simulation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-8 py-6 flex justify-between items-center z-[100]">
                <button onClick={() => navigate('/lodge')} className="text-blue-600 flex flex-col items-center gap-1">
                    <Building2 className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Lodge</span>
                </button>
                <button onClick={() => navigate('/engineering')} className="text-slate-400 hover:text-indigo-600 transition-colors flex flex-col items-center gap-1">
                    <ExternalLink className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Engineering</span>
                </button>
                <button onClick={() => navigate('/lodge/admin-login')} className="text-slate-400 hover:text-blue-400 transition-colors flex flex-col items-center gap-1">
                    <Shield className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Admin</span>
                </button>
                <button onClick={() => window.open(`tel:${activeAdminPhone}`, '_self')} className="text-slate-400 hover:text-rose-400 transition-colors flex flex-col items-center gap-1">
                    <Phone className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-widest">SOS</span>
                </button>
            </div>

            {/* Compliance Footer */}
            <div className="bg-slate-50 pt-10 pb-32 px-10 text-center border-t border-slate-100">
                 <div className="flex justify-center gap-6 mb-4">
                    <button onClick={() => navigate('/lodge/privacy')} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">Privacy Policy</button>
                    <button onClick={() => navigate('/legal')} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600">Terms of Service</button>
                 </div>
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] leading-relaxed">
                    Operated by Krishna Engineering Works & Residency<br/>
                    Registered Entity • Tiruzhiyode, Palakkad<br/>
                    v1.0.4 • Store Verification Protocol Active
                 </p>
            </div>

        </div>
    );
};

export default LodgeHome;
