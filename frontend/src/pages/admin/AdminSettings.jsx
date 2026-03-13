import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Bell, Server, Save, RotateCcw, Loader2, Check } from 'lucide-react';
import api from '../../services/api';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        systemName: 'Krishna Engineering ERP',
        ownerEmail: 'admin@krishnaengg.com',
        maintenanceMode: false,
        faceThreshold: 0.6,
        allowRegistration: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/settings');
            if (res.data && res.data.length > 0) {
                const settingsObj = {};
                res.data.forEach(s => {
                    settingsObj[s.key] = s.value;
                });
                setSettings(prev => ({ ...prev, ...settingsObj }));
            }
        } catch (err) {
            console.error("Failed to fetch settings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/settings', { settings });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            alert("Failed to archive settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="bg-indigo-600 text-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200 flex justify-between items-center relative overflow-hidden">
                <Shield className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10" />
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">System Configuration</h1>
                    <p className="text-indigo-100 font-medium">Core protocol management and security overrides.</p>
                </div>
                <div className="flex gap-4 relative z-10">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-indigo-50 transition shadow-lg disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <Check className="w-5 h-5 text-emerald-500" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Processing...' : success ? 'Changes Saved' : 'Commit Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Lock className="w-6 h-6 text-indigo-600" /> Identity Protocols
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Face Recognition Variance [0.1 - 1.0]</label>
                            <input 
                                type="range" min="0.1" max="1.0" step="0.1" 
                                value={settings.faceThreshold}
                                onChange={(e) => setSettings({...settings, faceThreshold: parseFloat(e.target.value)})}
                                className="w-full accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
                                <span>Strict (Low MD)</span>
                                <span className="text-indigo-600 font-black">Current: {settings.faceThreshold}</span>
                                <span>Loose (High MD)</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="font-black text-slate-900 text-sm">Allow Public Registration</p>
                                <p className="text-xs text-slate-500 font-medium">New clients can initialize accounts.</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, allowRegistration: !settings.allowRegistration})}
                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.allowRegistration ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.allowRegistration ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Server className="w-6 h-6 text-indigo-600" /> Database & Environment
                    </h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">System Alias</label>
                            <input 
                                type="text" 
                                value={settings.systemName}
                                onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                            <div>
                                <p className="font-black text-red-900 text-sm">Maintenance Lockdown</p>
                                <p className="text-xs text-red-600 font-medium">Suspend all incoming API requests.</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-red-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
