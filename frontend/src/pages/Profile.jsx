import React, { useState, useEffect } from 'react';
import { User, Phone, Save, Loader2, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const Profile = () => {
    const { user, login } = useAuthStore();
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/me');
            setFormData({
                name: res.data.name || '',
                phone: res.data.phone || res.data.phoneNumber || ''
            });
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const res = await api.put('/auth/profile', formData);
            setMessage('Profile updated successfully!');
            // Update auth store slightly so name shows right away if needed
            if (user) {
                login({ ...user, name: formData.name });
            }
        } catch (error) {
            console.error(error);
            setMessage('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Account Identity</div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Profile Settings</h2>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <ShieldAlert className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-blue-900 mb-1">WhatsApp Integration</h4>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                            Linking your 10-digit mobile number here allows the system to send you instant alerts via WhatsApp. This includes security login alerts, OTPs, and project updates.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
                {message && (
                    <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center ${message.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {message}
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 py-4 pl-12 pr-4 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="Enter your full name"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp Mobile Number</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                            className="w-full bg-slate-50 border border-slate-200 py-4 pl-12 pr-4 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="e.g. 9876543210"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Update Profile & WhatsApp Link'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Profile;
