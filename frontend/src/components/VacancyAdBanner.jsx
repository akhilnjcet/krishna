import React, { useState, useEffect } from 'react';
import { X, Flame, ExternalLink, Download, FileText, ChevronRight, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getDirectImageUrl, getCandidateImageUrls } from '../utils/imageUtils';

// High-resolution fallback banner for industrial precision engineering
const DEFAULT_FALLBACK_BANNER = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1920';

const VacancyAdBanner = () => {
    const [banner, setBanner] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [candidates, setCandidates] = useState([]);

    useEffect(() => {
        const isDismissed = sessionStorage.getItem('vacancy_banner_dismissed');
        if (isDismissed === 'true') {
            setDismissed(true);
        }

        const fetchBanner = async () => {
            try {
                const res = await api.get('/vacancies/banner');
                if (res.data?.success && res.data.data && res.data.data.isActive) {
                    setBanner(res.data.data);
                }
            } catch (err) {
                // Silently ignore if not found
            }
        };

        fetchBanner();
    }, []);

    useEffect(() => {
        if (banner?.imageUrl) {
            const list = getCandidateImageUrls(banner.imageUrl);
            list.push(DEFAULT_FALLBACK_BANNER);
            setCandidates(list);
            setCandidateIndex(0);
        } else if (banner) {
            setCandidates([DEFAULT_FALLBACK_BANNER]);
            setCandidateIndex(0);
        }
    }, [banner]);

    if (dismissed || !banner) {
        return null;
    }

    const handleDismiss = (e) => {
        e.stopPropagation();
        setDismissed(true);
        sessionStorage.setItem('vacancy_banner_dismissed', 'true');
    };

    const handleImgError = () => {
        if (candidateIndex + 1 < candidates.length) {
            setCandidateIndex(prev => prev + 1);
        }
    };

    const currentImg = candidates[candidateIndex] || getDirectImageUrl(banner.imageUrl) || DEFAULT_FALLBACK_BANNER;

    return (
        <>
            <div className="relative w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 my-4">
                <div 
                    onClick={() => setShowModal(true)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 shadow-xl hover:shadow-2xl transition-all duration-300 dark:border-amber-400/20"
                >
                    {/* Glowing highlight animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10 pointer-events-none"></div>

                    {/* Banner Image Container */}
                    <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
                        <img 
                            src={currentImg} 
                            alt={banner.title || "Urgent Vacancy Circular"}
                            onError={handleImgError}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                            loading="eager"
                        />
                        
                        {/* Overlay Gradients for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/30 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none"></div>

                        {/* Top Badges & Dismiss Button */}
                        <div className="absolute top-2.5 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20">
                            {banner.isUrgent && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse">
                                    <Flame className="w-3.5 h-3.5" />
                                    <span>Urgent Vacancy</span>
                                </span>
                            )}
                            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/20">
                                Click to Expand Circular
                            </span>
                        </div>

                        {/* Close / Dismiss button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2.5 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black text-white/80 hover:text-white backdrop-blur-md transition-all shadow-lg z-20"
                            title="Close ad banner"
                            aria-label="Close ad banner"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Bottom Information & Action Bar */}
                        <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 flex items-end justify-between gap-3 z-20">
                            <div className="max-w-[70%]">
                                <h3 className="text-white text-base sm:text-lg md:text-xl font-black drop-shadow-md truncate">
                                    {banner.title || "We are Hiring! Multiple Openings"}
                                </h3>
                                {banner.description && (
                                    <p className="text-slate-200 text-xs sm:text-sm drop-shadow truncate hidden sm:block">
                                        {banner.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {banner.driveUrl && (
                                    <a
                                        href={banner.driveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md transition-all"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Drive Link</span>
                                    </a>
                                )}
                                <Link
                                    to="/careers"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition-all"
                                >
                                    <span>View Jobs</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for full-resolution view */}
            {showModal && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                            <div>
                                <h4 className="text-white font-bold text-sm sm:text-base">
                                    {banner.title || "Vacancy Announcement Circular"}
                                </h4>
                                <p className="text-slate-400 text-xs">Krishna Engineering Works Careers</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {banner.driveUrl && (
                                    <a
                                        href={banner.driveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Open in Drive</span>
                                    </a>
                                )}
                                <a
                                    href={currentImg}
                                    download="Krishna_Vacancy_Banner.jpg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Image Body */}
                        <div className="flex-1 overflow-auto p-2 bg-slate-950 flex items-center justify-center min-h-[250px]">
                            <img 
                                src={currentImg} 
                                alt={banner.title} 
                                onError={handleImgError}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            />
                        </div>

                        {/* Modal Footer with Careers Link */}
                        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                            <p className="text-slate-400 text-xs truncate">
                                Interested candidates can review open vacancies or contact HR.
                            </p>
                            <Link
                                to="/careers"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                            >
                                Open Careers Page
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VacancyAdBanner;
