import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Bell, Volume2, VolumeX, Mail, Globe, Play, 
    Check, AlertCircle, Loader2, ShieldCheck, Sliders,
    Radio, Sparkles, Send, CheckCircle2, Info
} from 'lucide-react';
import api from '../../services/api';
import { playNotificationSound, unlockAudio, AVAILABLE_TONES } from '../../utils/soundService';

const NotificationAlertSettingsHub = () => {
    const [settings, setSettings] = useState({
        soundEnabled: true,
        selectedTone: 'chime',
        soundVolume: 80,
        emailAlertsEnabled: true,
        adminRecipientEmail: 'admin@krishnaengg.com',
        browserNotificationsEnabled: true,
        notifyOnNewRequest: true,
        notifyOnApproval: true,
        notifyOnLinkCreation: true
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [emailTestResult, setEmailTestResult] = useState(null);
    const [browserPerm, setBrowserPerm] = useState('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setBrowserPerm(Notification.permission);
        }
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/support/settings');
            if (res.data) {
                setSettings(prev => ({ ...prev, ...res.data }));
            }
        } catch (err) {
            console.error("Failed to load alert settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setSaveSuccess(false);
        try {
            const res = await api.put('/support/settings', settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3500);
        } catch (err) {
            console.error("Save failure:", err);
            alert("Failed to save notification settings: " + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTestSound = (tone = settings.selectedTone, vol = settings.soundVolume) => {
        unlockAudio();
        playNotificationSound(tone, vol);
    };

    const handleTestEmail = async () => {
        if (!settings.adminRecipientEmail) {
            return alert("Please enter an admin recipient email address.");
        }
        setTestingEmail(true);
        setEmailTestResult(null);
        try {
            const res = await api.post('/support/test-alert-email', { email: settings.adminRecipientEmail });
            setEmailTestResult({
                success: true,
                message: res.data?.message || `Test alert email successfully dispatched to ${settings.adminRecipientEmail}`
            });
        } catch (err) {
            setEmailTestResult({
                success: false,
                message: err.response?.data?.message || err.message || "Failed to dispatch test email."
            });
        } finally {
            setTestingEmail(false);
        }
    };

    const requestBrowserPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return alert("Desktop notifications are not supported in this browser.");
        }
        try {
            const perm = await Notification.requestPermission();
            setBrowserPerm(perm);
            if (perm === 'granted') {
                new Notification("Krishna Engineering Works ERP", {
                    body: "Desktop alerts for Technical Support are now active.",
                    icon: "/logo512.png"
                });
            }
        } catch (err) {
            console.error("Permission request error:", err);
        }
    };

    if (loading) {
        return (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Alert Directives...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-500">
            {/* Header Card */}
            <div className="p-8 md:p-10 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-sm backdrop-blur-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Bell className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Notification & Alert Settings
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Configure sound chimes, email relays, and real-time triggers for Technical Support requests.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        {saving ? 'Synchronizing...' : saveSuccess ? 'Settings Saved' : 'Save Alert Directives'}
                    </button>
                </div>

                {saveSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Notification directives persisted to database. Active across all admin sessions.
                    </motion.div>
                )}
            </div>

            {/* Grid Configuration Modules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. AUDIO CHIME SETTINGS */}
                <div className="p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Volume2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    Notification Sound Chimes
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Short professional tone alerts</p>
                            </div>
                        </div>

                        {/* Sound Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.soundEnabled}
                                onChange={e => setSettings({ ...settings, soundEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className={`space-y-6 transition-opacity ${settings.soundEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        {/* Select Tone */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                                Select Notification Chime Tone
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {AVAILABLE_TONES.map(tone => {
                                    const isSelected = settings.selectedTone === tone.id;
                                    return (
                                        <div
                                            key={tone.id}
                                            onClick={() => {
                                                setSettings({ ...settings, selectedTone: tone.id });
                                                handleTestSound(tone.id, settings.soundVolume);
                                            }}
                                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm' 
                                                    : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 bg-slate-50/60 dark:bg-slate-800/40'
                                            }`}
                                        >
                                            <div>
                                                <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                    {tone.name}
                                                    {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{tone.desc}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTestSound(tone.id, settings.soundVolume);
                                                }}
                                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                                                title="Preview Tone"
                                            >
                                                <Play className="w-3.5 h-3.5 fill-current" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Volume Slider */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5" /> Notification Volume
                                </label>
                                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                                    {settings.soundVolume}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.soundVolume}
                                onChange={e => setSettings({ ...settings, soundVolume: Number(e.target.value) })}
                                onMouseUp={() => handleTestSound(settings.selectedTone, settings.soundVolume)}
                                onTouchEnd={() => handleTestSound(settings.selectedTone, settings.soundVolume)}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                <span>Soft (10%)</span>
                                <span>Moderate (50%)</span>
                                <span>Audible (100%)</span>
                            </div>
                        </div>

                        {/* Quick Test Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => handleTestSound()}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 border-none cursor-pointer"
                            >
                                <Play className="w-3.5 h-3.5 fill-current text-indigo-600" />
                                Test Notification Tone ({settings.soundVolume}%)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. EMAIL ALERT RELAY */}
                <div className="p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    Email Alert Dispatch
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transactional notification relay</p>
                            </div>
                        </div>

                        {/* Email Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.emailAlertsEnabled}
                                onChange={e => setSettings({ ...settings, emailAlertsEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className={`space-y-4 transition-opacity ${settings.emailAlertsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                                Admin Recipient Email Address
                            </label>
                            <input
                                type="email"
                                required={settings.emailAlertsEnabled}
                                value={settings.adminRecipientEmail}
                                onChange={e => setSettings({ ...settings, adminRecipientEmail: e.target.value })}
                                placeholder="e.g. operations@krishnaengg.com"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                                Incoming client technical support inquiries will be immediately emailed to this address with full project details and direct review links.
                            </p>
                        </div>

                        {/* Test Email Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                disabled={testingEmail || !settings.adminRecipientEmail}
                                onClick={handleTestEmail}
                                className="w-full py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800/60 cursor-pointer disabled:opacity-50"
                            >
                                {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                {testingEmail ? 'Dispatching Test Email...' : 'Send Test Alert Email'}
                            </button>
                        </div>

                        {emailTestResult && (
                            <div className={`p-3 rounded-xl text-xs font-medium border ${emailTestResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'}`}>
                                {emailTestResult.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. BROWSER DESKTOP NOTIFICATIONS */}
                <div className="p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    Browser Desktop Alerts
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Background OS popups</p>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.browserNotificationsEnabled}
                                onChange={e => setSettings({ ...settings, browserNotificationsEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div>
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Browser Permission Status</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                                    {browserPerm === 'granted' ? '✅ Permission Granted' : browserPerm === 'denied' ? '❌ Permission Blocked' : '⚠️ Permission Required'}
                                </div>
                            </div>

                            {browserPerm !== 'granted' && (
                                <button
                                    type="button"
                                    onClick={requestBrowserPermission}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition border-none cursor-pointer"
                                >
                                    Enable in Browser
                                </button>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Enables native desktop push toasts on your computer or mobile device when new support inquiries arrive even if the browser tab is minimized or running in the background.
                        </p>
                    </div>
                </div>

                {/* 4. EVENT-SPECIFIC ALERT PREFERENCES */}
                <div className="p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Radio className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Trigger Preferences
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Event-level notification filtering</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 transition">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnNewRequest}
                                onChange={e => setSettings({ ...settings, notifyOnNewRequest: e.target.checked })}
                                className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                    New Technical Support Request
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Play notification chime and send admin email when a client dispatches an inquiry.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 transition">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnApproval}
                                onChange={e => setSettings({ ...settings, notifyOnApproval: e.target.checked })}
                                className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                    Request Approval & Link Creation
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Send approval email to client with live support session link and play admin confirmation alert.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-100 transition">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnLinkCreation}
                                onChange={e => setSettings({ ...settings, notifyOnLinkCreation: e.target.checked })}
                                className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                    Real-Time Consultation Channel Activation
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Log channel creation and notify client portal in-app when session tunnel is active.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

            </div>

            {/* Bottom Floating Save Action */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {saving ? 'Synchronizing Directives...' : saveSuccess ? 'Directives Saved' : 'Save Notification Directives'}
                </button>
            </div>
        </form>
    );
};

export default NotificationAlertSettingsHub;
