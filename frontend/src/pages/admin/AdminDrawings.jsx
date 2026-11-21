import React, { useState, useEffect } from 'react';
import { 
    FileText, Plus, Search, Filter, CheckCircle2, XCircle, AlertTriangle, 
    Download, Eye, Clock, Layers, ShieldCheck, ChevronRight, RefreshCw,
    UploadCloud, Sparkles, Building, ExternalLink, Trash2, Globe, Link2, Maximize2
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// Google Drive URL Parser & Embed Preview Helper
const parseDriveUrl = (url) => {
    if (!url || typeof url !== 'string') return { id: null, embedUrl: '', viewUrl: '', isDrive: false };
    const clean = url.trim();
    if (!clean) return { id: null, embedUrl: '', viewUrl: '', isDrive: false };

    // 1. Google Drive file pattern: /file/d/{id}
    const fileMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        return {
            id: fileMatch[1],
            embedUrl: `https://drive.google.com/file/d/${fileMatch[1]}/preview`,
            viewUrl: `https://drive.google.com/file/d/${fileMatch[1]}/view`,
            isDrive: true
        };
    }
    // 2. id parameter pattern: ?id={id} or &id={id}
    const idMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        return {
            id: idMatch[1],
            embedUrl: `https://drive.google.com/file/d/${idMatch[1]}/preview`,
            viewUrl: `https://drive.google.com/file/d/${idMatch[1]}/view`,
            isDrive: true
        };
    }
    // 3. Google Docs/Sheets/Slides pattern
    const docMatch = clean.match(/\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
        const docType = docMatch[1];
        const docId = docMatch[2];
        const embed = docType === 'presentation'
            ? `https://docs.google.com/presentation/d/${docId}/embed`
            : `https://docs.google.com/${docType}/d/${docId}/preview`;
        return {
            id: docId,
            embedUrl: embed,
            viewUrl: clean,
            isDrive: true
        };
    }
    // If it's a generic URL or drive folder
    if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
        return {
            id: null,
            embedUrl: clean,
            viewUrl: clean,
            isDrive: true
        };
    }
    return { id: null, embedUrl: clean, viewUrl: clean, isDrive: false };
};

const CATEGORIES = [
    'All Categories',
    'Structural Fabrication',
    'Sheet Metal / Pressing',
    'Machining / Turning',
    'Welding & Assembly',
    'Piping & Pressure Vessel',
    'Architectural & Façade',
    'Foundation & Layout',
    'Electrical & Schematics',
    'General Engineering'
];

export default function AdminDrawings() {
    const [drawings, setDrawings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [statusFilter, setStatusFilter] = useState('all');
    const [approvedOnly, setApprovedOnly] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTarget, setPreviewTarget] = useState(null);
    const [previewSource, setPreviewSource] = useState('drive'); // 'drive' | 'file'
    const [selectedDrawing, setSelectedDrawing] = useState(null);
    const [selectedRevision, setSelectedRevision] = useState(null);
    const [reviewAction, setReviewAction] = useState('approve');
    const [reviewComments, setReviewComments] = useState('');

    // Form states
    const [formData, setFormData] = useState({
        drawingNumber: '',
        title: '',
        description: '',
        projectId: '',
        jobOrderNumber: '',
        category: 'Structural Fabrication',
        partName: '',
        materialGrade: 'IS 2062 E250',
        tolerance: '±0.5mm',
        initialRevisionNumber: 'R0',
        revisionDescription: 'Initial Engineering Release',
        fileUrl: '',
        driveUrl: '',
        fileName: '',
        fileSize: 0,
        tags: ''
    });

    const [revisionFormData, setRevisionFormData] = useState({
        revisionNumber: 'R1',
        description: '',
        fileUrl: '',
        driveUrl: '',
        fileName: '',
        fileSize: 0
    });

    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

    const openPreview = (item, preferredSource = null) => {
        if (!item) return;
        const drive = item.driveUrl || item.activeRevisionDriveUrl || '';
        const file = item.fileUrl || item.activeRevisionFileUrl || '';
        const parsed = parseDriveUrl(drive);
        const embed = item.driveEmbedUrl || item.activeRevisionEmbedUrl || parsed.embedUrl || drive;

        const source = preferredSource 
            ? preferredSource 
            : (drive ? 'drive' : 'file');

        setPreviewTarget({
            title: item.title || 'Engineering Drawing Sheet',
            drawingNumber: item.drawingNumber || 'DRAFT',
            revisionNumber: item.revisionNumber || item.currentRevision || 'R0',
            fileUrl: file,
            driveUrl: drive,
            embedUrl: embed,
            fileName: item.fileName || 'Drawing_Sheet.pdf',
            category: item.category || 'Structural Fabrication',
            isDrive: Boolean(drive)
        });
        setPreviewSource(source);
        setShowPreviewModal(true);
    };

    useEffect(() => {
        fetchDrawings();
        fetchProjects();
    }, [search, selectedCategory, statusFilter, approvedOnly, pagination.page]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data.projects || res.data || []);
        } catch (e) {
            console.error('Error fetching projects:', e);
        }
    };

    const fetchDrawings = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: 15,
                search: search.trim(),
                category: selectedCategory === 'All Categories' ? 'all' : selectedCategory,
                status: statusFilter,
                approvedOnly: approvedOnly ? 'true' : 'false'
            };
            const res = await api.get('/drawings', { params });
            if (res.data && res.data.success) {
                setDrawings(res.data.drawings || []);
                setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
            }
        } catch (err) {
            console.error('Error fetching drawings:', err);
            setActionMsg({ type: 'error', text: 'Failed to fetch fabrication drawings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e, isRevision = false) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const res = await api.post('/uploads', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fileUrl = res.data.url || res.data.fileUrl || res.data.path;
            if (isRevision) {
                setRevisionFormData(prev => ({
                    ...prev,
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    fileUrl,
                    fileName: file.name,
                    fileSize: file.size
                }));
            }
            setActionMsg({ type: 'success', text: `Uploaded "${file.name}" successfully.` });
        } catch (err) {
            console.error('File upload error:', err);
            setActionMsg({ type: 'error', text: 'File upload failed. Max 10MB (PDF/JPG/PNG).' });
        } finally {
            setUploading(false);
        }
    };

    const handleCreateDrawing = async (e) => {
        e.preventDefault();
        if (!formData.drawingNumber || !formData.title || !formData.projectId || (!formData.fileUrl && !formData.driveUrl)) {
            setActionMsg({ type: 'error', text: 'Drawing Number, Title, Project, and either a Drawing File or Google Drive link are required.' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/drawings', formData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowCreateModal(false);
                setFormData({
                    drawingNumber: '',
                    title: '',
                    description: '',
                    projectId: '',
                    jobOrderNumber: '',
                    category: 'Structural Fabrication',
                    partName: '',
                    materialGrade: 'IS 2062 E250',
                    tolerance: '±0.5mm',
                    initialRevisionNumber: 'R0',
                    revisionDescription: 'Initial Engineering Release',
                    fileUrl: '',
                    driveUrl: '',
                    fileName: '',
                    fileSize: 0,
                    tags: ''
                });
                fetchDrawings();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error creating drawing.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddRevision = async (e) => {
        e.preventDefault();
        if (!revisionFormData.revisionNumber || !revisionFormData.description || (!revisionFormData.fileUrl && !revisionFormData.driveUrl)) {
            setActionMsg({ type: 'error', text: 'Revision Number, Description, and either a Drawing File or Google Drive link are required.' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post(`/drawings/${selectedDrawing._id}/revisions`, revisionFormData);
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowRevisionModal(false);
                setSelectedDrawing(res.data.drawing);
                fetchDrawings();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error adding revision.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewRevision = async () => {
        if (!selectedDrawing || !selectedRevision) return;
        setSubmitting(true);
        try {
            const res = await api.patch(`/drawings/${selectedDrawing._id}/revisions/${selectedRevision._id}/review`, {
                action: reviewAction,
                comments: reviewComments
            });
            if (res.data.success) {
                setActionMsg({ type: 'success', text: res.data.message });
                setShowReviewModal(false);
                setReviewComments('');
                setSelectedDrawing(res.data.drawing);
                fetchDrawings();
            }
        } catch (err) {
            setActionMsg({ type: 'error', text: err.response?.data?.message || 'Error reviewing revision.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                            Engineering Standard Control
                        </span>
                        <span className="text-xs text-slate-400">• ISO Fabrication Specs</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Fabrication Drawings & Revision Control
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Central drawing vault with strict revision sequencing, approval gating, and superseded draft lockouts.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => fetchDrawings()}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Release New Drawing
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionMsg.text && (
                <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
                    actionMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                    <span>{actionMsg.text}</span>
                    <button onClick={() => setActionMsg({ type: '', text: '' })} className="font-bold underline ml-4">Dismiss</button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Search by drawing number, title, part name, project or job order..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <button
                        onClick={() => setApprovedOnly(v => !v)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            approvedOnly
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Production Approved Only</span>
                    </button>
                </div>
            </div>

            {/* Drawings Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Engineering Drawings...</p>
                </div>
            ) : drawings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">No Drawings Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                        {search || selectedCategory !== 'All Categories' ? 'No drawings match the selected filters.' : 'Release your first fabrication drawing to start engineering revision tracking.'}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                        Release New Drawing
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drawings.map(dwg => {
                        const approvedRev = dwg.revisions.find(r => r.status === 'Approved');
                        const isProductionReady = dwg.isApprovedForProduction && dwg.status === 'Approved';

                        return (
                            <div 
                                key={dwg._id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Header Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="font-black font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                                            {dwg.drawingNumber}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {(dwg.driveUrl || dwg.activeRevisionDriveUrl) && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center gap-1" title="Google Drive Cloud Sheet">
                                                    <Globe className="w-2.5 h-2.5" /> Drive
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                Rev {dwg.currentRevision}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                isProductionReady
                                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                    : dwg.status === 'Rejected'
                                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                            }`}>
                                                {dwg.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                                        {dwg.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                        {dwg.description || 'Structural fabrication drawing with tolerance notes.'}
                                    </p>

                                    {/* Meta Attributes */}
                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-[11px]">
                                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                            <span className="text-slate-400">Project:</span>
                                            <span className="font-bold truncate max-w-[170px]">{dwg.projectTitle || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                            <span className="text-slate-400">Category:</span>
                                            <span className="font-medium">{dwg.category}</span>
                                        </div>
                                        {dwg.materialGrade && (
                                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                                <span className="text-slate-400">Material Grade:</span>
                                                <span className="font-mono">{dwg.materialGrade}</span>
                                            </div>
                                        )}
                                        {dwg.tolerance && (
                                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                                <span className="text-slate-400">Tolerance:</span>
                                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{dwg.tolerance}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Revisions Preview Strip */}
                                    <div className="mt-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                            Revisions History ({dwg.revisions.length})
                                        </p>
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                            {dwg.revisions.map(rev => (
                                                <button
                                                    key={rev._id}
                                                    onClick={() => {
                                                        setSelectedDrawing(dwg);
                                                        setSelectedRevision(rev);
                                                        setShowReviewModal(true);
                                                    }}
                                                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0 transition-colors ${
                                                        rev.status === 'Approved'
                                                            ? 'bg-emerald-500 text-white'
                                                            : rev.status === 'Superseded'
                                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 line-through'
                                                            : rev.status === 'Rejected'
                                                            ? 'bg-rose-500 text-white'
                                                            : 'bg-amber-400 text-slate-900'
                                                    }`}
                                                    title={`${rev.revisionNumber}: ${rev.status} - Click to review`}
                                                >
                                                    {rev.revisionNumber}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedDrawing(dwg);
                                            // Pre-fill next revision number
                                            const nextNum = `R${dwg.revisions.length}`;
                                            setRevisionFormData({
                                                revisionNumber: nextNum,
                                                description: `Revision ${nextNum} per fabrication feedback`,
                                                fileUrl: '',
                                                driveUrl: dwg.driveUrl || dwg.activeRevisionDriveUrl || '',
                                                fileName: '',
                                                fileSize: 0
                                            });
                                            setShowRevisionModal(true);
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Next Revision
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openPreview(dwg)}
                                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1 text-xs font-bold"
                                            title="Interactive Drawing Sheet Preview"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Preview</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedDrawing(dwg);
                                                setSelectedRevision(dwg.revisions[dwg.revisions.length - 1]);
                                                setShowReviewModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Strip */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-4">
                    <span>Showing page {pagination.page} of {pagination.pages} ({pagination.total} total drawings)</span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Modal 1: Release New Drawing */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Release New Fabrication Drawing</h3>
                                    <p className="text-xs text-slate-400">Assign unique drawing code and initial revision R0</p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                            </div>

                            <form onSubmit={handleCreateDrawing} className="space-y-4 mt-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Drawing Number *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. DWG-TRUSS-001"
                                            value={formData.drawingNumber}
                                            onChange={e => setFormData({ ...formData, drawingNumber: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Overhead Crane Support Truss"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Project *</label>
                                        <select
                                            required
                                            value={formData.projectId}
                                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            <option value="">-- Choose Project --</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title} ({p.clientName || 'Client'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        >
                                            {CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Part / Assembly Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Base Plate 400x400"
                                            value={formData.partName}
                                            onChange={e => setFormData({ ...formData, partName: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Material Grade</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. IS 2062 E250 / SS 304"
                                            value={formData.materialGrade}
                                            onChange={e => setFormData({ ...formData, materialGrade: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tolerance Spec</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. ±0.5mm"
                                            value={formData.tolerance}
                                            onChange={e => setFormData({ ...formData, tolerance: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Drawing Sheet Source: Google Drive Link + Local File Upload */}
                                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                                    <div className="flex items-center justify-between">
                                        <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span>Drawing Sheet & Blueprint Source *</span>
                                        </label>
                                        <span className="text-[10px] text-slate-400">Provide Drive link, file upload, or both</span>
                                    </div>

                                    {/* Google Drive Link Option */}
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-[11px] flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span>Google Drive Shareable Link (CAD / PDF / Image Cloud Host)</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                                                value={formData.driveUrl}
                                                onChange={e => setFormData({ ...formData, driveUrl: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            {formData.driveUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => openPreview({
                                                        title: formData.title || 'Draft Drawing',
                                                        drawingNumber: formData.drawingNumber || 'DWG-DRAFT',
                                                        revisionNumber: formData.initialRevisionNumber || 'R0',
                                                        driveUrl: formData.driveUrl
                                                    }, 'drive')}
                                                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 border border-blue-200 dark:border-blue-800 transition"
                                                    title="Live Test & Preview Drive Link"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Preview</span>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Ensure access is set to <strong>"Anyone with the link can view"</strong> for interactive in-app preview.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 my-1">
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AND / OR</span>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                    </div>

                                    {/* Local File Upload Box */}
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                                            Direct File Upload (PDF or High-Res CAD Image)
                                        </label>
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 text-center hover:border-blue-500 transition-colors bg-white dark:bg-slate-900">
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={e => handleFileUpload(e, false)}
                                                className="hidden"
                                                id="dwg-file-upload"
                                            />
                                            <label htmlFor="dwg-file-upload" className="cursor-pointer flex flex-col items-center">
                                                <UploadCloud className="w-7 h-7 text-blue-600 mb-1" />
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                    {uploading ? 'Uploading...' : formData.fileName || 'Click to select PDF / CAD drawing'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Maximum file size: 10 MB. Local upload is optional if Google Drive link is provided.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                                    >
                                        {submitting ? 'Registering...' : 'Release Drawing'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal 2: Add Revision */}
            <AnimatePresence>
                {showRevisionModal && selectedDrawing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                                        Add Revision to {selectedDrawing.drawingNumber}
                                    </h3>
                                    <p className="text-xs text-slate-400">{selectedDrawing.title}</p>
                                </div>
                                <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 font-bold">✕</button>
                            </div>

                            <form onSubmit={handleAddRevision} className="space-y-4 mt-4 text-xs">
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Revision Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. R1, R2, R3"
                                        value={revisionFormData.revisionNumber}
                                        onChange={e => setRevisionFormData({ ...revisionFormData, revisionNumber: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Engineering Change Description *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Explain changes made in this revision (e.g. Changed web plate thickness from 8mm to 10mm per client review)..."
                                        value={revisionFormData.description}
                                        onChange={e => setRevisionFormData({ ...revisionFormData, description: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>

                                {/* Revision Source: Google Drive Link + Local File */}
                                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                                    <div className="flex items-center justify-between">
                                        <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-indigo-600" />
                                            <span>Revised Drawing Source *</span>
                                        </label>
                                        <span className="text-[10px] text-slate-400">Drive link, file upload, or both</span>
                                    </div>

                                    {/* Google Drive Link Option */}
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-[11px] flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span>Google Drive Shareable Link (Optional)</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                                                value={revisionFormData.driveUrl}
                                                onChange={e => setRevisionFormData({ ...revisionFormData, driveUrl: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-blue-600 dark:text-blue-400"
                                            />
                                            {revisionFormData.driveUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => openPreview({
                                                        title: selectedDrawing?.title || 'Revised Drawing',
                                                        drawingNumber: selectedDrawing?.drawingNumber || 'REV',
                                                        revisionNumber: revisionFormData.revisionNumber,
                                                        driveUrl: revisionFormData.driveUrl
                                                    }, 'drive')}
                                                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 border border-blue-200 dark:border-blue-800 transition"
                                                    title="Live Test & Preview Drive Link"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Preview</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 my-1">
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AND / OR</span>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                    </div>

                                    {/* Local File Upload Box */}
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                                            Direct File Upload (PDF / Image)
                                        </label>
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-center bg-white dark:bg-slate-900">
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={e => handleFileUpload(e, true)}
                                                className="hidden"
                                                id="rev-file-upload"
                                            />
                                            <label htmlFor="rev-file-upload" className="cursor-pointer flex flex-col items-center">
                                                <UploadCloud className="w-6 h-6 text-indigo-600 mb-1" />
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                    {uploading ? 'Uploading...' : revisionFormData.fileName || 'Upload Revised Drawing Sheet'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowRevisionModal(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Revision'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal 3: Revision Details & Approval Workflow */}
            <AnimatePresence>
                {showReviewModal && selectedDrawing && selectedRevision && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-8 text-xs"
                        >
                            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-bold text-blue-600">{selectedDrawing.drawingNumber}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                            Revision {selectedRevision.revisionNumber}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-base">{selectedDrawing.title}</h3>
                                </div>
                                <button onClick={() => setShowReviewModal(false)} className="text-slate-400 font-bold text-lg">✕</button>
                            </div>

                            {/* Superseded Warning Banner */}
                            {selectedRevision.status === 'Superseded' && (
                                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div>
                                        <p className="font-black">⚠ SUPERSEDED DRAWING SHEET</p>
                                        <p className="text-[11px] opacity-90">
                                            This revision is marked as superseded. Workshop staff must NOT use this print for cutting or fabrication. Current approved revision is: <strong>Rev {selectedDrawing.currentRevision}</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Revision Details Card */}
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-slate-400 block">Uploaded By:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRevision.uploadedByName}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Release Date:</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{new Date(selectedRevision.revisionDate).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Engineering Description:</span>
                                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        {selectedRevision.description}
                                    </p>
                                </div>
                                {selectedRevision.approvalComments && (
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Approval Remarks:</span>
                                        <p className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                            "{selectedRevision.approvalComments}" — {selectedRevision.approvedByName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* View / Download / In-App Preview Controls */}
                            <div className="mt-4 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-xs">{selectedRevision.fileName}</p>
                                            <p className="text-[10px] text-slate-400">PDF / CAD Engineering Drawing</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => openPreview({
                                                ...selectedDrawing,
                                                ...selectedRevision,
                                                driveUrl: selectedRevision.driveUrl || selectedDrawing.driveUrl,
                                                fileUrl: selectedRevision.fileUrl
                                            })}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> In-App Preview
                                        </button>
                                        {selectedRevision.fileUrl && (
                                            <a
                                                href={selectedRevision.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Download
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* If Revision has Google Drive Link */}
                                {(selectedRevision.driveUrl || selectedDrawing.driveUrl) && (
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5" /> Google Drive Cloud Link Available
                                        </span>
                                        <a
                                            href={selectedRevision.driveUrl || selectedDrawing.driveUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 text-[11px]"
                                        >
                                            Open in Google Drive <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Approval Action Form (If Pending Approval) */}
                            {selectedRevision.status === 'Pending Approval' && (
                                <div className="mt-5 p-4 border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl space-y-3">
                                    <p className="font-bold text-blue-900 dark:text-blue-300">Engineering Approval Workflow</p>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-700 dark:text-emerald-400">
                                            <input
                                                type="radio"
                                                name="action"
                                                value="approve"
                                                checked={reviewAction === 'approve'}
                                                onChange={() => setReviewAction('approve')}
                                            />
                                            Approve for Workshop Fabrication
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-700 dark:text-rose-400">
                                            <input
                                                type="radio"
                                                name="action"
                                                value="reject"
                                                checked={reviewAction === 'reject'}
                                                onChange={() => setReviewAction('reject')}
                                            />
                                            Reject Revision
                                        </label>
                                    </div>

                                    <textarea
                                        rows={2}
                                        placeholder="Add approval comments or rejection reason..."
                                        value={reviewComments}
                                        onChange={e => setReviewComments(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />

                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={handleReviewRevision}
                                            className={`px-4 py-2 font-bold text-white rounded-xl shadow-md ${
                                                reviewAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                            }`}
                                        >
                                            {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Confirm Approval & Mark Active' : 'Confirm Rejection'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal 4: Interactive Drawing & Blueprint Preview Modal */}
            <AnimatePresence>
                {showPreviewModal && previewTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-hidden">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900">
                                                {previewTarget.drawingNumber}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                Rev {previewTarget.revisionNumber}
                                            </span>
                                            {previewTarget.isDrive && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                                                    <Globe className="w-2.5 h-2.5" /> Google Drive
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-slate-900 dark:text-white text-sm truncate max-w-md mt-0.5">
                                            {previewTarget.title}
                                        </h3>
                                    </div>
                                </div>

                                {/* Controls & Close */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Switch Source Tabs if both exist */}
                                    {previewTarget.driveUrl && previewTarget.fileUrl && (
                                        <div className="hidden sm:flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewSource('drive')}
                                                className={`px-3 py-1 rounded-lg transition ${
                                                    previewSource === 'drive'
                                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                Google Drive
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewSource('file')}
                                                className={`px-3 py-1 rounded-lg transition ${
                                                    previewSource === 'file'
                                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                Uploaded File
                                            </button>
                                        </div>
                                    )}

                                    {/* Open in External Tab */}
                                    <a
                                        href={previewSource === 'drive' && previewTarget.driveUrl ? previewTarget.driveUrl : previewTarget.fileUrl || previewTarget.driveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                                        title="Open Original in New Tab"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span className="hidden md:inline">Open Original</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setShowPreviewModal(false)}
                                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Preview Viewport */}
                            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden relative flex flex-col">
                                {previewSource === 'drive' && previewTarget.driveUrl ? (
                                    <div className="w-full h-full flex flex-col">
                                        <iframe
                                            src={previewTarget.embedUrl}
                                            title={previewTarget.title}
                                            className="w-full flex-1 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white"
                                            allow="autoplay; fullscreen"
                                            allowFullScreen
                                        />
                                        <div className="py-2 px-3 flex items-center justify-between text-[11px] text-slate-500 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 rounded-b-2xl">
                                            <span>Google Drive Viewer with interactive zoom, navigation, and pan controls.</span>
                                            <a
                                                href={previewTarget.driveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                                            >
                                                Open in Drive <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ) : previewTarget.fileUrl ? (
                                    previewTarget.fileUrl.match(/\.(png|jpg|jpeg|svg|webp)($|\?)/i) ? (
                                        <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-slate-900/10 rounded-2xl">
                                            <img
                                                src={previewTarget.fileUrl}
                                                alt={previewTarget.title}
                                                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                                            />
                                        </div>
                                    ) : (
                                        <iframe
                                            src={previewTarget.fileUrl}
                                            title={previewTarget.title}
                                            className="w-full h-full rounded-2xl border border-slate-300 dark:border-slate-800 bg-white"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <AlertTriangle className="w-10 h-10 mb-2 opacity-50" />
                                        <p className="font-bold">No file or Google Drive link available for preview.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
