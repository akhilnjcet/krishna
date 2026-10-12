import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Shield, ArrowLeft, Printer, Calendar, RefreshCw, FileText, 
    Lock, CheckCircle, Mail, Phone, MapPin, ExternalLink, ShieldCheck 
} from 'lucide-react';
import api from '../services/api';

const PolicyViewer = ({ defaultType = 'privacy' }) => {
    const [policyType, setPolicyType] = useState(defaultType);
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setPolicyType(defaultType);
    }, [defaultType]);

    useEffect(() => {
        const fetchPolicy = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/policies/current/${policyType}`);
                if (res.data) {
                    setPolicy(res.data);
                }
            } catch (err) {
                console.warn('Failed to load current policy, falling back to public settings:', err);
                try {
                    const fallbackRes = await api.get('/settings/public');
                    if (fallbackRes.data) {
                        const key = policyType === 'privacy' ? 'footer_privacy' : 'footer_tos';
                        const setting = fallbackRes.data.find(s => s.key === key);
                        setPolicy({
                            policyType,
                            version: '1.0',
                            title: policyType === 'privacy' ? 'Krishna ERP Privacy Policy' : 'Krishna ERP Terms of Service',
                            content: setting?.value || 'Policy content currently updating.',
                            effectiveDate: new Date('2026-04-01'),
                            lastUpdated: new Date('2026-04-01')
                        });
                    }
                } catch (fallbackErr) {
                    setError('Unable to load policy directive. Please refresh.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPolicy();
        window.scrollTo(0, 0);
    }, [policyType]);

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'April 2026';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? 'April 2026' : d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'April 2026';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans py-12 md:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                
                {/* Top Action Bar (No-Print) */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 no-print">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-wider shadow-sm transition-all hover:-translate-x-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Tab Switcher */}
                        <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl flex gap-1">
                            <button
                                onClick={() => setPolicyType('privacy')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    policyType === 'privacy' 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Privacy Policy
                            </button>
                            <button
                                onClick={() => setPolicyType('terms')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    policyType === 'terms' 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Terms of Service
                            </button>
                        </div>

                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                            title="Print Document"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>

                {/* Main Policy Card Container */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden print:shadow-none print:border-none print:p-0"
                >
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-12 text-white relative overflow-hidden print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 print:hidden" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-blue-200 text-xs font-black uppercase tracking-[0.3em] mb-3 print:text-gray-600">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 print:text-black" />
                                Krishna Engineering Works • Official Directives
                            </div>

                            <h1 className="text-3xl sm:text-5xl font-black font-poppins tracking-tight mb-4">
                                {policy?.title || (policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service')}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-blue-100 print:text-gray-600 font-semibold pt-2 border-t border-white/15 print:border-gray-300">
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-75 uppercase tracking-wider text-[10px]">Revision:</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold print:border print:border-black">v{policy?.version || '1.0'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 opacity-75" />
                                    <span>Effective: {formatDate(policy?.effectiveDate)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 opacity-75" />
                                    <span>Last Updated: {formatDate(policy?.lastUpdated)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 sm:p-14">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-black uppercase tracking-widest">Loading Policy Directives...</span>
                            </div>
                        ) : error ? (
                            <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center text-sm font-bold">
                                {error}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {policy?.summary && (
                                    <div className="p-5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
                                            Summary Overview
                                        </div>
                                        <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {policy.summary}
                                        </p>
                                    </div>
                                )}

                                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line text-sm md:text-base">
                                    {policy?.content}
                                </div>

                                {/* Official Contact & DPO Section */}
                                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-4">
                                        Compliance & Data Protection Contact
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] uppercase text-slate-400 block font-black">Registered Entity</span>
                                                <span className="text-slate-800 dark:text-slate-200">Thiruvazhiyode, Sreekrishnapuram, Kerala 679514</span>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] uppercase text-slate-400 block font-black">Direct Support</span>
                                                <a href="tel:+919447940835" className="text-slate-800 dark:text-slate-200 hover:text-blue-600">+91 9447940835</a>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                            <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] uppercase text-slate-400 block font-black">Compliance Email</span>
                                                <a href="mailto:akhilnadiluveettil@gmail.com" className="text-slate-800 dark:text-slate-200 hover:text-blue-600 break-all">akhilnadiluveettil@gmail.com</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Footer Notice (No-print) */}
                <div className="mt-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold no-print">
                    <p>© {new Date().getFullYear()} Krishna Engineering Works. All legal and intellectual property rights reserved.</p>
                </div>

            </div>
        </div>
    );
};

export default PolicyViewer;
