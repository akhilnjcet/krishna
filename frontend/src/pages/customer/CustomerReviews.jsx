import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Check, Copy, ExternalLink, AlertCircle, Sparkles,
    ShieldCheck, Clock, MessageSquare, RefreshCw, ThumbsUp, Send, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CfL2cyKPQ0ThEBI/review';

const SERVICE_OPTIONS = [
    'Truss Work',
    'Roofing',
    'Sheet Roofing',
    'Welding',
    'Steel Fabrication',
    'Iron Doors',
    'Industrial Shed',
    'Gate & Grills',
    'Staircases & Walkways'
];

const RATING_DESCRIPTIONS = {
    1: { label: 'Needs Improvement', color: 'text-rose-500', hint: 'We take quality concerns seriously. Please tell us what fell short.' },
    2: { label: 'Fair Experience', color: 'text-amber-500', hint: 'Help us understand how we could have done better.' },
    3: { label: 'Good Service', color: 'text-yellow-500', hint: 'Satisfactory work. What could we elevate further?' },
    4: { label: 'Very Good Quality', color: 'text-blue-500', hint: 'Great to hear! Which aspects stood out most?' },
    5: { label: 'Outstanding Experience!', color: 'text-emerald-500', hint: 'Exceptional craftsmanship and service!' }
};

const CustomerReviews = () => {
    const { user } = useAuthStore();
    const [rating, setRating] = useState(0); // Starts at 0 (unselected)
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);

    // Submission & Feedback States
    const [submitting, setSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [serverError, setServerError] = useState('');
    const [successData, setSuccessData] = useState(null);

    // History & Persistence
    const [pastReviews, setPastReviews] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState(null);

    // Clipboard copy state
    const [copied, setCopied] = useState(false);

    const starContainerRef = useRef(null);

    // Load existing customer reviews on mount
    useEffect(() => {
        fetchReviewHistory();
    }, []);

    const fetchReviewHistory = async () => {
        setLoadingHistory(true);
        setHistoryError(null);
        try {
            const res = await api.get('/feedback/my-feedback');
            if (res.data && Array.isArray(res.data.feedbacks)) {
                setPastReviews(res.data.feedbacks);
            }
        } catch (err) {
            console.error('Failed to load past reviews:', err);
            setHistoryError('Could not load your previous reviews.');
        } finally {
            setLoadingHistory(false);
        }
    };

    // Keyboard navigation for star rating group
    const handleStarKeyDown = (e, starValue) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            const nextRating = Math.min(5, (rating || starValue) + 1);
            setRating(nextRating);
            setValidationError('');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            const prevRating = Math.max(1, (rating || starValue) - 1);
            setRating(prevRating);
            setValidationError('');
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setRating(starValue);
            setValidationError('');
        }
    };

    // Toggle service tag
    const toggleService = (service) => {
        setSelectedServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    // Safe clipboard copy helper
    const handleCopyComment = async (textToCopy) => {
        const text = textToCopy || comment.trim();
        if (!text) return;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            }
        } catch (err) {
            console.warn('Clipboard write error:', err);
        }
    };

    // Form submission handler
    const handleSubmit = async (e) => {
        e?.preventDefault();
        setValidationError('');
        setServerError('');

        // Step 1 validation: Star rating is strictly required
        if (!rating || rating < 1 || rating > 5) {
            setValidationError('Please select a star rating (1 to 5 stars) before submitting.');
            if (starContainerRef.current) {
                starContainerRef.current.focus();
            }
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
              rating,
              comment: comment.trim(),
              services: selectedServices,
              customerName: user?.name || 'Valued Customer',
              customerEmail: user?.email || '',
              customerPhone: user?.phone || '',
              consentGiven: true
            };

            const response = await api.post('/feedback', payload);

            if (response.data && response.data.success) {
                const savedItem = response.data.feedback || {
                    id: Date.now().toString(),
                    rating,
                    comment: comment.trim(),
                    services: selectedServices,
                    createdAt: new Date().toISOString()
                };

                setSuccessData({
                    ...savedItem,
                    rating,
                    comment: comment.trim(),
                    services: selectedServices
                });

                // Prepend to past reviews list so it reflects immediately
                setPastReviews(prev => [savedItem, ...prev]);

                // Reset form fields
                setRating(0);
                setComment('');
                setSelectedServices([]);
            } else {
                setServerError(response.data?.message || 'Could not save feedback. Please try again.');
            }
        } catch (err) {
            console.error('Error submitting customer review:', err);
            const msg = err.response?.data?.message || err.message || 'Network error occurred while submitting feedback.';
            setServerError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const activeRating = hoverRating || rating;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Page Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            Customer Experience Hub
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                            Share Your Honest Feedback
                        </h1>
                        <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                            Your honest feedback helps Krishna Engineering Works continuously elevate fabrication precision, structural reliability, and project delivery.
                        </p>
                    </div>

                    {/* Google Rating Reference Banner */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center shrink-0 min-w-[200px]">
                        <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1.5">
                            4.8 <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                        </div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-wider mt-1">Google Verified Rating</p>
                        <a 
                            href={GOOGLE_REVIEW_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-white mt-1 underline transition-colors"
                        >
                            <span>View Public Reviews</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Success Banner & Google Review Invitation */}
            <AnimatePresence>
                {successData && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                                    Thank you! Your feedback has been successfully recorded.
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Your {successData.rating}-star review and feedback have been safely logged into the Krishna ERP database under your account.
                                </p>
                            </div>
                        </div>

                        {/* Optional Google Review Step */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                        Optional Step
                                    </span>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">No pressure, purely voluntary</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    Would you like to post this review on Google as well?
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                                    Submitting to Krishna ERP does not post to Google. If you wish to help others on Google Maps, you can copy your written review and open our official Google profile.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                                {successData.comment && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopyComment(successData.comment)}
                                        className="flex-1 sm:flex-initial px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        <span>{copied ? 'Copied!' : 'Copy Review Text'}</span>
                                    </button>
                                )}
                                <a
                                    href={GOOGLE_REVIEW_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                                >
                                    <span>Post on Google</span>
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => setSuccessData(null)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                            >
                                Dismiss notification
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Review Form Card */}
            <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-200 dark:border-slate-800 space-y-8">
                
                {/* Section Title */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Write a New Review
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Please provide honest feedback on our service delivery, materials, and communication.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Step 1: Star Rating (Strictly Accessible, 1-5 stars, Not Preselected) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                1. Star Rating <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[11px] font-bold text-slate-400">
                                Required (1 to 5 Stars)
                            </span>
                        </div>

                        <div 
                            ref={starContainerRef}
                            tabIndex={0}
                            role="radiogroup" 
                            aria-label="Star rating out of 5 stars"
                            className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isFilled = star <= activeRating;
                                    const isSelected = star === rating;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                            tabIndex={rating === star || (!rating && star === 1) ? 0 : -1}
                                            onClick={() => {
                                                setRating(star);
                                                setValidationError('');
                                            }}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onKeyDown={(e) => handleStarKeyDown(e, star)}
                                            className={`p-2 rounded-xl transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                                                isSelected ? 'bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-400/50' : ''
                                            }`}
                                        >
                                            <Star 
                                                className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                                                    isFilled 
                                                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]' 
                                                        : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                                                }`} 
                                            />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Visible Selection Feedback */}
                            <div className="text-left sm:text-right">
                                {activeRating > 0 ? (
                                    <>
                                        <div className={`text-sm font-black ${RATING_DESCRIPTIONS[activeRating]?.color || 'text-slate-900 dark:text-white'}`}>
                                            {activeRating} / 5 Stars — {RATING_DESCRIPTIONS[activeRating]?.label}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                                            {RATING_DESCRIPTIONS[activeRating]?.hint}
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-xs font-bold text-slate-400 italic">
                                        Click or use keyboard to choose 1–5 stars
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Missing Rating Validation Alert */}
                        {validationError && (
                            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>{validationError}</span>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Optional Service Tags */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                2. Services Provided <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <span className="text-[11px] text-slate-400">Click to select all that apply</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {SERVICE_OPTIONS.map((service) => {
                                const selected = selectedServices.includes(service);
                                return (
                                    <button
                                        key={service}
                                        type="button"
                                        onClick={() => toggleService(service)}
                                        aria-pressed={selected}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            selected
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                                        }`}
                                    >
                                        {selected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                                        <span>{service}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Optional Written Feedback */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                3. Written Review / Comments <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <span className={`text-[11px] font-bold ${comment.length >= 1900 ? 'text-rose-500' : 'text-slate-400'}`}>
                                {comment.length} / 2000
                            </span>
                        </div>

                        <textarea
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                            placeholder="Share your experience regarding engineering precision, structural strength, welding finish, timeline adherence, or customer support..."
                            className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm leading-relaxed"
                        />
                    </div>

                    {/* Server Error Alert */}
                    {serverError && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{serverError}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shrink-0 text-xs"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Submission Action */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Submitting Review...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Submit Review to Krishna ERP</span>
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Submitted under verified account: <strong>{user?.name || 'Customer'}</strong></span>
                        </div>
                    </div>

                </form>

            </div>

            {/* Past Review History Section */}
            <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-200 dark:border-slate-800 space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" />
                            Your Submitted Reviews & Feedback History
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Saved records of feedback you have provided to Krishna Engineering Works.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchReviewHistory}
                        disabled={loadingHistory}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Refresh history"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loadingHistory ? (
                    <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading your review history...</span>
                    </div>
                ) : historyError ? (
                    <div className="py-6 text-center text-xs text-rose-500">
                        {historyError}
                    </div>
                ) : pastReviews.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                        <MessageSquare className="w-10 h-10 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            You have not submitted any reviews yet.
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Use the form above to share your first experience with our team!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pastReviews.map((rev, index) => {
                            const revDate = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : 'Recent';

                            return (
                                <div 
                                    key={rev._id || rev.id || index} 
                                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                                <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                                                    {rev.rating} / 5
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {RATING_DESCRIPTIONS[rev.rating]?.label || 'Client Rating'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {revDate}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                Saved
                                            </span>
                                        </div>
                                    </div>

                                    {rev.comment && (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                            "{rev.comment}"
                                        </p>
                                    )}

                                    {Array.isArray(rev.services) && rev.services.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {rev.services.map((s, idx) => (
                                                <span 
                                                    key={idx}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

        </div>
    );
};

export default CustomerReviews;
