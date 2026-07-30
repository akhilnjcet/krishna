import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, Calendar, Building, User, QrCode, Loader } from 'lucide-react';
import api from '../../services/api';

const STATUS_CONFIG = {
    ACTIVE:       { color: 'emerald', icon: CheckCircle, label: 'ACTIVE RESIDENCY' },
    CANCELLED:    { color: 'red',     icon: XCircle,    label: 'CANCELLED' },
    'CHECKED OUT':{ color: 'indigo',  icon: CheckCircle, label: 'CHECKED OUT' },
    PENDING:      { color: 'amber',   icon: Clock,      label: 'PENDING' },
};

export default function BookingVerify() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/bookings/${id}/verify`)
            .then(r => setData(r.data))
            .catch((err) => {
                console.error('[VERIFY-PAGE] Failed to verify booking:', err);
                setError(err.response?.data?.message || 'Booking not found or verification failed.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Verifying Booking...</p>
            </div>
        </div>
    );

    if (error || !data?.valid) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="bg-slate-900 rounded-[2rem] p-12 max-w-md w-full text-center border border-red-900/30 shadow-2xl">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h1 className="text-2xl font-black text-white mb-2">Verification Failed</h1>
                <p className="text-slate-400 font-medium">{error || 'This booking could not be verified. The QR code may be invalid or expired.'}</p>
            </div>
        </div>
    );

    const cfg = STATUS_CONFIG[data.docStatus] || STATUS_CONFIG.PENDING;
    const StatusIcon = cfg.icon;
    const colorClass = {
        emerald: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
        red:     { badge: 'bg-red-500/20 text-red-400 border-red-500/30',           icon: 'text-red-400',     glow: 'shadow-red-500/20' },
        indigo:  { badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',  icon: 'text-indigo-400',  glow: 'shadow-indigo-500/20' },
        amber:   { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',     icon: 'text-amber-400',   glow: 'shadow-amber-500/20' },
    }[cfg.color];

    const Row = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-4 py-4 border-b border-slate-800 last:border-0">
            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                <p className="font-bold text-white mt-0.5">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/30">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Booking Verification</h1>
                    <p className="text-slate-400 font-medium mt-1">Krishna Lodge & Residency — Official Digital Verification</p>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center justify-center gap-3 py-4 rounded-2xl border ${colorClass.badge} shadow-xl ${colorClass.glow}`}>
                    <StatusIcon className={`w-6 h-6 ${colorClass.icon}`} />
                    <span className="font-black text-lg tracking-widest uppercase">{cfg.label}</span>
                </div>

                {/* Details Card */}
                <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-2xl">
                    <Row icon={QrCode}    label="Agreement Number"  value={data.agreementNumber || '-'} />
                    <Row icon={User}      label="Tenant"            value={data.tenant} />
                    <Row icon={Building}  label="Room"              value={data.room || '-'} />
                    <Row icon={Calendar}  label="Check-In"          value={data.checkIn ? new Date(data.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />
                    <Row icon={Calendar}  label="Check-Out"         value={data.checkOut ? new Date(data.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />
                    <Row icon={Clock}     label="Days Remaining"    value={`${data.daysRemaining ?? 0} Days`} />
                </div>

                {/* Verified Footer */}
                <div className="text-center space-y-1">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                        ✓ Verified at {data.verifiedAt ? new Date(data.verifiedAt).toLocaleString('en-IN') : '-'}
                    </p>
                    <p className="text-slate-600 text-[10px]">Krishna Lodge & Residency · Authentic Document Verification System</p>
                </div>
            </div>
        </div>
    );
}
