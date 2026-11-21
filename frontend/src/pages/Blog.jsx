import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, User, Tag, ArrowRight, Loader2, 
    AlertCircle, Search, Radio, Terminal, RefreshCw, AlertTriangle,
    X, Check, Share2, BookOpen, Flame, ShieldCheck, Layers, Clock, 
    Sparkles, Send, ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { getDirectImageUrl } from '../utils/imageUtils';

const FALLBACK_POSTS = [
    {
        _id: 'fb1',
        title: 'Advances in Industrial Structural Steel Fabrication',
        category: 'Steel Fabrication',
        authorName: 'KEW Technical Team',
        createdAt: '2026-03-15',
        excerpt: 'Exploring the shift toward high-tensile steel in heavy fabrication and the impact on structural longevity in extreme climates.',
        image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
        content: 'Structural steel fabrication has evolved beyond simple welding. Today, we utilize computer-aided design (CAD) integrated with automated plasma cutting to ensure sub-millimeter precision.\n\nThis technical report explores how Krishna Engineering Works leverages these advances for modern warehousing, high-tolerance industrial sheds, and automated heavy logistics facilities across South India.'
    },
    {
        _id: 'fb2',
        title: 'Safety Protocols in High-Pressure Pipeline Welding',
        category: 'Welding Eng.',
        authorName: 'Chief Welding Inspector',
        createdAt: '2026-03-22',
        excerpt: 'Standard operating procedures for maintaining weld integrity under high-pressure environments and X-Ray radiographic verification techniques.',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=80',
        content: 'Integrity is paramount in pressure systems. Our team adheres to strict ISO and ISI standards, utilizing multi-pass TIG welding followed by comprehensive dye-penetrant and radiographic testing.\n\nThis bulletin outlines our latest safety checkpoints, argon gas purity benchmarks, and electrode selection matrices for severe service environments.'
    },
    {
        _id: 'fb3',
        title: 'Modernizing Kerala’s Industrial Infrastructure',
        category: 'Infrastructure',
        authorName: 'Managing Director',
        createdAt: '2026-04-01',
        excerpt: 'A 25-year perspective on the evolution of metal roofing and truss systems in Kerala’s rapidly expanding commercial sector.',
        image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80',
        content: 'From small workshops to multi-acre manufacturing plants, the landscape of Kerala industry is shifting rapidly. Krishna Engineering Works has pioneered the use of modular truss systems that provide larger spans without sacrificing structural stability or roof drainage in monsoonal conditions.'
    },
    {
        _id: 'fb4',
        title: 'Heavy Crane Runway Girder Deflection & Fatigue Audits',
        category: 'Structural Audits',
        authorName: 'Lead Structural Engineer',
        createdAt: '2026-04-18',
        excerpt: 'Comprehensive field analysis methods for inspecting crane gantry girders subjected to high-cycle cyclic loading and vibration.',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&q=80',
        content: 'Crane runway girders experience dynamic wheel loads that can induce localized fatigue cracks at web-flange junctions. In this field bulletin, we detail ultrasonic weld testing procedures, rail alignment tolerance limits, and retrofit bracket engineering deployed during routine shut-downs.'
    }
];

const CATEGORY_FALLBACK_IMAGES = {
    'welding': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=80',
    'steel': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
    'fabrication': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80',
    'safety': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&q=80',
    'audit': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&q=80',
    'default': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1200&q=80'
};

const getCategoryFallbackImage = (category) => {
    const cat = (category || '').toLowerCase();
    for (const [key, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
        if (cat.includes(key)) return url;
    }
    return CATEGORY_FALLBACK_IMAGES.default;
};

// Safe Image Component that avoids broken image icons or bleeding alt text
const ArticleImage = ({ src, alt, category, className }) => {
    const [imgSrc, setImgSrc] = useState(() => {
        const direct = getDirectImageUrl(src);
        return direct || getCategoryFallbackImage(category);
    });
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const direct = getDirectImageUrl(src);
        setImgSrc(direct || getCategoryFallbackImage(category));
        setHasError(false);
    }, [src, category]);

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setImgSrc(getCategoryFallbackImage(category));
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
            <img 
                src={imgSrc} 
                alt="" 
                onError={handleError}
                className={className || "w-full h-full object-cover transition-all duration-700"} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
        </div>
    );
};

const Blog = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [fetchError, setFetchError] = useState(null);

    // Full Reading Modal State
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Newsletter Uplink State
    const [uplinkEmail, setUplinkEmail] = useState('');
    const [uplinkSuccess, setUplinkSuccess] = useState(false);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await api.get('/blogs');
            if (Array.isArray(res.data) && res.data.length > 0) {
               setPosts(res.data);
            } else {
               setPosts(FALLBACK_POSTS);
            }
        } catch (err) {
            console.error("Archive fetch failure:", err);
            setPosts(FALLBACK_POSTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Unique Categories for Pills & Category Filter
    const availableCategories = useMemo(() => {
        const set = new Set();
        posts.forEach(p => {
            if (p.category) set.add(p.category.trim());
        });
        // Default standard industrial categories
        ['Welding Eng.', 'Steel Fabrication', 'Structural Audits', 'Safety Protocols'].forEach(c => set.add(c));
        return Array.from(set);
    }, [posts]);

    // Filtered Posts
    const filteredPosts = useMemo(() => {
        return posts.filter(p => {
            const matchesSearch = !searchTerm.trim() || 
                (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.content || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategory === 'ALL' || 
                (p.category || '').toLowerCase().trim() === selectedCategory.toLowerCase().trim() ||
                (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase());

            return matchesSearch && matchesCategory;
        });
    }, [posts, searchTerm, selectedCategory]);

    const handleCopyArticleLink = () => {
        if (!selectedArticle) return;
        const url = `${window.location.origin}/blog#${selectedArticle._id}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleSubscribeUplink = (e) => {
        e.preventDefault();
        if (!uplinkEmail || !uplinkEmail.includes('@')) return;
        setUplinkSuccess(true);
        setTimeout(() => {
            setUplinkSuccess(false);
            setUplinkEmail('');
        }, 3500);
    };

    return (
        <div className="bg-[#050505] min-h-screen pb-32 font-sans text-white relative selection:bg-amber-500 selection:text-black">

            {/* ════════════════════════════════════════════════════════════════
                HERO SECTION (TIGHTENED VERTICAL PADDING, ZERO DEAD VOID)
            ════════════════════════════════════════════════════════════════ */}
            <div className="relative pt-16 sm:pt-20 pb-10 sm:pb-14 px-4 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
                <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-4"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Krishna Engineering Publications</span>
                    </motion.div>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-tight mb-4">
                        TECHNICAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-200">JOURNAL.</span>
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-medium leading-relaxed mb-8">
                        Practical welding guides, fabrication case studies, structural engineering insights, and workshop standards.
                    </p>
                    
                    {/* Live Search & Filter Bar */}
                    <div className="relative w-full max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search articles, topics, or materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-xs font-semibold tracking-wide text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 outline-none backdrop-blur-2xl transition-all shadow-xl"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                                title="Clear Search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Category Filter Pills */}
                    <div className="flex items-center justify-center flex-wrap gap-2 mt-6 max-w-3xl">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('ALL')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                selectedCategory === 'ALL'
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}
                        >
                            All Articles ({posts.length})
                        </button>
                        {availableCategories.map(cat => {
                            const count = posts.filter(p => (p.category || '').toLowerCase().includes(cat.toLowerCase())).length;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {cat} {count > 0 && `(${count})`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                MAIN CONTENT GRID (REFINED SPACING, ATTRACTIVE CARDS)
            ════════════════════════════════════════════════════════════════ */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12">
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-28">
                        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
                        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Loading Engineering Articles...</p>
                    </div>
                ) : fetchError ? (
                    <div className="text-center py-24 bg-red-600/[0.03] rounded-3xl border border-dashed border-red-600/20 p-8 max-w-xl mx-auto">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h3 className="text-white font-black uppercase tracking-wider text-base mb-2">Unable to Load Articles</h3>
                        <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">
                            {fetchError === 'EMPTY_ARCHIVE' ? 'No articles currently published in this category.' : `System Notice: ${fetchError}`}
                        </p>
                        <button 
                            onClick={fetchPosts}
                            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition shadow-lg shadow-amber-400/20"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh Feed
                        </button>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 p-8 max-w-xl mx-auto">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h4 className="text-white font-black uppercase tracking-wider text-sm mb-1">No Matching Articles Found</h4>
                        <p className="text-slate-400 text-xs">No records matched your search or category filters.</p>
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}
                            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                        {/* ── MAIN REPORTS FEED ── */}
                        <div className="lg:col-span-8 space-y-8">
                            <AnimatePresence mode="popLayout">
                                {filteredPosts.map((post, i) => (
                                    <motion.div
                                        key={post._id}
                                        layout
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: i * 0.05 }}
                                        className="bg-white/[0.03] border border-white/10 hover:border-amber-400/40 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col md:flex-row group transition-all duration-300 shadow-xl"
                                    >
                                        {/* Image Section with Reliable Safe Fallback */}
                                        <div className="w-full md:w-[42%] min-h-[220px] md:min-h-[280px] relative overflow-hidden bg-slate-900 shrink-0">
                                            <ArticleImage 
                                                src={post.image} 
                                                alt={post.title} 
                                                category={post.category} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            {/* Category Pill Tag */}
                                            <div className="absolute top-4 left-4 bg-amber-400/90 backdrop-blur-md text-slate-950 font-black px-3 py-1 text-[9px] uppercase tracking-wider rounded-full shadow-lg z-20">
                                                {post.category || 'Engineering'}
                                            </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="w-full md:w-[58%] p-6 sm:p-8 flex flex-col justify-between bg-[#0a0a0c]/80 relative">
                                            <div>
                                                {/* Meta Row: Date & Author */}
                                                <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase tracking-wider mb-3">
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> 
                                                        <span>{new Date(post.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                    <span className="text-slate-600">•</span>
                                                    <div className="flex items-center gap-1.5 truncate font-medium">
                                                        <User className="w-3.5 h-3.5 text-amber-400" /> 
                                                        <span className="truncate">{post.authorName || 'KEW Lead Engineer'}</span>
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h2 className="text-xl sm:text-2xl font-black text-white mb-3 uppercase tracking-tight leading-snug group-hover:text-amber-400 transition-colors">
                                                    {post.title}
                                                </h2>
                                                
                                                {/* Excerpt */}
                                                <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-3 mb-6">
                                                    {post.excerpt || (post.content || '').substring(0, 160) + '...'}
                                                </p>
                                            </div>

                                            {/* Action Button: Opens Full Reading Modal */}
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-medium uppercase flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-amber-400/80" /> ~3 min read
                                                </span>

                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedArticle(post)}
                                                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all active:scale-95 shadow-md"
                                                >
                                                    <span>Read Full Article</span>
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* ── SIDEBAR: CATEGORIES & NEWSLETTER ── */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Categories Filter Card */}
                            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl sticky top-28">
                                <h3 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-amber-400" /> 
                                    <span>Article Categories</span>
                                </h3>
                                
                                <p className="text-[11px] text-slate-400 mb-4 font-medium leading-relaxed">
                                    Browse technical guides and project case studies by engineering specialty:
                                </p>

                                <div className="space-y-2">
                                    {availableCategories.map((cat, idx) => {
                                        const isSelected = selectedCategory === cat;
                                        const count = posts.filter(p => (p.category || '').toLowerCase().includes(cat.toLowerCase())).length;

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                                                    isSelected
                                                        ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                                                        : 'bg-black/30 border-white/5 hover:border-amber-400/30 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <span className="text-xs font-semibold tracking-wide">{cat}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400 font-medium">{count}</span>
                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-600'}`}></div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Newsletter Form */}
                                <div className="mt-8 p-6 bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 rounded-2xl relative overflow-hidden shadow-xl">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-slate-950" />
                                            <h4 className="text-base font-black uppercase tracking-tight">Engineering Newsletter</h4>
                                        </div>
                                        <p className="text-[11px] font-bold leading-relaxed mb-4 text-slate-900/80">
                                            Receive verified metallurgical standards, fabrication tips, and structural engineering bulletins.
                                        </p>

                                        {uplinkSuccess ? (
                                            <div className="p-3 bg-slate-950 text-white rounded-xl text-center flex items-center justify-center gap-2 text-xs font-bold shadow-md">
                                                <Check className="w-4 h-4 text-emerald-400" />
                                                <span>Subscribed Successfully!</span>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSubscribeUplink} className="space-y-2">
                                                <input 
                                                    type="email" 
                                                    placeholder="Enter your email address..." 
                                                    value={uplinkEmail}
                                                    onChange={(e) => setUplinkEmail(e.target.value)}
                                                    required
                                                    className="w-full bg-white/90 focus:bg-white text-slate-950 placeholder:text-slate-500 p-3 rounded-xl text-xs font-bold outline-none border border-black/10 focus:ring-2 focus:ring-slate-950" 
                                                />
                                                <button 
                                                    type="submit"
                                                    className="w-full bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold uppercase tracking-wider py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>Subscribe to Newsletter</span>
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FULL ARTICLE MODAL
            ════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedArticle && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0e0e12] border border-white/15 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative my-auto"
                        >
                            {/* Modal Header */}
                            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/60">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                                        {selectedArticle.category || 'Engineering Article'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        Doc #{selectedArticle._id.slice(-6).toUpperCase()}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedArticle(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                                {/* Title */}
                                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-snug">
                                    {selectedArticle.title}
                                </h2>

                                {/* Metadata Info */}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 py-3 border-y border-white/5">
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <Calendar className="w-4 h-4 text-amber-400" />
                                        <span>{new Date(selectedArticle.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <User className="w-4 h-4 text-amber-400" />
                                        <span>{selectedArticle.authorName || 'KEW Chief Engineer'}</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Verified Technical Guide</span>
                                    </div>
                                </div>

                                {/* Banner Image */}
                                <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden relative shadow-lg">
                                    <ArticleImage 
                                        src={selectedArticle.image} 
                                        alt={selectedArticle.title} 
                                        category={selectedArticle.category} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Excerpt Callout */}
                                {selectedArticle.excerpt && (
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border-l-4 border-amber-400 text-amber-200 text-xs font-semibold leading-relaxed">
                                        {selectedArticle.excerpt}
                                    </div>
                                )}

                                {/* Main Article Content */}
                                <div className="space-y-4 text-slate-300 text-sm leading-relaxed whitespace-pre-line font-normal">
                                    {selectedArticle.content || selectedArticle.excerpt || 'Technical article contents are being compiled by our engineering team.'}
                                </div>

                                {/* Key Technical Takeaways Box */}
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                                        Quality & Engineering Compliance:
                                    </span>
                                    <p className="text-xs text-slate-400 leading-relaxed font-normal">
                                        All welding and structural fabrication procedures referenced in this article comply with IS 800:2007 (General Construction in Steel), AWS D1.1 Structural Welding standards, and certified Krishna Engineering Quality Assurance Protocols.
                                    </p>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-slate-950/60">
                                <button
                                    type="button"
                                    onClick={handleCopyArticleLink}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition"
                                >
                                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                                    <span>{copiedLink ? 'Link Copied' : 'Share Article'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedArticle(null)}
                                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition"
                                >
                                    Close Article
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Blog;