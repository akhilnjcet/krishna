import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, ShieldAlert, KeyRound, Mail, Lock, 
    RefreshCw, CheckCircle2, XCircle, Database, FileText, 
    Layers, Users, Receipt, Clock, ChevronDown, ChevronRight, 
    ShieldCheck, Eye, EyeOff, Loader2, History, ArrowRight,
    Server, Check, AlertOctagon, CornerDownRight, Download
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

const MasterResetHub = () => {
    const { user } = useAuthStore();
    const [previewLoading, setPreviewLoading] = useState(true);
    const [previewData, setPreviewData] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [historyList, setHistoryList] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Modal & Wizard State
    // Steps: 'IDLE' | 'AUTH_MODAL' | 'CONFIRM_MODAL' | 'EXECUTING' | 'SUMMARY'
    const [wizardStep, setWizardStep] = useState('IDLE');

    // Step 2: Auth State
    const [otpDispatched, setOtpDispatched] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [countdown, setCountdown] = useState(300);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Step 3: Confirmation State
    const [resetToken, setResetToken] = useState('');
    const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
    const [confirmationPhrase, setConfirmationPhrase] = useState('');
    const [secondConfirmChecked, setSecondConfirmChecked] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [executionError, setExecutionError] = useState('');

    // Step 4: Summary State
    const [resetSummary, setResetSummary] = useState(null);

    // Accordion Expansion for Category Preview
    const [expandedCategory, setExpandedCategory] = useState(null);

    const REQUIRED_PHRASE = "RESET BUSINESS DATA";

    // Fetch Preview & Audit History
    const fetchPreview = useCallback(async () => {
        setPreviewLoading(true);
        setErrorMsg('');
        try {
            const res = await api.get('/admin/reset/preview');
            if (res.data?.success) {
                setPreviewData(res.data);
                if (res.data.recentAudits) {
                    setHistoryList(res.data.recentAudits);
                }
            }
        } catch (err) {
            console.error('Failed to load reset preview:', err);
            setErrorMsg(err.response?.data?.message || err.message || 'Unable to load reset preview telemetry.');
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPreview();
    }, [fetchPreview]);

    // OTP Countdown Timer
    useEffect(() => {
        let timer = null;
        if (otpDispatched && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [otpDispatched, countdown]);

    // Start Flow: Open Auth Modal & Request OTP
    const handleStartResetFlow = async () => {
        setWizardStep('AUTH_MODAL');
        setPasswordInput('');
        setOtpInput('');
        setAuthError('');
        setOtpDispatched(false);
        setOtpLoading(true);

        try {
            const res = await api.post('/admin/reset/request-otp');
            if (res.data?.success) {
                setSessionId(res.data.sessionId);
                setMaskedEmail(res.data.emailMasked);
                setOtpDispatched(true);
                setCountdown(res.data.expiresInSeconds || 300);
            }
        } catch (err) {
            console.error('Error requesting reset OTP:', err);
            setAuthError(err.response?.data?.message || err.message || 'Failed to dispatch email verification code.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        setOtpLoading(true);
        setAuthError('');
        try {
            const res = await api.post('/admin/reset/request-otp');
            if (res.data?.success) {
                setSessionId(res.data.sessionId);
                setMaskedEmail(res.data.emailMasked);
                setOtpDispatched(true);
                setCountdown(300);
            }
        } catch (err) {
            setAuthError(err.response?.data?.message || 'Failed to resend code.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Verify Password and OTP
    const handleVerifyCredentials = async (e) => {
        e?.preventDefault();
        if (!passwordInput.trim()) {
            setAuthError('Please enter your administrator login password.');
            return;
        }
        if (!otpInput.trim() || otpInput.trim().length < 6) {
            setAuthError('Please enter the 6-digit verification code received on your email.');
            return;
        }

        setVerifyLoading(true);
        setAuthError('');
        try {
            const res = await api.post('/admin/reset/verify-credentials', {
                sessionId,
                password: passwordInput,
                otp: otpInput.trim()
            });

            if (res.data?.success && res.data.resetToken) {
                setResetToken(res.data.resetToken);
                setTokenExpiresAt(res.data.expiresAt);
                setWizardStep('CONFIRM_MODAL');
                setConfirmationPhrase('');
                setSecondConfirmChecked(false);
                setExecutionError('');
            }
        } catch (err) {
            console.error('Verification failure:', err);
            setAuthError(err.response?.data?.message || err.message || 'Credentials verification failed.');
        } finally {
            setVerifyLoading(false);
        }
    };

    // Execute Final Reset
    const handleExecuteReset = async () => {
        if (confirmationPhrase.trim() !== REQUIRED_PHRASE) {
            setExecutionError(`You must type the phrase exactly: ${REQUIRED_PHRASE}`);
            return;
        }
        if (!secondConfirmChecked) {
            setExecutionError('You must explicitly confirm understanding by checking the acknowledgment checkbox.');
            return;
        }

        setExecuting(true);
        setExecutionError('');
        try {
            const res = await api.post('/admin/reset/execute', {
                resetToken,
                confirmationPhrase: confirmationPhrase.trim(),
                confirmed: true
            });

            if (res.data?.success) {
                setResetSummary(res.data.summary);
                setWizardStep('SUMMARY');
                fetchPreview(); // Refresh preview counts
            }
        } catch (err) {
            console.error('Execution failure:', err);
            setExecutionError(err.response?.data?.message || err.message || 'Master Reset execution aborted.');
        } finally {
            setExecuting(false);
        }
    };

    // Close or Cancel Modal
    const handleCloseModal = async () => {
        if (sessionId && wizardStep === 'AUTH_MODAL') {
            api.post('/admin/reset/cancel', { sessionId }).catch(() => {});
        }
        setWizardStep('IDLE');
        setResetToken('');
        setPasswordInput('');
        setOtpInput('');
        setConfirmationPhrase('');
        setSecondConfirmChecked(false);
        setAuthError('');
        setExecutionError('');
    };

    const formatTimer = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-10 selection:bg-rose-500 selection:text-white">
            
            {/* Top Security Banner */}
            <div className="p-8 md:p-10 bg-gradient-to-br from-rose-950/40 via-black to-slate-950/60 border border-rose-500/20 rounded-[2.5rem] backdrop-blur-2xl relative overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.08)]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none animate-pulse" />
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-600 rounded-l-[2.5rem]" />
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div className="space-y-3 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-rose-400">
                            <ShieldAlert className="w-3.5 h-3.5" /> High-Privilege Directives
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white italic">
                            Master Reset / <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300">Fresh Start Engine</span>
                        </h2>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                            Permanently clears test and operational business data across Lodge Manager, Financial transactions, Staff records, and Project logs. 
                            <span className="text-amber-400 font-bold ml-1">
                                System directives, branding configuration, user accounts, and administrator credentials remain 100% intact.
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                        >
                            <History className="w-4 h-4 text-amber-400" />
                            {showHistory ? 'Hide Audit Log' : 'Audit History'}
                        </button>
                        <button
                            onClick={handleStartResetFlow}
                            disabled={previewLoading || previewData?.isResetInProgress}
                            className="px-8 py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl shadow-xl shadow-rose-900/30 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Initialize Fresh Start
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Auto Pre-Deletion Backup Active
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> 2FA (Password + Email OTP) Required
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                            Single-Use Token Protection
                        </span>
                    </div>
                    {previewData && (
                        <div className="text-amber-400 font-bold">
                            {previewData.totalOperationalRecords} Operational Records Queued for Purge
                        </div>
                    )}
                </div>
            </div>

            {/* Error banner if preview failed */}
            {errorMsg && (
                <div className="p-5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Historical Audit Trail Drawer */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-8 bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden space-y-6 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <History className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Master Reset Audit Trail
                            </h3>
                            <span className="text-[10px] font-mono text-slate-500">Immutable Compliance Logs</span>
                        </div>

                        {historyList.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs font-mono">
                                No prior Master Reset events recorded on this system.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/10 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            <th className="pb-3">Timestamp</th>
                                            <th className="pb-3">Administrator</th>
                                            <th className="pb-3">Backup Reference</th>
                                            <th className="pb-3">Records Cleared</th>
                                            <th className="pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {historyList.map(item => (
                                            <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                <td className="py-3 text-slate-700 dark:text-slate-300">
                                                    {new Date(item.executedAt).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-slate-700 dark:text-slate-300">
                                                    {item.adminName} ({item.adminEmail})
                                                </td>
                                                <td className="py-3 text-amber-600 dark:text-amber-400 font-bold">
                                                    {item.backupReference}
                                                </td>
                                                <td className="py-3 text-rose-600 dark:text-rose-400 font-bold">
                                                    {item.totalRecordsDeleted || 0}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                        item.outcome === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                                    }`}>
                                                        {item.outcome}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scope Comparison Grid: Deleted vs Preserved */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 🔴 AFFECTED OPERATIONAL DATA (DELETED) */}
                <div className="lg:col-span-7 p-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl space-y-6 shadow-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                                <AlertOctagon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                                    Operational & Business Data
                                </h3>
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-widest">
                                    Targeted for Permanent Fresh Start Purge
                                </p>
                            </div>
                        </div>
                        {previewData && (
                            <span className="px-3 py-1 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 rounded-full font-mono text-xs font-bold">
                                {previewData.totalOperationalRecords} records
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        The reset permanently purges test transactions, draft estimates, tenant bookings, staff punch-ins, and activity logs. A complete pre-deletion database backup will be generated first.
                    </p>

                    {previewLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Analyzing Schema Metrics...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {previewData?.categories && Object.entries(previewData.categories).map(([key, cat]) => {
                                const isExpanded = expandedCategory === key;
                                return (
                                    <div 
                                        key={key}
                                        className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-2xl overflow-hidden transition-all"
                                    >
                                        <button
                                            onClick={() => setExpandedCategory(isExpanded ? null : key)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/[0.02]"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                )}
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{cat.title}</span>
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{cat.description}</span>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {cat.totalCount} records
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 pt-1 bg-slate-100/70 dark:bg-black/60 border-t border-slate-200 dark:border-white/5 space-y-2">
                                                {cat.items.map(subItem => (
                                                    <div key={subItem.modelName} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white dark:bg-white/[0.02]">
                                                        <span className="text-slate-700 dark:text-slate-300">{subItem.label}</span>
                                                        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{subItem.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 🟢 PROTECTED SYSTEM CORE (PRESERVED) */}
                <div className="lg:col-span-5 p-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl space-y-6 shadow-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                                    System Core & Access
                                </h3>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                                    Strictly Preserved (Zero Loss)
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-full font-mono text-[10px] font-bold uppercase">
                            Protected
                        </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        To guarantee zero downtime and zero lockouts, all administrative credentials, company directives, branding, and account registries are protected.
                    </p>

                    <div className="space-y-2.5">
                        {previewData?.protectedData?.summary?.map((prot, idx) => (
                            <div 
                                key={idx}
                                className="p-3 bg-slate-50 dark:bg-black/40 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs"
                            >
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <span>{prot.label}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {prot.count}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-[11px] text-emerald-900 dark:text-emerald-300 space-y-1">
                        <strong className="block text-emerald-700 dark:text-emerald-400">Zero Administrator Lockout Guarantee:</strong>
                        All login passwords, staff roles, authentication states, and company branding logos remain completely preserved after execution.
                    </div>
                </div>

            </div>

            {/* ── STEP 2: DUAL CREDENTIAL AUTHENTICATION MODAL ── */}
            <AnimatePresence>
                {wizardStep === 'AUTH_MODAL' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0b0c10] border border-rose-500/30 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                                        <KeyRound className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase text-white tracking-wider">
                                            Step 1 of 2: Administrator Authorization
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-mono">
                                            Re-Authentication & OTP Dispatch
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {authError && (
                                <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}

                            {/* Email OTP Info Card */}
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-amber-400" /> Dispatch Destination:
                                    </span>
                                    <span className="text-amber-400 font-mono font-bold">
                                        {maskedEmail || 'Verified Administrator Email'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                    <span>Code Expiration:</span>
                                    <span className={countdown < 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                        {formatTimer(countdown)}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleVerifyCredentials} className="space-y-4">
                                {/* Administrator Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" /> 1. Administrator Login Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            placeholder="Enter your current login password"
                                            className="w-full bg-black/60 border border-white/10 focus:border-rose-500 rounded-xl px-4 py-3 text-sm text-white outline-none font-mono"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-500">
                                        Verified securely against database authentication. Never logged or stored.
                                    </p>
                                </div>

                                {/* 6-Digit Email OTP */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5" /> 2. 6-Digit Email OTP
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleResendOTP}
                                            disabled={otpLoading || countdown > 240}
                                            className="text-[10px] text-amber-400 hover:text-amber-300 disabled:opacity-40 uppercase font-bold"
                                        >
                                            {otpLoading ? 'Dispatching...' : 'Resend Code'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full bg-black/60 border border-white/10 focus:border-rose-500 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-white outline-none font-bold"
                                        required
                                    />
                                    <p className="text-[9px] text-slate-500">
                                        Check your inbox or spam folder. Valid for single use within 5 minutes.
                                    </p>
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifyLoading || !passwordInput || otpInput.length < 6}
                                        className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {verifyLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                                            </>
                                        ) : (
                                            <>
                                                Verify & Continue <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── STEP 3: DOUBLE CONFIRMATION & EXECUTION SAFEGUARD MODAL ── */}
            <AnimatePresence>
                {wizardStep === 'CONFIRM_MODAL' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0b0c10] border border-rose-600/40 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-[0_0_60px_rgba(244,63,94,0.2)] relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-rose-600/30 text-rose-400 rounded-xl">
                                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase text-white tracking-wider">
                                            Step 2 of 2: Final Execution Safeguards
                                        </h3>
                                        <p className="text-[10px] text-rose-400 font-mono font-bold">
                                            Permanent Deletion Confirmation
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    disabled={executing}
                                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {executionError && (
                                <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                                        <span className="font-semibold">{executionError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleStartResetFlow}
                                        className="w-full py-2.5 px-4 bg-rose-600/30 hover:bg-rose-600 border border-rose-500/50 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Restart Verification & Request Fresh OTP
                                    </button>
                                </div>
                            )}

                            <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-2xl text-xs text-rose-200 space-y-2">
                                <p className="font-bold">
                                    ⚠️ Point of No Return:
                                </p>
                                <p className="text-[11px] leading-relaxed text-slate-300">
                                    Executing this command will perform an automatic full database backup to disk, then permanently delete all operational records across Lodge, Finance, Projects, and Staff. User logins and system settings will remain active.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Confirmation Phrase Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                        Type Confirmation Phrase: <span className="text-rose-400 font-mono font-bold select-all">{REQUIRED_PHRASE}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={confirmationPhrase}
                                        onChange={(e) => setConfirmationPhrase(e.target.value)}
                                        placeholder={REQUIRED_PHRASE}
                                        disabled={executing}
                                        className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-sm text-white outline-none font-mono tracking-wider font-bold ${
                                            confirmationPhrase.trim() === REQUIRED_PHRASE
                                                ? 'border-emerald-500 bg-emerald-950/10'
                                                : 'border-white/10 focus:border-rose-500'
                                        }`}
                                    />
                                    {confirmationPhrase.trim() === REQUIRED_PHRASE && (
                                        <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Phrase matched correctly.
                                        </p>
                                    )}
                                </div>

                                {/* Explicit Checkbox Confirmation */}
                                <label className="flex items-start gap-3 p-3.5 bg-black/40 border border-white/5 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={secondConfirmChecked}
                                        onChange={(e) => setSecondConfirmChecked(e.target.checked)}
                                        disabled={executing}
                                        className="mt-0.5 rounded border-white/20 text-rose-600 focus:ring-rose-500"
                                    />
                                    <span className="text-xs text-slate-300 leading-snug">
                                        I explicitly confirm execution of this Master Reset. I acknowledge that business records will be purged, and this operation is bound to a single-use token.
                                    </span>
                                </label>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={executing}
                                    className="px-5 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteReset}
                                    disabled={executing || confirmationPhrase.trim() !== REQUIRED_PHRASE || !secondConfirmChecked}
                                    className="px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-rose-900/40 transition-all disabled:opacity-50"
                                >
                                    {executing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Purging Data...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldAlert className="w-4 h-4" /> Execute Master Reset
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── STEP 5: COMPLETION & POST-RESET VERIFICATION MODAL ── */}
            <AnimatePresence>
                {wizardStep === 'SUMMARY' && resetSummary && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0b0c10] border border-emerald-500/30 rounded-3xl p-8 max-w-xl w-full space-y-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase text-white tracking-wider">
                                        Fresh Start Completed
                                    </h3>
                                    <p className="text-xs text-emerald-400 font-mono font-bold">
                                        Operational Records Cleared • Systems Intact
                                    </p>
                                </div>
                            </div>

                            {/* Backup Result Details */}
                            <div className="p-5 bg-black/60 border border-white/10 rounded-2xl space-y-3 font-mono text-xs">
                                <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-amber-400" /> Database Backup Guarantee
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-slate-300">
                                    <div>
                                        <span className="text-[10px] text-slate-500 block">Backup Reference</span>
                                        <span className="text-amber-400 font-bold">{resetSummary.backupReference}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 block">Backup Size</span>
                                        <span className="text-white font-bold">{resetSummary.backupSize}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-white/5">
                                    <span className="text-[10px] text-slate-500 block">Filesystem Location</span>
                                    <span className="text-slate-300 break-all text-[11px] select-all bg-white/5 px-2 py-1 rounded block mt-1">
                                        {resetSummary.backupLocation}
                                    </span>
                                </div>
                            </div>

                            {/* Purge Breakdown */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Records Cleared by Category:
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                    {Object.entries(resetSummary.deletedByCategory || {}).map(([k, c]) => (
                                        <div key={k} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                            <span className="text-[10px] text-slate-400 block truncate">{c.name}</span>
                                            <span className="text-rose-400 font-mono font-bold text-sm">{c.count} cleared</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Verification of Protected Data */}
                            <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
                                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Integrity Verification Confirmed:
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-300">
                                    <div>User Accounts: <strong className="text-emerald-400">{resetSummary.preservedVerification?.userAccountsCount}</strong></div>
                                    <div>System Settings: <strong className="text-emerald-400">{resetSummary.preservedVerification?.systemSettingsCount}</strong></div>
                                    <div className="text-emerald-400">{resetSummary.preservedVerification?.status}</div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Dismiss & Return to Dashboard
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default MasterResetHub;
