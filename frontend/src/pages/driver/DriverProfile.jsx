import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { 
    User, Phone, MapPin, Award, Calendar, ShieldCheck, 
    Key, AlertTriangle, CheckCircle2, Lock, Truck, FileText, RefreshCw
} from 'lucide-react';

const DriverProfile = () => {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);

    // Password change state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get('/drivers/portal/me');
            if (res.data.success) {
                setProfile(res.data.driver);
                setVehicle(res.data.assignedVehicle);
            }
        } catch (err) {
            console.error('Fetch driver profile error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPwMessage({ text: 'New passwords do not match.', isError: true });
            return;
        }
        if (newPassword.length < 6) {
            setPwMessage({ text: 'Password must be at least 6 characters.', isError: true });
            return;
        }

        setPwLoading(true);
        setPwMessage(null);
        try {
            const res = await api.put('/auth/profile', {
                currentPassword: oldPassword,
                password: newPassword
            });
            if (res.data) {
                setPwMessage({ text: 'Password changed successfully.', isError: false });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setPwMessage({ text: err.response?.data?.message || 'Failed to update password.', isError: true });
        } finally {
            setPwLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Driver Profile...</p>
            </div>
        );
    }

    const isLicenseExpired = profile?.licenseExpiryDate && new Date(profile.licenseExpiryDate) < new Date();
    const daysUntilExpiry = profile?.licenseExpiryDate
        ? Math.ceil((new Date(profile.licenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="space-y-5 max-w-2xl mx-auto">
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/30 flex-shrink-0 overflow-hidden">
                    {profile?.photoUrl ? (
                        <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                        profile?.name?.charAt(0)?.toUpperCase() || 'D'
                    )}
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {profile?.name}
                        </h2>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            profile?.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                            {profile?.status || 'Active'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono font-medium">
                        ID: {profile?.staff_id || profile?._id?.slice(-6)?.toUpperCase()} • {profile?.phone}
                    </p>
                    <p className="text-xs text-slate-400">
                        {profile?.email || user?.email}
                    </p>
                </div>
            </div>

            {/* Driving Licence & Compliance Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Driving Licence & Authorization
                        </h3>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isLicenseExpired ? 'bg-rose-100 text-rose-700' :
                        (daysUntilExpiry !== null && daysUntilExpiry <= 30) ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                    }`}>
                        {isLicenseExpired ? 'Expired' : (daysUntilExpiry !== null && daysUntilExpiry <= 30) ? `Expires in ${daysUntilExpiry}d` : 'Valid Licence'}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Licence No</span>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5 block">
                            {profile?.licenseNumber}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Licence Category</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                            {profile?.licenseType || 'Commercial'}
                        </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Expiry Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {profile?.licenseExpiryDate ? new Date(profile.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </div>

                {profile?.address && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{profile.address}</span>
                    </div>
                )}

                {profile?.emergencyPhone && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-rose-500" />
                            <span className="font-bold text-slate-700 dark:text-slate-300">Emergency Relative Contact:</span>
                        </div>
                        <a href={`tel:${profile.emergencyPhone}`} className="font-mono font-bold text-rose-600 hover:underline">
                            {profile.emergencyPhone}
                        </a>
                    </div>
                )}
            </div>

            {/* Assigned Fleet Asset Card */}
            {vehicle && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Current Company Vehicle
                        </h3>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <div>
                            <p className="font-black text-sm text-slate-900 dark:text-white font-mono">{vehicle.registrationNumber}</p>
                            <p className="text-slate-400">{vehicle.vehicleName} • {vehicle.vehicleType}</p>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded-full font-black uppercase">
                            {vehicle.status}
                        </span>
                    </div>
                </div>
            )}

            {/* Change Portal Password Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Key className="w-4 h-4 text-blue-600" />
                    <h3 className="font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Driver Portal Security & Password
                    </h3>
                </div>

                {pwMessage && (
                    <div className={`p-3 rounded-2xl border ${
                        pwMessage.isError ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                        {pwMessage.text}
                    </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Current Password *</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">New Password *</label>
                            <input
                                type="password"
                                required
                                minLength="6"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Confirm New Password *</label>
                            <input
                                type="password"
                                required
                                minLength="6"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={pwLoading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
                        >
                            {pwLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DriverProfile;
