import React from 'react';
import GoogleReviewSection from '../components/GoogleReviewSection';
import { Star, ShieldCheck, MapPin, Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReviewsPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Top Hero Breadcrumb */}
            <div className="bg-gradient-to-b from-blue-900 via-slate-900 to-slate-900 text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-5xl mx-auto">
                    <Link 
                        to="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-white uppercase tracking-wider mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 block mb-2">
                                Client Satisfaction & Trust
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
                                Google Reviews & Client Feedback
                            </h1>
                            <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
                                Krishna Engineering Works takes immense pride in delivering top-tier truss, roofing, welding, and steel fabrication solutions across Kerala.
                            </p>
                        </div>

                        {/* Rating Badge */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center shrink-0">
                            <div className="text-4xl font-black text-amber-400 flex items-center justify-center gap-1">
                                4.8 <Star className="w-8 h-8 fill-amber-400 text-amber-400 inline" />
                            </div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider mt-1">Google Rating</p>
                            <p className="text-[11px] text-slate-300">Verified Client Reviews</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embedded Interactive Review Section */}
            <GoogleReviewSection className="py-12 md:py-16" />

            {/* Additional Trust Indicators */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">100% Genuine Reviews</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">We never buy, incentivize, or filter customer reviews. Every Google review is posted directly by authentic clients.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Local Kerala Workshops</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Operating in Thiruvazhiyode, Palakkad with service delivery throughout all 14 districts in Kerala.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">25+ Years of Trust</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Over two decades of precision welding, heavy structural steel fabrication, and industrial roofing excellence.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewsPage;
