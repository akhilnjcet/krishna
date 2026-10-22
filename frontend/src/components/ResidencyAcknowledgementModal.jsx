import React, { useState, useEffect } from 'react';
import { 
    X, Download, Printer, Share2, FileText, Clock, CheckCircle, 
    XCircle, ChevronDown, ChevronUp, Loader, Languages, ShieldCheck, Check
} from 'lucide-react';
import api from '../services/api';
import { 
    downloadResidencyAcknowledgement, 
    printResidencyAcknowledgement,
    RESIDENCY_TERMS_ML,
    RESIDENCY_TERMS_EN,
    formatINRDisplay
} from '../utils/residencyAcknowledgementPdf';

const STATUS_BADGE = {
    ACTIVE:       'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELLED:    'bg-red-100 text-red-700 border-red-200',
    'CHECKED OUT':'bg-indigo-100 text-indigo-700 border-indigo-200',
    PENDING:      'bg-amber-100 text-amber-700 border-amber-200',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function ResidencyAcknowledgementModal({ bookingId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [showVersions, setShowVersions] = useState(false);
    
    // Language selection: 'ml' (Malayalam) or 'en' (English)
    const [language, setLanguage] = useState('ml');
    const [showAllTerms, setShowAllTerms] = useState(false);

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
        try { 
            await downloadResidencyAcknowledgement(data, language); 
        } catch (e) { 
            alert('PDF generation failed: ' + e.message); 
        } finally { 
            setGenerating(false); 
        }
    };

    const handlePrint = async () => {
        if (!data) return;
        setGenerating(true);
        try { 
            await printResidencyAcknowledgement(data, language); 
        } catch (e) { 
            alert('Print failed: ' + e.message); 
        } finally { 
            setGenerating(false); 
        }
    };

    const handleShare = async () => {
        const basePath = window.location.hash 
            ? `${window.location.origin}${window.location.pathname}#/lodge/verify-booking/${bookingId}` 
            : `${window.location.origin}/lodge/verify-booking/${bookingId}`;
        if (navigator.share) {
            try {
                await navigator.share({ 
                    title: 'Residency Acknowledgement', 
                    text: `Verify booking at ${data?.lodge?.name || 'Krishna Lodge'}`, 
                    url: basePath 
                });
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

    const termsList = language === 'ml' ? RESIDENCY_TERMS_ML : RESIDENCY_TERMS_EN;
    const displayedTerms = showAllTerms ? termsList : termsList.slice(0, 4);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overscroll-contain">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl max-h-[96dvh] sm:max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in duration-300 relative border border-slate-200 dark:border-slate-800">

                {/* Header */}
                <div className="bg-slate-900 px-4 sm:px-8 py-4 sm:py-5 flex items-start justify-between shrink-0 border-b border-slate-800 gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                            <h2 className="text-white font-black text-base sm:text-xl tracking-tight truncate">Residency Acknowledgement</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate">
                            Official Booking Agreement — Krishna Lodge & Residency
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                        aria-label="Close modal"
                    >
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
                        <div className="p-5 sm:p-8 space-y-6">

                            {/* Language Selector Pill */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 p-2 rounded-2xl border border-indigo-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                <div className="flex items-center gap-2 pl-2">
                                    <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Print / PDF Language
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                            {language === 'ml' ? 'മലയാളം (Pure Malayalam - 18 നിബന്ധനകൾ)' : 'English (18 Statutory Clauses)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 self-stretch sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setLanguage('ml')}
                                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                            language === 'ml'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                                        }`}
                                    >
                                        {language === 'ml' && <Check className="w-3 h-3 stroke-[3]" />}
                                        മലയാളം
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLanguage('en')}
                                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                            language === 'en'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                                        }`}
                                    >
                                        {language === 'en' && <Check className="w-3 h-3 stroke-[3]" />}
                                        English
                                    </button>
                                </div>
                            </div>

                            {/* Status Banner */}
                            <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${statusBadge}`}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 shrink-0" />
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                {[
                                    { label: 'Tenant', value: data.tenant?.name || '-' },
                                    { label: 'Room', value: `Room ${data.room?.roomNumber || '-'} · ${data.room?.type || '-'}` },
                                    { label: 'Building', value: `${data.room?.building || '-'}, ${data.room?.floor || '-'}` },
                                    { label: 'Check-In', value: fmtDate(data.booking?.checkIn) },
                                    { label: 'Check-Out', value: fmtDate(data.booking?.checkOut) },
                                    { label: 'Days Remaining', value: `${data.booking?.daysRemaining ?? '-'} Days` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                        <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Checkout Clearance Summary (if checked out) */}
                            {(data.booking?.status === 'completed' || data.booking?.actualCheckOut) && (
                                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            <h3 className="font-black text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm uppercase tracking-wider">
                                                Checkout Clearance & Tenancy Closure
                                            </h3>
                                        </div>
                                        <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            Completed Stay
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-800">
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Actual Check-Out</span>
                                            <span className="font-black text-slate-900 dark:text-white">
                                                {fmtDate(data.booking?.actualCheckOut || data.booking?.checkOut)}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-800">
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase">Closure / Notes</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {data.booking?.checkoutNotes || 'Keys handed over and premises inspected.'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Financial Summary */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-widest">Financial Summary</h3>
                                {[
                                    ['Monthly Rent', formatINRDisplay(data.room?.monthlyRent || data.booking?.totalAmount)],
                                    ['Security Deposit', formatINRDisplay(data.booking?.securityDeposit || data.room?.securityDeposit)],
                                    ['Total Paid by Tenant', formatINRDisplay(data.booking?.totalPaid)],
                                    ...(data.booking?.totalRefunded > 0 ? [['Refunds / Deposit Returned', `- ${formatINRDisplay(data.booking?.totalRefunded)}`]] : []),
                                    ...(data.booking?.totalRefunded > 0 ? [['Net Paid', formatINRDisplay(data.booking?.netPaid)]] : []),
                                    ['Outstanding Balance', formatINRDisplay(data.booking?.outstanding)],
                                    ['Next Due Date', fmtDate(data.booking?.nextDueDate)],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center text-xs sm:text-sm">
                                        <span className="text-slate-500 dark:text-slate-400 font-bold">{k}</span>
                                        <span className="font-black text-slate-900 dark:text-white">{v}</span>
                                    </div>
                                ))}
                                <div className={`flex justify-between items-center text-xs sm:text-sm pt-3 border-t border-slate-200 dark:border-slate-700 ${(data.booking?.outstanding || 0) <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                    <span className="font-black uppercase tracking-wider">Payment Status</span>
                                    <span className="font-black">{(data.booking?.outstanding || 0) <= 0 ? '✓ FULLY PAID / CLEARED' : `BALANCE DUE: ${formatINRDisplay(data.booking?.outstanding)}`}</span>
                                </div>
                            </div>

                            {/* Itemized Payment & Refund Records */}
                            {((data.booking?.paymentsList && data.booking.paymentsList.length > 0) || (data.booking?.refundsList && data.booking.refundsList.length > 0)) && (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-widest">
                                            Payment & Transaction Records ({((data.booking?.paymentsList?.length || 0) + (data.booking?.refundsList?.length || 0))})
                                        </h3>
                                    </div>
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {data.booking?.paymentsList?.map((p) => (
                                            <div key={p._id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 dark:text-white">
                                                            {p.paymentType || p.chargeCategory || 'Rent Payment'}
                                                        </span>
                                                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">
                                                            {p.method}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {fmtDate(p.createdAt)} {p.referenceId ? `• Ref: ${p.referenceId}` : ''} {p.receiptNumber ? `• Rcpt: ${p.receiptNumber}` : ''} {p.verifiedByName ? `• By: ${p.verifiedByName}` : ''}
                                                    </p>
                                                </div>
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                    +{formatINRDisplay(p.amount)}
                                                </span>
                                            </div>
                                        ))}

                                        {data.booking?.refundsList?.map((r) => (
                                            <div key={r._id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-xs flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-red-600 dark:text-red-400">
                                                            Refund / Deposit Return
                                                        </span>
                                                        <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full uppercase">
                                                            {r.method}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {fmtDate(r.createdAt)} {r.referenceId ? `• Ref: ${r.referenceId}` : ''} {r.notes ? `• ${r.notes}` : ''}
                                                    </p>
                                                </div>
                                                <span className="font-black text-red-600 dark:text-red-400 text-sm">
                                                    -{formatINRDisplay(r.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 18 Terms & Conditions Preview */}
                            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="font-black text-indigo-900 dark:text-indigo-300 text-xs sm:text-sm uppercase tracking-wider">
                                            {language === 'ml' ? 'വാടകക്കരാർ നിബന്ധനകൾ (18 നിബന്ധനകൾ)' : 'Agreement Terms (18 Clauses)'}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllTerms(prev => !prev)}
                                        className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                        {showAllTerms ? (
                                            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                                        ) : (
                                            <>View All 18 <ChevronDown className="w-3.5 h-3.5" /></>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                                    {displayedTerms.map((t) => (
                                        <div key={t.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100/60 dark:border-slate-800 shadow-2xs">
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                                                {t.id}. {t.title}
                                            </p>
                                            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {typeof t.text === 'function' ? t.text(data) : t.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {!showAllTerms && (
                                    <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-bold text-center pt-1 cursor-pointer" onClick={() => setShowAllTerms(true)}>
                                        + 14 more statutory clauses included in PDF & Print ({language === 'ml' ? 'മലയാളം' : 'English'})
                                    </p>
                                )}
                            </div>

                            {/* Version History */}
                            {data.booking?.versionHistory?.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setShowVersions(v => !v)}
                                        className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
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
                <div className="bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <button
                            onClick={handleDownload}
                            disabled={!data || generating}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 sm:px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95 touch-manipulation min-h-[42px]"
                            title={`Download PDF in ${language === 'ml' ? 'Malayalam' : 'English'}`}
                        >
                            {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span>Download PDF ({language === 'ml' ? 'മലയാളം' : 'EN'})</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={!data || generating}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white px-3 sm:px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 shadow-sm touch-manipulation min-h-[42px]"
                            title={`Print agreement in ${language === 'ml' ? 'Malayalam' : 'English'}`}
                        >
                            <Printer className="w-4 h-4" /> <span>Print ({language === 'ml' ? 'മലയാളം' : 'EN'})</span>
                        </button>
                    </div>

                    <button
                        onClick={handleShare}
                        disabled={!data}
                        className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 shadow-sm touch-manipulation min-h-[42px]"
                    >
                        <Share2 className="w-4 h-4" /> <span>Share Link</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
