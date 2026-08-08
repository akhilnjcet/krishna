import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Filter, ArrowUpDown, Download, Printer, Share2, Eye, 
    Copy, Archive, Trash2, RotateCcw, AlertTriangle, FileText, 
    ChevronLeft, ChevronRight, X, Calendar, User, Layers, Info,
    FileCheck2, TrendingUp, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

const DocumentHistory = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // State
    const [documents, setDocuments] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('All');
    const [status, setStatus] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sort, setSort] = useState('Newest First');
    const [showArchived, setShowArchived] = useState(false);

    // Selected Document Modal
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedDocDetail, setSelectedDocDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeVersionTab, setActiveVersionTab] = useState('current');

    // Fetch Documents
    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 15,
                search: searchTerm,
                status,
                dateRange,
                startDate,
                endDate,
                sort,
                archived: showArchived ? 'true' : 'false'
            };
            if (category !== 'All') {
                params.category = category;
            }

            const res = await api.get('/document-history', { params });
            setDocuments(res.data.documents || []);
            setTotal(res.data.total || 0);
            setPages(res.data.pages || 1);
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [page, category, status, dateRange, startDate, endDate, sort, showArchived]);

    // Handle Search
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchDocuments();
    };

    // Fetch Document Details
    const handleViewDetail = async (doc) => {
        setSelectedDoc(doc);
        setLoadingDetail(true);
        setActiveVersionTab('current');
        try {
            const res = await api.get(`/document-history/${doc._id}`);
            setSelectedDocDetail(res.data);
        } catch (err) {
            console.error('Failed to fetch document details:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Download PDF (Base64 to Blob)
    const handleDownloadPDF = (name, base64Str) => {
        if (!base64Str) {
            alert('PDF content is missing or unavailable.');
            return;
        }
        try {
            const byteCharacters = atob(base64Str);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name || 'Document.pdf';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (err) {
            console.error('PDF download error:', err);
            alert('Failed to parse and download PDF file.');
        }
    };

    // Print PDF
    const handlePrintPDF = (base64Str) => {
        if (!base64Str) return alert('PDF data unavailable.');
        try {
            const byteCharacters = atob(base64Str);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (err) {
            console.error('Print failure:', err);
        }
    };

    // Archive / Restore
    const handleArchive = async (id) => {
        try {
            await api.post(`/document-history/${id}/archive`);
            fetchDocuments();
            if (selectedDocDetail?._id === id) {
                setSelectedDocDetail(prev => prev ? { ...prev, archived: !prev.archived } : null);
            }
        } catch (err) {
            console.error('Failed to toggle archive status:', err);
        }
    };

    // Delete (Admin Only)
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this document history entry? This action is irreversible.')) return;
        try {
            await api.delete(`/document-history/${id}`);
            setSelectedDoc(null);
            setSelectedDocDetail(null);
            fetchDocuments();
        } catch (err) {
            console.error('Failed to delete document:', err);
        }
    };

    // Duplicate document details into studio templates
    const handleDuplicate = (doc) => {
        if (!doc.data) return alert('Source data not available.');
        try {
            localStorage.setItem('duplicated_doc_type', doc.documentType);
            localStorage.setItem('duplicated_doc_data', JSON.stringify(doc.data));
            
            let targetPath = '';
            if (doc.documentType === 'Invoice') targetPath = '/admin/invoices-studio';
            else if (doc.documentType === 'Quotation') targetPath = '/admin/quotations-studio';
            else if (doc.documentType === 'Labour Bill') targetPath = '/admin/labour-bills';
            
            if (targetPath) {
                window.location.hash = targetPath;
            } else {
                alert(`Duplication not supported for type: ${doc.documentType}`);
            }
        } catch (err) {
            console.error('Failed to duplicate document:', err);
        }
    };

    // Convert Quotation to Invoice
    const handleConvertToInvoice = (doc) => {
        if (!doc?.data) return alert('Document data unavailable for conversion.');
        try {
            localStorage.setItem('duplicated_doc_type', 'Invoice');
            localStorage.setItem('duplicated_doc_data', JSON.stringify(doc.data));
            window.location.hash = '/admin/invoices-studio';
        } catch (err) {
            console.error('Failed to convert quotation to invoice:', err);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-800 min-h-screen relative font-sans">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Document History & Archive</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Access, search, filter, and inspect previous versions of generated invoices, quotations, receipts, and reports.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border transition ${
                            showArchived 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800'
                        }`}
                    >
                        <Archive className="w-4 h-4" /> {showArchived ? 'View Live Items' : 'View Archived'}
                    </button>
                </div>
            </div>

            {/* Quick Categories Bar */}
            <div className="flex flex-wrap gap-2 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                {['All', 'Quotations', 'Estimates', 'Invoices', 'Labour Bills', 'Salary Slips', 'Reports', 'Receipts'].map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setCategory(cat); setPage(1); }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            category === cat 
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Filters & Control Panel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by doc number, client, project, amount, phone..."
                            className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-300"
                        />
                    </div>
                    <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-95"
                    >
                        Apply Search
                    </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1">Document Status</label>
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl outline-none font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300"
                        >
                            <option value="">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                            <option value="Printed">Printed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1">Date Range</label>
                        <select
                            value={dateRange}
                            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl outline-none font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300"
                        >
                            <option value="">Any Time</option>
                            <option value="Today">Today</option>
                            <option value="Yesterday">Yesterday</option>
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                            <option value="This Year">This Year</option>
                            <option value="Custom">Custom Date Range</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1">Sort Metrics</label>
                        <select
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setPage(1); }}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl outline-none font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300"
                        >
                            <option value="Newest First">Newest First</option>
                            <option value="Oldest First">Oldest First</option>
                            <option value="Highest Amount">Highest Amount</option>
                            <option value="Lowest Amount">Lowest Amount</option>
                            <option value="Document Number">Doc Number</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1">Items Per Page</label>
                        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center border border-slate-200 dark:border-slate-700">
                            Total Records: {total}
                        </div>
                    </div>
                </div>

                {dateRange === 'Custom' && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex-1 space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Start Date</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none text-xs font-bold"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">End Date</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none text-xs font-bold"
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Document List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Document Details</th>
                                <th className="px-6 py-4">Client / Project</th>
                                <th className="px-6 py-4">Financial metrics</th>
                                <th className="px-6 py-4 text-center">Version log</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 dark:text-slate-300">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400">
                                        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                                        Fetching repository archives...
                                    </td>
                                </tr>
                            ) : documents.length > 0 ? documents.map(doc => (
                                <tr key={doc._id} className="hover:bg-slate-50/50 dark:bg-slate-800/50 transition">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{doc.documentNumber}</p>
                                                <p className="text-[9px] uppercase font-black text-slate-400 mt-0.5 tracking-wider">{doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-slate-800 dark:text-slate-200 font-bold">{doc.customerId?.name || 'General Operations'}</p>
                                        {doc.projectId && (
                                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{doc.projectId.title}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 font-black text-slate-800 dark:text-slate-200 text-sm">
                                        {doc.totalAmount > 0 ? `₹ ${doc.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-2.5 py-1 rounded-full font-black">
                                            v{doc.version}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                            doc.status === 'Paid' || doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            doc.status === 'Sent' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                            doc.status === 'Converted' ? 'bg-violet-50 text-violet-600 border border-violet-100' :
                                            doc.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            doc.status === 'Expired' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                            doc.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            doc.status === 'Printed' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                            'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleViewDetail(doc)}
                                                className="p-2 hover:bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-xl transition"
                                                title="View Version log"
                                            >
                                                <Eye className="w-4.5 h-4.5" />
                                            </button>
                                            {doc.pdfData && (
                                                <button 
                                                    onClick={() => handleDownloadPDF(doc.documentNumber, doc.pdfData)}
                                                    className="p-2 hover:bg-slate-100 dark:bg-slate-800/80 text-indigo-600 rounded-xl transition"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                            {/* Convert to Invoice — visible for Quotation type only */}
                                            {doc.documentType === 'Quotation' && (
                                                <button 
                                                    onClick={() => handleConvertToInvoice(doc)}
                                                    className="p-2 hover:bg-violet-50 text-violet-600 rounded-xl transition"
                                                    title="Convert to Invoice"
                                                >
                                                    <FileCheck2 className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDuplicate(doc)}
                                                className="p-2 hover:bg-slate-100 dark:bg-slate-800/80 text-teal-600 rounded-xl transition"
                                                title="Duplicate to Studio"
                                            >
                                                <Copy className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 font-bold italic">
                                        No archived or active document history records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {pages > 1 && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl disabled:opacity-50 text-slate-600 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Page {page} of {pages}</span>
                        <button 
                            disabled={page === pages}
                            onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                            className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl disabled:opacity-50 text-slate-600 dark:text-slate-400"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Document Detail & Version Modal */}
            <AnimatePresence>
                {selectedDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDoc(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">{selectedDoc.documentNumber}</h3>
                                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-0.5">{selectedDoc.documentType} History</p>
                                </div>
                                <button onClick={() => setSelectedDoc(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                                {loadingDetail ? (
                                    <div className="py-20 text-center text-slate-400">
                                        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                                        Decrypting system archives...
                                    </div>
                                ) : selectedDocDetail ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Metadata Left Block */}
                                        <div className="md:col-span-1 space-y-6 border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-6">
                                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Document Summary</h4>
                                                <div className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    <p className="flex justify-between"><span>Status:</span> <span className="text-slate-900 dark:text-white font-extrabold">{selectedDocDetail.status}</span></p>
                                                    {selectedDocDetail.approvalStatus && (
                                                        <p className="flex justify-between">
                                                            <span>Approval:</span>
                                                            <span className={`font-extrabold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${
                                                                selectedDocDetail.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                selectedDocDetail.approvalStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                selectedDocDetail.approvalStatus === 'Sent' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                selectedDocDetail.approvalStatus === 'Converted' ? 'bg-violet-50 text-violet-600 border border-violet-100' :
                                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>{selectedDocDetail.approvalStatus}</span>
                                                        </p>
                                                    )}
                                                    {selectedDocDetail.preparedBy && (
                                                        <p className="flex justify-between"><span>Prepared By:</span> <span className="text-slate-900 dark:text-white truncate max-w-[120px]">{selectedDocDetail.preparedBy}</span></p>
                                                    )}
                                                    <p className="flex justify-between"><span>Amount:</span> <span className="text-slate-900 dark:text-white font-extrabold">₹ {selectedDocDetail.totalAmount?.toLocaleString('en-IN')}</span></p>
                                                    <p className="flex justify-between"><span>Version:</span> <span className="text-indigo-600 font-extrabold">v{selectedDocDetail.version}</span></p>
                                                    <p className="flex justify-between"><span>Created By:</span> <span className="text-slate-900 dark:text-white truncate max-w-[120px]">{selectedDocDetail.createdBy?.name}</span></p>
                                                    <p className="flex justify-between"><span>Date Created:</span> <span className="text-slate-900 dark:text-white">{new Date(selectedDocDetail.createdAt).toLocaleDateString()}</span></p>
                                                </div>
                                            </div>

                                            {/* Action list */}
                                            <div className="space-y-2.5">
                                                {selectedDocDetail.pdfData && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleDownloadPDF(selectedDocDetail.documentNumber, selectedDocDetail.pdfData)}
                                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow transition"
                                                        >
                                                            <Download className="w-4 h-4" /> Download PDF
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePrintPDF(selectedDocDetail.pdfData)}
                                                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                                                        >
                                                            <Printer className="w-4 h-4" /> Print / Save
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => handleDuplicate(selectedDocDetail)}
                                                    className="w-full flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-100 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                                                >
                                                    <Copy className="w-4 h-4" /> Duplicate Document
                                                </button>
                                                <button 
                                                    onClick={() => handleArchive(selectedDocDetail._id)}
                                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition ${
                                                        selectedDocDetail.archived 
                                                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-700' 
                                                            : 'bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-700'
                                                    }`}
                                                >
                                                    <Archive className="w-4 h-4" /> {selectedDocDetail.archived ? 'Restore' : 'Archive'}
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => handleDelete(selectedDocDetail._id)}
                                                        className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Permanently Delete
                                                    </button>
                                                )}
                                                {/* Convert to Invoice — Quotation only */}
                                                {selectedDocDetail.documentType === 'Quotation' && (
                                                    <button 
                                                        onClick={() => handleConvertToInvoice(selectedDocDetail)}
                                                        className="w-full flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                                                    >
                                                        <FileCheck2 className="w-4 h-4" /> Convert to Invoice
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Version History Right Block */}
                                        <div className="md:col-span-2 space-y-6">
                                            <div className="flex border-b border-slate-100 dark:border-slate-800 pb-2 gap-4">
                                                <button 
                                                    onClick={() => setActiveVersionTab('current')}
                                                    className={`pb-2 text-xs font-black uppercase tracking-wider transition border-b-2 ${activeVersionTab === 'current' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
                                                >
                                                    Current Version (v{selectedDocDetail.version})
                                                </button>
                                                {selectedDocDetail.versions?.length > 0 && (
                                                    <button 
                                                        onClick={() => setActiveVersionTab('history')}
                                                        className={`pb-2 text-xs font-black uppercase tracking-wider transition border-b-2 ${activeVersionTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
                                                    >
                                                        Revision logs ({selectedDocDetail.versions.length})
                                                    </button>
                                                )}
                                            </div>

                                            {activeVersionTab === 'current' ? (
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[40vh] overflow-y-auto">
                                                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Decoded Parameter JSON Data</h5>
                                                    <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                                        {JSON.stringify(selectedDocDetail.data, null, 2)}
                                                    </pre>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                                    {selectedDocDetail.versions.map((ver, idx) => (
                                                        <div key={idx} className="bg-slate-50/55 dark:bg-slate-800/55 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col gap-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black">
                                                                    Version {ver.version}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {new Date(ver.updatedAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => handleDownloadPDF(`${selectedDocDetail.documentNumber}_v${ver.version}`, ver.pdfData)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest shadow-sm transition"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Download PDF v{ver.version}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-400 font-bold italic">
                                        Unable to resolve selected document log details.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DocumentHistory;
