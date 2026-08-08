import React, { useState, useEffect } from 'react';
import { X, Download, Printer, Share2, FileText, Clock, CheckCircle, XCircle, ChevronDown, Loader } from 'lucide-react';
import api from '../services/api';
import { downloadResidencyAcknowledgement, printResidencyAcknowledgement } from '../utils/residencyAcknowledgementPdf';

const STATUS_BADGE = {
    ACTIVE:       'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELLED:    'bg-red-100 text-red-700 border-red-200',
    'CHECKED OUT':'bg-indigo-100 text-indigo-700 border-indigo-200',
    PENDING:      'bg-amber-100 text-amber-700 border-amber-200',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatINR = (n) => n != null ? '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '₹0.00';

export default function ResidencyAcknowledgementModal({ bookingId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [showVersions, setShowVersions] = useState(false);

    useEffect(() => {
        if (!bookingId) return;
        setLoading(true);
        setError(null);
        api.get(`/bookings/${bookingId}/acknowledgement`)
            .then(r => setData(r.data))
            .catch((err) => {
                console.error('[ACK-MODAL] Failed to load residency acknowledgement:', err);
                const msg = err.response?.data?.message || 'Could not load acknowledgement details.';
                setError(msg);
            })
            .finally(() => setLoading(false));
    }, [bookingId]);

    const handleDownload = async () => {
        if (!data) return;
        setGenerating(true);
        try { await downloadResidencyAcknowledgement(data); }
        catch (e) { alert('PDF generation failed: ' + e.message); }
        finally { setGenerating(false); }
    };

    const handlePrint = async () => {
        if (!data) return;
        setGenerating(true);
        try { await printResidencyAcknowledgement(data); }
        catch (e) { alert('Print failed: ' + e.message); }
        finally { setGenerating(false); }
    };

    const handleShare = async () => {
        const basePath = window.location.hash ? `${window.location.origin}${window.location.pathname}#/lodge/verify-booking/${bookingId}` : `${window.location.origin}/lodge/verify-booking/${bookingId}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Residency Acknowledgement', text: `Verify booking at ${data?.lodge?.name || 'Krishna Lodge'}`, url: basePath });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    navigator.clipboard.writeText(basePath);
                    alert('Verification link copied to clipboard!');
                }
            }
        } else {
            navigator.clipboard.writeText(basePath);
            alert('Verification link copied to clipboard!');
        }
    };

    const docStatus = data?.booking?.docStatus || 'ACTIVE';
    const statusBadge = STATUS_BADGE[docStatus] || STATUS_BADGE.PENDING;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in duration-300 relative">

                {/* Header */}
                <div className="bg-slate-900 px-8 py-6 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-white font-black text-xl tracking-tight">Residency Acknowledgement</h2>
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Official Booking Agreement — Krishna Lodge & Residency</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Loading acknowledgement...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <XCircle className="w-12 h-12 text-red-400" />
                            <p className="text-slate-700 dark:text-slate-300 font-bold">{error}</p>
                        </div>
                    ) : data ? (
                        <div className="p-8 space-y-6">
                            {/* Status Banner */}
                            <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${statusBadge}`}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5" />
                                    <div>
                                        <p className="font-black text-sm uppercase tracking-widest">{docStatus}</p>
                                        <p className="text-xs font-bold opacity-70">Agreement No: {data.booking?.agreementNumber || '-'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-sm">v{data.booking?.acknowledgementVersion || 1}.0</p>
                                    <p className="text-xs font-bold opacity-70">Generated: {fmtDate(new Date())}</p>
                                </div>
                            </div>

                            {/* Quick Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: 'Tenant', value: data.tenant?.name || '-' },
                                    { label: 'Room', value: `Room ${data.room?.roomNumber || '-'} · ${data.room?.type || '-'}` },
                                    { label: 'Building', value: `${data.room?.building || '-'}, ${data.room?.floor || '-'}` },
                                    { label: 'Check-In', value: fmtDate(data.booking?.checkIn) },
                                    { label: 'Check-Out', value: fmtDate(data.booking?.checkOut) },
                                    { label: 'Days Remaining', value: `${data.booking?.daysRemaining ?? '-'} Days` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                        <p className="font-black text-slate-900 dark:text-white text-sm">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">Financial Summary</h3>
                                {[
                                    ['Monthly Rent', formatINR(data.room?.monthlyRent)],
                                    ['Security Deposit', formatINR(data.room?.securityDeposit)],
                                    ['Total Paid', formatINR(data.booking?.totalPaid)],
                                    ['Outstanding Balance', formatINR(data.booking?.outstanding)],
                                    ['Next Due Date', fmtDate(data.booking?.nextDueDate)],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold">{k}</span>
                                        <span className="font-black text-slate-900 dark:text-white">{v}</span>
                                    </div>
                                ))}
                                <div className={`flex justify-between items-center text-sm pt-3 border-t border-slate-200 dark:border-slate-700 ${data.booking?.outstanding <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    <span className="font-black uppercase tracking-wider">Payment Status</span>
                                    <span className="font-black">{data.booking?.outstanding <= 0 ? '✓ FULLY PAID' : `BALANCE DUE: ${formatINR(data.booking?.outstanding)}`}</span>
                                </div>
                            </div>

                            {/* Lodge Policies Preview */}
                            {data.policies && (
                                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 space-y-2">
                                    <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest mb-3">Agreement Terms (Summary)</h3>
                                    {Object.entries(data.policies).slice(0, 4).map(([k, v]) => (
                                        <p key={k} className="text-xs text-indigo-700 font-medium">• {v}</p>
                                    ))}
                                    <p className="text-[10px] text-indigo-400 font-bold mt-2">+ more terms included in the downloaded PDF</p>
                                </div>
                            )}

                            {/* Version History */}
                            {data.booking?.versionHistory?.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowVersions(v => !v)}
                                        className="flex items-center gap-2 text-sm font-black text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Version History ({data.booking.versionHistory.length})
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showVersions ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showVersions && (
                                        <div className="mt-3 space-y-2">
                                            {data.booking.versionHistory.map((v) => (
                                                <div key={v.version} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <span className="font-black text-indigo-600">v{v.version}.0</span>
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{v.reason}</span>
                                                    <span className="text-slate-400">{fmtDate(v.generatedAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Action Bar */}
                <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-5 flex items-center gap-3 flex-wrap shrink-0">
                    <button
                        onClick={handleDownload}
                        disabled={!data || generating}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download PDF
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={!data || generating}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={!data}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                    >
                        <Share2 className="w-4 h-4" /> Share Verification Link
                    </button>
                </div>
            </div>
        </div>
    );
}
