import React, { useState, useEffect } from 'react';
import { 
    Briefcase, MapPin, Clock, Users, FileText, Download, 
    ExternalLink, Search, Flame, Sparkles, Phone, Mail, 
    MessageCircle, ChevronRight, X, Eye, CheckCircle2, AlertCircle, Building2
} from 'lucide-react';
import api from '../services/api';
import { getDirectImageUrl } from '../utils/imageUtils';
import VacancyAdBanner from '../components/VacancyAdBanner';

const Careers = () => {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');
    const [previewCircular, setPreviewCircular] = useState(null);
    const [applyModalVacancy, setApplyModalVacancy] = useState(null);

    useEffect(() => {
        fetchVacancies();
    }, []);

    const fetchVacancies = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vacancies');
            if (res.data?.success && Array.isArray(res.data.data)) {
                setVacancies(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load vacancies:', err);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique departments for filter
    const departments = ['All', ...new Set(vacancies.map(v => v.department).filter(Boolean))];

    // Filtered list
    const filteredVacancies = vacancies.filter(v => {
        const matchesDept = selectedDept === 'All' || v.department === selectedDept;
        const matchesSearch = 
            (v.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.experience || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    const isPdf = (url = '') => url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
            {/* Urgent Vacancy Banner */}
            <VacancyAdBanner />

            {/* Hero Header */}
            <header className="relative bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Work With Us • Krishna Engineering Works</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4">
                        Build Your Future in <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">Engineering</span>
                    </h1>

                    <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed mb-8">
                        Join our passionate team delivering precision manufacturing, fabrication, and structural engineering across Kerala. Explore open opportunities below.
                    </p>

                    {/* Quick Search & Filter Controls */}
                    <div className="max-w-3xl mx-auto bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/15 dark:border-slate-800 p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search by job title, skill or keyword..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                        </div>

                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="py-3 px-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-semibold border-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Listings Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                {/* Section Title & Counters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            <span>Current Vacancies</span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                                {filteredVacancies.length} Open
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                            Review detailed requirements and official vacancy circulars.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchVacancies}
                            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Refresh Listings
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Loading current career openings...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredVacancies.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 sm:p-14 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Matching Vacancies Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            There are currently no open positions matching your search. You can still submit your resume directly to our HR team.
                        </p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedDept('All'); }}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}

                {/* Vacancy Cards Grid */}
                {!loading && filteredVacancies.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredVacancies.map((vacancy) => {
                            const hasCircular = Boolean(vacancy.circularUrl || vacancy.driveUrl);
                            const directCircular = getDirectImageUrl(vacancy.circularUrl);

                            return (
                                <div
                                    key={vacancy._id}
                                    className={`relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between ${
                                        vacancy.isUrgent
                                            ? 'border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/5'
                                            : 'border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    {/* Header & Badges */}
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                    {vacancy.department}
                                                </span>
                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {vacancy.jobType || 'Full-time'}
                                                </span>
                                                {vacancy.isUrgent && (
                                                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-600/30">
                                                        <Flame className="w-3 h-3" />
                                                        <span>Urgent</span>
                                                    </span>
                                                )}
                                            </div>

                                            {vacancy.openings && vacancy.openings > 1 && (
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    {vacancy.openings} Openings
                                                </span>
                                            )}
                                        </div>

                                        {/* Job Title */}
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                                            {vacancy.title}
                                        </h3>

                                        {/* Key Metadata Badges */}
                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 dark:text-slate-300 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <span>Exp: {vacancy.experience || 'Not specified'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-rose-500" />
                                                <span className="truncate max-w-[220px]">{vacancy.location || 'Palakkad, Kerala'}</span>
                                            </div>
                                            {vacancy.salary && (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <span>₹</span>
                                                    <span>{vacancy.salary}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                                            {vacancy.description}
                                        </p>

                                        {/* Requirements List */}
                                        {Array.isArray(vacancy.requirements) && vacancy.requirements.length > 0 && (
                                            <div className="mb-6 space-y-1.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                                    Key Requirements:
                                                </p>
                                                {vacancy.requirements.slice(0, 3).map((req, rIdx) => (
                                                    <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        <span className="truncate">{req}</span>
                                                    </div>
                                                ))}
                                                {vacancy.requirements.length > 3 && (
                                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold pl-5">
                                                        + {vacancy.requirements.length - 3} more criteria
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Footers: Circular Buttons & Apply */}
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                                        {/* Circular Access Options */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {vacancy.circularUrl && (
                                                <>
                                                    <button
                                                        onClick={() => setPreviewCircular({
                                                            title: vacancy.title,
                                                            url: directCircular,
                                                            isPdf: isPdf(vacancy.circularUrl),
                                                            driveUrl: vacancy.driveUrl
                                                        })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                                                        title="View Circular"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                        <span>View Circular</span>
                                                    </button>

                                                    <a
                                                        href={directCircular}
                                                        download={`Circular_${vacancy.title.replace(/\s+/g, '_')}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                                                        title="Download Circular"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <span className="hidden sm:inline">Download</span>
                                                    </a>
                                                </>
                                            )}

                                            {vacancy.driveUrl && (
                                                <a
                                                    href={vacancy.driveUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
                                                    title="Open in Google Drive"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                    <span>Google Drive</span>
                                                </a>
                                            )}
                                        </div>

                                        {/* Apply Button */}
                                        <button
                                            onClick={() => setApplyModalVacancy(vacancy)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/25 transition-all ml-auto"
                                        >
                                            <span>Apply Now</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Circular Preview Modal */}
            {previewCircular && (
                <div 
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
                    onClick={() => setPreviewCircular(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                            <div>
                                <h4 className="text-white font-bold text-sm sm:text-base">
                                    Official Circular: {previewCircular.title}
                                </h4>
                                <p className="text-slate-400 text-xs">Krishna Engineering Works Careers</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {previewCircular.driveUrl && (
                                    <a
                                        href={previewCircular.driveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Drive</span>
                                    </a>
                                )}
                                <a
                                    href={previewCircular.url}
                                    download="Vacancy_Circular"
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    onClick={() => setPreviewCircular(null)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Viewer Body */}
                        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[400px]">
                            {previewCircular.isPdf ? (
                                <iframe 
                                    src={`${previewCircular.url}#toolbar=0`} 
                                    className="w-full h-[65vh] rounded-xl border border-slate-800"
                                    title="Circular PDF"
                                />
                            ) : (
                                <img 
                                    src={previewCircular.url} 
                                    alt="Circular" 
                                    className="max-w-full max-h-[70vh] object-contain rounded-xl"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Application / HR Contact Modal */}
            {applyModalVacancy && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setApplyModalVacancy(null)}
                >
                    <div 
                        className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setApplyModalVacancy(null)}
                            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                Apply for {applyModalVacancy.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                Reach our hiring desk directly via WhatsApp, Phone, or Email with your resume.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* WhatsApp Direct */}
                            <a
                                href={`https://wa.me/919447940835?text=${encodeURIComponent(`Hi, I am interested in applying for the position of "${applyModalVacancy.title}" at Krishna Engineering Works.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-5 h-5" />
                                    <span>Apply via WhatsApp</span>
                                </div>
                                <span className="text-xs opacity-90">+91 9447940835</span>
                            </a>

                            {/* Direct Call */}
                            <a
                                href="tel:+919447940835"
                                className="flex items-center justify-between p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5" />
                                    <span>Call HR Desk</span>
                                </div>
                                <span className="text-xs opacity-90">+91 9447940835</span>
                            </a>

                            {/* Email Resume */}
                            <a
                                href={`mailto:contact@krishnaengg.com?subject=${encodeURIComponent(`Job Application: ${applyModalVacancy.title}`)}&body=${encodeURIComponent(`Dear Hiring Manager,\n\nI am writing to express my interest in the position of ${applyModalVacancy.title} at Krishna Engineering Works.\n\nPlease find my resume attached.\n\nThank you,\n`)}`}
                                className="flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-blue-500" />
                                    <span>Email Resume</span>
                                </div>
                                <span className="text-xs text-slate-500">contact@krishnaengg.com</span>
                            </a>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[11px] text-slate-400">
                                Walk-in: Krishna Engineering Works, Industrial Area, Thiruvazhiyode, Palakkad.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Careers;
