import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Star, ExternalLink, Copy, Check, ShieldCheck, 
    Sparkles, AlertCircle
} from 'lucide-react';
import api from '../services/api';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CfL2cyKPQ0ThEBI/review';

const SERVICE_SUGGESTIONS = [
    'Truss Work',
    'Roofing',
    'Sheet Roofing',
    'Welding',
    'Steel Fabrication',
    'Iron Doors',
    'Industrial Shed',
    'Gate & Grills'
];

const RATING_LABELS = {
    1: 'Needs Improvement',
    2: 'Fair Experience',
    3: 'Good Service',
    4: 'Very Good Quality',
    5: 'Outstanding Experience!'
};

const GoogleReviewSection = ({ className = '', id = 'rate-our-work' }) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);

    const [copied, setCopied] = useState(false);
    const [submittingInternal, setSubmittingInternal] = useState(false);
    const [internalSuccess, setInternalSuccess] = useState(null);
    const [googleModalOpen, setGoogleModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Toggle service tag selection
    const handleToggleService = (service) => {
        setSelectedServices(prev => {
            const exists = prev.includes(service);
            const updated = exists ? prev.filter(s => s !== service) : [...prev, service];

            // If comment is empty, offer friendly starter text mentioning selected service
            if (!comment.trim() && !exists) {
                setComment(`We engaged Krishna Engineering Works for ${service}. Excellent workmanship and timely completion.`);
            }

            return updated;
        });
    };

    // Copy review text to clipboard safely
    const copyReviewText = async () => {
        const textToCopy = comment.trim();
        if (!textToCopy) return false;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 4000);
                return true;
            }
        } catch (err) {
            console.warn('Clipboard write exception:', err);
        }
        return false;
    };

    // Handle primary action: Open Google Review in new tab
    const handlePostToGoogle = async () => {
        setErrorMsg(null);

        // Copy review text to clipboard if user wrote something
        if (comment.trim()) {
            await copyReviewText();
        }

        // Record review event in backend
        if (rating) {
            try {
                api.post('/feedback', {
                    rating,
                    comment,
                    services: selectedServices,
                    openedGoogleReview: true
                }).catch(e => console.warn('Internal feedback sync notice:', e));
            } catch (_err) {
                void _err;
            }
        }

        // Open Google's official review page in a new window/tab
        window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');

        // Show instructional modal
        setGoogleModalOpen(true);
    };

    // Handle secondary action: Submit internal feedback only
    const handleSubmitInternalOnly = async (e) => {
        e?.preventDefault();
        setErrorMsg(null);
        setSubmittingInternal(true);

        try {
            await api.post('/feedback', {
                rating,
                comment,
                services: selectedServices,
                openedGoogleReview: false
            });

            setInternalSuccess('Thank you! Your feedback has been safely shared with the Krishna Engineering team.');
            setTimeout(() => setInternalSuccess(null), 6000);
        } catch (err) {
            console.error('Failed to submit internal feedback:', err);
            setErrorMsg(err.response?.data?.message || 'Could not record feedback. Please try again.');
        } finally {
            setSubmittingInternal(false);
        }
    };

    const activeRating = hoverRating || rating;

    return (
        <section id={id} className={`py-16 md:py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900 border-y border-slate-200/60 dark:border-slate-800 transition-colors ${className}`}>
            {/* Ambient background blur */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[110px] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-4 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Official Google Reviews
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                        Rate Our Work & Share Your Experience
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
                        Your honest feedback inspires our team and helps future clients choose Krishna Engineering Works for their fabrication, welding, and roofing needs.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-slate-800">
                    
                    {/* Google Business Profile Trust Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 mb-8 border-b border-slate-100 dark:border-slate-800 gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm shrink-0">
                                {/* Google G Icon */}
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"/>
                                    <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.15 0 9.9 0 12s.45 3.85 1.24 5.41l4.04-3.13z"/>
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                                    Krishna Engineering Works
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                        Verified Business
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>Palakkad, Kerala</span>
                                    <span>•</span>
                                    <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> 4.8 / 5.0
                                    </span>
                                </p>
                            </div>
                        </div>

                        <a 
                            href={GOOGLE_REVIEW_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                            <span>Open Google Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    {/* Step 1: Five Star Rating Picker */}
                    <div className="mb-8 text-center sm:text-left">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                            Step 1: Select Your Star Rating
                        </label>
                        
                        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
                            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="p-1 sm:p-2 rounded-xl transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        aria-label={`Rate ${star} out of 5 stars`}
                                    >
                                        <Star 
                                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                                star <= activeRating 
                                                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]' 
                                                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-200'
                                            }`} 
                                        />
                                    </button>
                                ))}
                            </div>

                            <div className="text-center sm:text-left">
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                                    {RATING_LABELS[activeRating] || 'Click stars to rate'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {rating} of 5 Stars Selected
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Service Tags */}
                    <div className="mb-8">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                            Step 2: Select Services Provided (Click to tag)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SERVICE_SUGGESTIONS.map((service) => {
                                const isSelected = selectedServices.includes(service);
                                return (
                                    <button
                                        key={service}
                                        type="button"
                                        onClick={() => handleToggleService(service)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                            isSelected 
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                                        }`}
                                    >
                                        {isSelected && <span className="mr-1">✓</span>}
                                        {service}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Feedback Text Area */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Step 3: Write Your Feedback / Review
                            </label>
                            <span className="text-[11px] text-slate-400">
                                {comment.length} / 2000
                            </span>
                        </div>
                        <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                            placeholder="Share your experience: How was the quality of work, engineering precision, structural strength, welding finish, and delivery on time?"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm leading-relaxed"
                        />
                        
                        {/* Quick Clipboard Copy Helper */}
                        {comment.trim().length > 0 && (
                            <div className="flex items-center justify-between mt-2 text-xs">
                                <span className="text-slate-400 text-[11px]">
                                    💡 We'll automatically copy this text so you can paste it easily on Google.
                                </span>
                                <button
                                    type="button"
                                    onClick={copyReviewText}
                                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-bold"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-emerald-600">Copied to Clipboard!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Text</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>



                    {/* Error and Success Notifications */}
                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {internalSuccess && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>{internalSuccess}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {/* Primary Button: Open Google Review */}
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handlePostToGoogle}
                            className="flex-1 py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition-all"
                        >
                            {/* Google G icon */}
                            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.15 0 9.9 0 12s.45 3.85 1.24 5.41l4.04-3.13z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                            </svg>
                            <span>Post Review on Google</span>
                            <ExternalLink className="w-4 h-4" />
                        </motion.button>

                        {/* Secondary Button: Website Feedback Only */}
                        <button
                            type="button"
                            onClick={handleSubmitInternalOnly}
                            disabled={submittingInternal}
                            className="py-4 sm:py-5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                        >
                            {submittingInternal ? 'Saving...' : 'Submit Website Feedback Only'}
                        </button>
                    </div>

                    {/* Google Policy & Authenticity Notice */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            <strong className="text-slate-700 dark:text-slate-300">Google Policy Notice:</strong> Google reviews are hosted and verified directly on Google Maps. Krishna Engineering Works does not pre-screen or automatically post reviews. Customers submit their reviews directly on Google's platform under their own Google credentials.
                        </p>
                    </div>

                </div>

            </div>

            {/* Modal: Google Review Instructions */}
            <AnimatePresence>
                {googleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 mx-auto mb-5 flex items-center justify-center">
                                <ExternalLink className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3">
                                Official Google Review Opened
                            </h3>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                                The official Google review window for <strong>Krishna Engineering Works</strong> opened in a new tab.
                            </p>

                            {comment.trim() && (
                                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 text-left mb-6 border border-slate-200/80 dark:border-slate-700">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        <span className="flex items-center gap-1.5">
                                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Text Copied to Clipboard
                                        </span>
                                        <button
                                            type="button"
                                            onClick={copyReviewText}
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                                        >
                                            {copied ? 'Copied!' : 'Copy Again'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 italic">
                                        "{comment}"
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 text-left mb-6 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                                <p className="font-bold text-slate-800 dark:text-slate-200">How to finish your review on Google:</p>
                                <ol className="list-decimal pl-4 space-y-1 font-medium">
                                    <li>Switch to the opened Google review tab.</li>
                                    <li>Select your 5-star rating on Google.</li>
                                    <li>Paste your review text (Right click &rarr; Paste or Ctrl+V).</li>
                                    <li>Click <strong>"Post"</strong> on Google to publish.</li>
                                </ol>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setGoogleModalOpen(false)}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-blue-500/20"
                                >
                                    I Understand, Close Window
                                </button>
                                <a
                                    href={GOOGLE_REVIEW_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 font-bold uppercase tracking-wider"
                                >
                                    Re-open Google Review Tab
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default GoogleReviewSection;
