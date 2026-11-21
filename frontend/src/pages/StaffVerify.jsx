import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, XCircle, CheckCircle, Clock, Building2, Phone, User, Calendar, Truck, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { getDirectImageUrl } from '../utils/imageUtils';

export default function StaffVerify() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/staff/verify/${id}`)
            .then(res => setData(res.data))
            .catch(err => {
                console.error('[STAFF-VERIFY] Failed to verify credential:', err);
                setError(err.response?.data?.message || 'Employee identity credential could not be verified or is revoked.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">
                        Verifying Employee Credentials...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data?.valid) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 max-w-md w-full border border-red-900/40 shadow-2xl space-y-4">
                    <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
                    <h1 className="text-2xl font-black text-white">Verification Failed</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {error || 'This credential could not be authenticated against the active Krishna Engineering Works staff registry.'}
                    </p>
                    <div className="pt-4 border-t border-slate-800">
                        <Link 
                            to="/" 
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
                        >
                            <ArrowLeft className="w-4 h-4" /> Return to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isDriver = data.role === 'driver' || (data.designation && data.designation.toLowerCase().includes('driver'));

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl relative overflow-hidden text-left">
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Verification Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/30">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-1">
                            <CheckCircle className="w-3 h-3" /> VERIFIED AUTHENTIC
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                            Krishna Engineering Works
                        </h2>
                        <p className="text-xs text-slate-400">Official Personnel Verification Ledger</p>
                    </div>
                </div>

                {/* Profile Card Summary */}
                <div className="py-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-slate-800 text-center sm:text-left">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 shrink-0 shadow-lg">
                        <img 
                            src={getDirectImageUrl(data.profilePhoto) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'} 
                            alt={data.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
                            }}
                        />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-900/60">
                                {data.staff_id}
                            </span>
                            {isDriver && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                                    <Truck className="w-2.5 h-2.5" /> Driver
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                                {data.status || 'Active'}
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-white capitalize">{data.name}</h3>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                            {data.designation || (isDriver ? 'Driver' : 'Staff Member')}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            {data.department || (isDriver ? 'Logistics & Fleet' : 'Operations')}
                        </p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="py-6 space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Classification</span>
                        <span className="font-bold text-white uppercase">{data.staffClassification || 'Staff Account'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Staff ID</span>
                        <span className="font-mono font-bold text-white">{data.staff_id}</span>
                    </div>
                    {data.bloodGroup && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <span className="text-slate-400 font-medium">Blood Group</span>
                            <span className="font-bold text-rose-400">🩸 {data.bloodGroup}</span>
                        </div>
                    )}
                    {data.licenseNumber && (
                        <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                            <span className="text-slate-400 font-medium">Commercial Licence</span>
                            <span className="font-mono font-bold text-cyan-300">{data.licenseNumber}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Issuing Enterprise</span>
                        <span className="font-bold text-white">Krishna Engineering Works</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Official Contact</span>
                        <span className="font-bold text-slate-300">{data.officialContact || '+91 98765 43210'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Verified Timestamp</span>
                        <span className="font-mono text-slate-400 text-[11px]">{new Date(data.verifiedAt || Date.now()).toLocaleString()}</span>
                    </div>
                </div>

                {/* Footer Return Action */}
                <div className="pt-2 text-center">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Krishna Engineering Portal
                    </Link>
                </div>
            </div>
        </div>
    );
}
