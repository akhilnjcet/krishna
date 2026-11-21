import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Search, Edit3, Trash2, X, 
    ImageIcon, FileText, User, Tag, Loader2,
    Calendar, AlertCircle, BookOpen, Clock, 
    RefreshCw, Eye, Sparkles, LayoutGrid, List,
    Layers, CheckCircle2, ChevronRight, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';

const CATEGORIES = [
    { name: 'All Categories', value: 'ALL' },
    { name: 'Structural', value: 'Structural', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    { name: 'Welding', value: 'Welding', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    { name: 'Fabrication', value: 'Fabrication', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    { name: 'Maintenance', value: 'Maintenance', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
    { name: 'Safety', value: 'Safety', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    { name: 'Quality Control', value: 'Quality Control', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' }
];

const SAMPLE_REPORTS = [
    {
        title: 'Precision TIG Welding Protocol for Heavy Crane Girders',
        category: 'Welding',
        authorName: 'Chief Welding Inspector',
        image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80',
        excerpt: 'Standard operating parameters and non-destructive testing requirements for 25mm structural plates under cyclic loading.',
        content: `Standard Operating Procedure (SOP-WLD-402) for GTAW/TIG welding on structural gantry joints.

1. Pre-Heat Requirements:
- Base metal (IS 2062 Grade E250/E350) must be pre-heated to 120°C - 150°C using oxy-fuel torches.
- Interpass temperature must not exceed 250°C.

2. Welding Parameters:
- Current: 180A - 220A DCEN (Direct Current Electrode Negative).
- Shielding Gas: 99.99% Ultra-Pure Argon at 12-15 L/min flow rate.
- Filler Wire: AWS A5.18 ER70S-6 (2.4mm diameter).

3. Quality Inspection & NDT:
- 100% Visual inspection of root pass for lack of penetration or burn-through.
- Dye Penetrant Testing (DPT) on root and final cap passes.
- Ultrasonic Testing (UT) per AWS D1.1 specifications after 24-hour cooling.`
    },
    {
        title: 'Overhead Crane Rail Alignment & Deflection Standards',
        category: 'Structural',
        authorName: 'Structural Design Lead',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        excerpt: 'Field measurement tolerances and laser alignment methodologies for 10-ton overhead EOT crane runways.',
        content: `Guidelines for runway beam installation and periodic deflection monitoring.

Key Tolerances:
- Span Deviation: Max ±3mm across 20m rail spans.
- Elevation Variance: Not to exceed 2mm between adjacent column supports.
- Rail Joint Gap: 3mm to 5mm expansion allowance at ambient 30°C.

Annual deflection testing using calibrated water levels and laser distance sensors ensures compliance with ISO 12488-1 crane runway standards.`
    }
];

const AdminBlog = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    const [formData, setFormData] = useState({
        _id: '',
        title: '',
        content: '',
        excerpt: '',
        category: 'Structural',
        authorName: 'Chief Engineer',
        image: ''
    });

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/blogs');
            setBlogs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const handleOpenModal = (blog = null) => {
        if (blog) {
            setFormData({
                _id: blog._id,
                title: blog.title || '',
                content: blog.content || '',
                excerpt: blog.excerpt || '',
                category: blog.category || 'Structural',
                authorName: blog.authorName || 'Chief Engineer',
                image: blog.image || ''
            });
            setIsEditing(true);
        } else {
            setFormData({
                _id: '',
                title: '',
                content: '',
                excerpt: '',
                category: 'Structural',
                authorName: 'Chief Engineer',
                image: ''
            });
            setIsEditing(false);
        }
        setModalOpen(true);
    };

    const handleLoadSample = (sample) => {
        setFormData({
            _id: '',
            title: sample.title,
            content: sample.content,
            excerpt: sample.excerpt,
            category: sample.category,
            authorName: sample.authorName,
            image: sample.image
        });
        setIsEditing(false);
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing && formData._id) {
                await api.put(`/blogs/${formData._id}`, formData);
            } else {
                await api.post('/blogs', formData);
            }
            fetchBlogs();
            setModalOpen(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to save field report. Please verify input fields.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Are you sure you want to permanently delete report "${title}"?`)) return;
        try {
            await api.delete(`/blogs/${id}`);
            setBlogs(blogs.filter(b => b._id !== id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete report.");
        }
    };

    const handlePreview = (blog) => {
        setSelectedBlog(blog);
        setPreviewModalOpen(true);
    };

    const filteredBlogs = blogs.filter(b => {
        const matchesCategory = selectedCategory === 'ALL' || b.category === selectedCategory;
        const q = searchTerm.toLowerCase();
        const matchesSearch = !q || 
            (b.title && b.title.toLowerCase().includes(q)) ||
            (b.category && b.category.toLowerCase().includes(q)) ||
            (b.authorName && b.authorName.toLowerCase().includes(q)) ||
            (b.excerpt && b.excerpt.toLowerCase().includes(q)) ||
            (b.content && b.content.toLowerCase().includes(q));
        return matchesCategory && matchesSearch;
    });

    const getCategoryBadgeClass = (category) => {
        const found = CATEGORIES.find(c => c.value === category);
        return found?.color || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    };

    // Quick Stats Calculation
    const totalReports = blogs.length;
    const uniqueCategories = new Set(blogs.map(b => b.category)).size;
    const uniqueAuthors = new Set(blogs.map(b => b.authorName)).size;
    const thisMonthReports = blogs.filter(b => {
        if (!b.createdAt) return false;
        const d = new Date(b.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="space-y-6">
            {/* Top Module Header */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Engineering Knowledge & Field Intelligence
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Intelligence Feed & Field Reports
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Publish and review workshop field reports, welding specifications, crane installation standards, and technical engineering bulletins.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={fetchBlogs}
                        className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition shadow-sm active:scale-95"
                        title="Refresh Intelligence Feed"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>

                    <button
                        onClick={() => handleLoadSample(SAMPLE_REPORTS[0])}
                        className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm"
                        title="Load a pre-configured sample technical report"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Sample Report
                    </button>

                    <button
                        onClick={() => handleOpenModal()}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition"
                    >
                        <Plus className="w-4 h-4" /> New Field Report
                    </button>
                </div>
            </div>

            {/* KPI Summary Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Reports</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{totalReports}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">This Month</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{thisMonthReports}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Tag className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categories</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{uniqueCategories}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Authors</span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{uniqueAuthors}</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar: Search, Category Pills, View Switcher */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search reports by title, category, author, content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    viewMode === 'grid' 
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    viewMode === 'table' 
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                                title="Table View"
                            >
                                <List className="w-3.5 h-3.5" /> Table
                            </button>
                        </div>
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                                selectedCategory === cat.value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area: Grid or Table View */}
            {loading && blogs.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Loading Intelligence Feed...</p>
                </div>
            ) : filteredBlogs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {searchTerm || selectedCategory !== 'ALL' ? 'No Matching Reports Found' : 'No Field Reports Yet'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                            {searchTerm || selectedCategory !== 'ALL' 
                                ? 'Try refining your search query or switching the category filter above.'
                                : 'Start your workshop intelligence library by creating your first technical report or loading a sample specification.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {searchTerm || selectedCategory !== 'ALL' ? (
                            <button
                                onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                            >
                                Clear All Filters
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleLoadSample(SAMPLE_REPORTS[0])}
                                    className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Insert Welding SOP
                                </button>
                                <button
                                    onClick={() => handleLoadSample(SAMPLE_REPORTS[1])}
                                    className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Insert Crane Alignment SOP
                                </button>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md"
                                >
                                    + Create New Report
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBlogs.map((blog) => (
                        <div 
                            key={blog._id}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition flex flex-col overflow-hidden group"
                        >
                            {/* Card Cover Image */}
                            <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                {blog.image ? (
                                    <img 
                                        src={getDirectImageUrl(blog.image)} 
                                        alt={blog.title}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400">
                                        <BookOpen className="w-12 h-12 opacity-40 text-blue-600 dark:text-blue-400" />
                                    </div>
                                )}
                                
                                <div className="absolute top-4 left-4">
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${getCategoryBadgeClass(blog.category)}`}>
                                        {blog.category}
                                    </span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex flex-col flex-1 space-y-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-blue-500" /> 
                                        {blog.createdAt ? new Date(blog.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) : 'Recent'}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] font-bold">
                                        <Clock className="w-3 h-3" />
                                        ~{Math.max(1, Math.ceil((blog.content || '').split(' ').length / 150))} min read
                                    </span>
                                </div>

                                <h3 
                                    onClick={() => handlePreview(blog)}
                                    className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition"
                                >
                                    {blog.title}
                                </h3>

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed flex-1">
                                    {blog.excerpt || (blog.content ? blog.content.slice(0, 140) + '...' : 'No summary provided.')}
                                </p>

                                {/* Card Footer: Author & Action Buttons */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0 uppercase">
                                            {(blog.authorName || 'KE').slice(0, 2)}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                                            {blog.authorName || 'Chief Engineer'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            onClick={() => handlePreview(blog)}
                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition"
                                            title="View Full Report"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleOpenModal(blog)}
                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl transition"
                                            title="Edit Report"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(blog._id, blog.title)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition"
                                            title="Delete Report"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3.5 px-4">Report</th>
                                    <th className="py-3.5 px-4">Category</th>
                                    <th className="py-3.5 px-4">Author</th>
                                    <th className="py-3.5 px-4">Published Date</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                {filteredBlogs.map((blog) => (
                                    <tr key={blog._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                                                    {blog.image ? (
                                                        <img src={getDirectImageUrl(blog.image)} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <BookOpen className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span 
                                                        onClick={() => handlePreview(blog)}
                                                        className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer block line-clamp-1"
                                                    >
                                                        {blog.title}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 line-clamp-1">
                                                        {blog.excerpt || 'Technical report'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(blog.category)}`}>
                                                {blog.category}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                            {blog.authorName || 'Chief Engineer'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400">
                                            {blog.createdAt ? new Date(blog.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => handlePreview(blog)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenModal(blog)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Edit"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(blog._id, blog.title)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL 1: CREATE / EDIT FIELD REPORT */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[92vh] text-xs z-10"
                        >
                            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
                                <div>
                                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                        {isEditing ? 'Edit Field Report' : 'Publish New Field Report'}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Create structured engineering reports and technical intelligence bulletins.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setModalOpen(false)} 
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Report Headline / Title *
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Precision TIG Welding Standards for Crane Girders"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white text-sm focus:border-blue-500 transition"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                            Classification / Category *
                                        </label>
                                        <select 
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200 text-xs focus:border-blue-500 transition cursor-pointer"
                                        >
                                            <option value="Structural">Structural</option>
                                            <option value="Welding">Welding</option>
                                            <option value="Fabrication">Fabrication</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Safety">Safety</option>
                                            <option value="Quality Control">Quality Control</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                            Author / Engineer Name *
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            value={formData.authorName}
                                            onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                                            placeholder="e.g. Chief Fabrication Engineer"
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200 text-xs focus:border-blue-500 transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Cover Image URL / Google Drive Link
                                    </label>
                                    <input 
                                        type="url"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        placeholder="https://images.unsplash.com/... or Google Drive link"
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-blue-600 dark:text-blue-400 font-medium focus:border-blue-500 transition"
                                    />
                                    {formData.image && (
                                        <div className="mt-2 h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
                                            <img 
                                                src={getDirectImageUrl(formData.image)} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                            <span className="absolute bottom-1 right-2 text-[9px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                Image Preview
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Executive Summary / Excerpt
                                    </label>
                                    <textarea 
                                        rows={2}
                                        value={formData.excerpt}
                                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                        placeholder="Brief 1-2 sentence overview for the card summary..."
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-700 dark:text-slate-300 focus:border-blue-500 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Full Report / Engineering Specifications *
                                    </label>
                                    <textarea 
                                        required
                                        rows={7}
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Detailed technical specifications, procedures, inspection results..."
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs text-slate-700 dark:text-slate-300 font-mono focus:border-blue-500 transition leading-relaxed"
                                    />
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                                    <button 
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider transition shadow-md shadow-blue-600/30 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {saving ? 'Saving Report...' : isEditing ? 'Update Report' : 'Publish Report'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: FULL REPORT READER / PREVIEW MODAL */}
            <AnimatePresence>
                {previewModalOpen && selectedBlog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[92vh] z-10"
                        >
                            {selectedBlog.image && (
                                <div className="relative h-60 sm:h-72 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <img 
                                        src={getDirectImageUrl(selectedBlog.image)} 
                                        alt={selectedBlog.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                    />
                                    <button 
                                        onClick={() => setPreviewModalOpen(false)}
                                        className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="absolute bottom-4 left-4">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-md backdrop-blur-md ${getCategoryBadgeClass(selectedBlog.category)}`}>
                                            {selectedBlog.category}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 sm:p-8 space-y-6">
                                {!selectedBlog.image && (
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${getCategoryBadgeClass(selectedBlog.category)}`}>
                                            {selectedBlog.category}
                                        </span>
                                        <button 
                                            onClick={() => setPreviewModalOpen(false)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
                                        {selectedBlog.title}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                                        <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                                            <User className="w-3.5 h-3.5 text-blue-500" />
                                            {selectedBlog.authorName || 'Chief Engineer'}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {selectedBlog.createdAt ? new Date(selectedBlog.createdAt).toLocaleDateString([], { dateStyle: 'long' }) : 'Recent'}
                                        </span>
                                    </div>
                                </div>

                                {selectedBlog.excerpt && (
                                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 font-medium italic">
                                        "{selectedBlog.excerpt}"
                                    </div>
                                )}

                                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans border-t border-slate-100 dark:border-slate-800 pt-4">
                                    {selectedBlog.content}
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <button
                                        onClick={() => {
                                            setPreviewModalOpen(false);
                                            handleOpenModal(selectedBlog);
                                        }}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" /> Edit Report
                                    </button>

                                    <button
                                        onClick={() => setPreviewModalOpen(false)}
                                        className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition hover:opacity-90"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBlog;
