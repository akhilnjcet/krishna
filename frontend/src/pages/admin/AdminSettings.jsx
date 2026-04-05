import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, Lock, Server, Save, Loader2, Check,
    MapPin, Phone, Mail, Globe, Share2, AlignLeft, 
    Terminal, Cpu, Radio, Activity, Zap, TrendingUp,
    BarChart3, Info, ImageIcon, FileText
} from 'lucide-react';
import api from '../../services/api';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        systemName: 'Krishna Engineering ERP',
        ownerEmail: 'admin@krishnaengg.com',
        maintenanceMode: false,
        faceThreshold: 0.6,
        allowRegistration: true,
        // Footer & Contact
        footer_description: 'Heavy structural engineering, industrial roofing, and precision fabrication.',
        footer_address: 'Industrial Area Phase 1, Sector 123',
        footer_phone: '+91 98765 43210',
        footer_email: 'HELLO@KRISHNAENGG.COM',
        social_in: '',
        social_fb: '',
        social_x: '',
        map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d251482.68658826724!2d76.16084920612662!3d9.982342759902633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080d514abec6bf%3A0xbd582caa5844192!2sKochi%2C%20Kerala!5e0!3m2!1sen!2sin!4v1709230552399!5m2!1sen!2sin',
        // Engagement Relay (Floating)
        floating_whatsapp: '919446000000',
        floating_phone: '+919446000000',
        floating_email: 'contact@krishna.com',
        // Legal & Copyright
        footer_copyright: 'KRISHNA ENGINEERING WORKS. UNYIELDING QUALITY.',
        footer_tos: '1. ACCEPTANCE OF TERMS\nKrishna Engineering Works providing its service to you subject to the following Terms of Service...',
        footer_privacy: 'This Privacy Policy explains how we collect and use your data...',
        // Home Stats
        stat_projects: '1200+',
        stat_years: '25+',
        stat_clients: '450+',
        stat_satisfaction: '99%',
        stat_tons: '12K Tons',
        stat_safety: '100%',
        // About Us
        about_title: 'ENGINEERING EXCELLENCE SINCE 1999',
        about_content: 'Krishna Engineering Works has been at the forefront of heavy structural fabrication and industrial roofing for over two decades. Our mission is to provide unyielding integrity in every weld and truss we complete.',
        about_image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const fetchSettings = useCallback(async () => {
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
            console.error("Failed to fetch settings:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/settings', { settings });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Save failure:", err);
            alert("Protocol failure: Unable to sync configuration.");
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key, val) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-6">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-t-2 border-brand-accent rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="w-10 h-10 text-brand-accent animate-pulse" />
                    </div>
                </div>
                <p className="text-brand-accent font-black uppercase tracking-[0.5em] text-[10px]">Initializing System Config...</p>
            </div>
        );
    }

    const ModuleHeader = ({ icon: Icon, title, status }) => {
        const ActiveIcon = Icon;
        return (
            <div className="flex items-center justify-between mb-10 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-accent text-black rounded-lg skew-x-[-12deg]">
                        <ActiveIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">{title}</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></span>
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">Module Active</span>
                        </div>
                    </div>
                </div>
                {status && (
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-brand-accent uppercase tracking-widest">
                        {status}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12 mb-20 md:mb-0 selection:bg-brand-accent selection:text-black">
            
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-20">
                    <div>
                        <div className="flex items-center gap-3 text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                            <Terminal className="w-4 h-4" /> Root Config Interface v5.1
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">
                            SYSTEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white">DIRECTIVES.</span>
                        </h1>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="group relative px-12 py-5 bg-brand-accent text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-4 hover:bg-white transition-all active:scale-95 rounded-xl shadow-[0_0_30px_rgba(255,180,0,0.2)]"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Syncing...' : success ? 'Config Updated' : 'Push Deployment'}
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    
                    {/* LEFT COLUMN: ABOUT & SAFETY */}
                    <div className="xl:col-span-12 space-y-10">
                        <section className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden group hover:border-brand-accent/20 transition-all">
                            <ModuleHeader icon={Info} title="Corporate Identity Protocol (About Us)" status="Live" />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                            <Terminal className="w-3 h-3 text-brand-accent" /> Headline
                                        </label>
                                        <input 
                                            value={settings.about_title}
                                            onChange={(e) => updateField('about_title', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-sm font-black text-white focus:border-brand-accent outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                            <ImageIcon className="w-3 h-3 text-brand-accent" /> Hero Media URL
                                        </label>
                                        <input 
                                            value={settings.about_image}
                                            onChange={(e) => updateField('about_image', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-sm font-bold text-blue-500 focus:border-brand-accent outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-8 space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-brand-accent" /> Corporate Narrative
                                    </label>
                                    <textarea 
                                        rows={8}
                                        value={settings.about_content}
                                        onChange={(e) => updateField('about_content', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-8 text-sm font-bold text-gray-400 focus:border-brand-accent outline-none leading-relaxed"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="xl:col-span-4 space-y-10">
                        <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-3xl hover:border-brand-accent/20 transition-colors group">
                            <ModuleHeader icon={BarChart3} title="Performance Metrics" status="Dynamic" />
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">Projects Completed</label>
                                    <input 
                                        value={settings.stat_projects} 
                                        onChange={(e)=>updateField('stat_projects', e.target.value)}
                                        placeholder="e.g. 1200+"
                                        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-brand-accent font-black outline-none focus:border-brand-accent/40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">Happy Clients</label>
                                    <input 
                                        value={settings.stat_clients} 
                                        onChange={(e)=>updateField('stat_clients', e.target.value)}
                                        placeholder="e.g. 450+"
                                        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-cyan-400 font-black outline-none focus:border-brand-accent/40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">Years Experience</label>
                                    <input 
                                        value={settings.stat_years} 
                                        onChange={(e)=>updateField('stat_years', e.target.value)}
                                        placeholder="e.g. 25+"
                                        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-yellow-400 font-black outline-none focus:border-brand-accent/40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">Client Satisfaction</label>
                                    <input 
                                        value={settings.stat_satisfaction} 
                                        onChange={(e)=>updateField('stat_satisfaction', e.target.value)}
                                        placeholder="e.g. 99%"
                                        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-green-400 font-black outline-none focus:border-brand-accent/40"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-3xl hover:border-brand-accent/20 transition-colors group">
                           <ModuleHeader icon={Shield} title="Identity Protocols" status="Secure" />
                           <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                                        Face Variance Logic
                                        <span className="text-brand-accent font-black">X-{settings.faceThreshold}</span>
                                    </label>
                                    <input 
                                        type="range" min="0.1" max="1.0" step="0.1" 
                                        value={settings.faceThreshold}
                                        onChange={(e) => updateField('faceThreshold', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-accent"
                                    />
                                </div>
                                <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group-hover:bg-brand-accent/[0.02] transition-colors">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Public Pipeline</h4>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Registration Node</p>
                                    </div>
                                    <button 
                                        onClick={() => updateField('allowRegistration', !settings.allowRegistration)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${settings.allowRegistration ? 'bg-brand-accent' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allowRegistration ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="xl:col-span-8 space-y-10 font-sans">
                        <section className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden">
                            <ModuleHeader icon={Radio} title="Comms Node Deployment" status="Global" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                            <AlignLeft className="w-3 h-3" /> Technical Descriptive Footnote
                                        </label>
                                        <textarea 
                                            value={settings.footer_description}
                                            onChange={(e) => updateField('footer_description', e.target.value)}
                                            rows={4}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 text-sm font-bold text-gray-400 focus:border-brand-accent/50 outline-none transition-all placeholder:text-gray-800"
                                        />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-accent flex items-center gap-2">
                                            <Share2 className="w-3 h-3" /> Social Uplink Frequency
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['in', 'fb', 'x'].map(social => (
                                                <div key={social} className="relative">
                                                    <input 
                                                        value={settings[`social_${social}`] || ''}
                                                        onChange={(e) => updateField(`social_${social}`, e.target.value)}
                                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-[10px] font-black text-center focus:border-brand-accent/50 outline-none transition-all"
                                                        placeholder={social.toUpperCase()}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                                            <MapPin className="w-3 h-3" /> Operation Headquarters
                                        </label>
                                        <textarea 
                                            value={settings.footer_address}
                                            onChange={(e) => updateField('footer_address', e.target.value)}
                                            rows={2}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 text-sm font-bold text-gray-400 focus:border-brand-accent/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            value={settings.footer_phone}
                                            onChange={(e) => updateField('footer_phone', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-bold text-gray-400 focus:border-brand-accent/50 outline-none transition-all"
                                            placeholder="Phone"
                                        />
                                        <input 
                                            value={settings.footer_email}
                                            onChange={(e) => updateField('footer_email', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-bold text-gray-400 focus:border-brand-accent/50 outline-none transition-all"
                                            placeholder="Email"
                                        />
                                        <textarea 
                                            value={settings.map_embed_url}
                                            onChange={(e) => updateField('map_embed_url', e.target.value)}
                                            rows={2}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-4 text-sm font-bold text-gray-400 focus:border-brand-accent/50 outline-none transition-all"
                                            placeholder="Google Maps Embed URL (src parameter)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden group hover:border-green-500/20 transition-all">
                            <ModuleHeader icon={Radio} title="Engagement Relay (Floating Links)" status="Active" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">WhatsApp Number (91...)</label>
                                    <input 
                                        value={settings.floating_whatsapp}
                                        onChange={(e) => updateField('floating_whatsapp', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-black text-green-500 outline-none focus:border-green-500/50"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Call Icon Link (tel:+...)</label>
                                    <input 
                                        value={settings.floating_phone}
                                        onChange={(e) => updateField('floating_phone', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-black text-brand-accent outline-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Mail Icon Link (mailto:...)</label>
                                    <input 
                                        value={settings.floating_email}
                                        onChange={(e) => updateField('floating_email', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-black text-blue-400 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl">
                            <ModuleHeader icon={Globe} title="Environment Identity" status="Instance 01" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">System Alias</label>
                                    <input 
                                        value={settings.systemName}
                                        onChange={(e) => updateField('systemName', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-black text-brand-accent outline-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Security Override Email</label>
                                    <input 
                                        value={settings.ownerEmail}
                                        onChange={(e) => updateField('ownerEmail', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-black text-gray-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden group hover:border-red-500/20 transition-all">
                            <ModuleHeader icon={Shield} title="Legal Configuration (ToS & Copyright)" status="Compliance" />
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Copyright Text Footer</label>
                                    <input 
                                        value={settings.footer_copyright}
                                        onChange={(e) => updateField('footer_copyright', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-4 text-sm font-bold text-gray-400 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Terms of Service Content</label>
                                        <textarea 
                                            rows={8}
                                            value={settings.footer_tos}
                                            onChange={(e) => updateField('footer_tos', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 text-sm font-medium text-gray-400 focus:border-red-500/40 outline-none leading-relaxed"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Privacy Policy Content</label>
                                        <textarea 
                                            rows={8}
                                            value={settings.footer_privacy}
                                            onChange={(e) => updateField('footer_privacy', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 text-sm font-medium text-gray-400 focus:border-red-500/40 outline-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
