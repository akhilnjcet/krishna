import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Plus, Trash2, Edit3, Eye, FileText, Download, 
    ExternalLink, Upload, AlertTriangle, Megaphone, Flame, 
    Check, X, Image as ImageIcon, Save, RefreshCw, Sparkles, Clock, MapPin
} from 'lucide-react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';

const AdminCareers = () => {
    const [activeTab, setActiveTab] = useState('vacancies'); // 'vacancies' | 'banner' | 'announcements'
    const [vacancies, setVacancies] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [banner, setBanner] = useState({
        title: 'Urgent Job Vacancies Open',
        description: 'Applications open for technicians, engineers, and fabricators.',
        imageUrl: '',
        driveUrl: '',
        actionLink: '#/careers',
        isActive: true,
        isUrgent: true
    });

    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

    // Vacancy Form State
    const [showVacancyForm, setShowVacancyForm] = useState(false);
    const [editingVacancyId, setEditingVacancyId] = useState(null);
    const [vacancyForm, setVacancyForm] = useState({
        title: '',
        department: 'Mechanical Engineering',
        jobType: 'Full-time',
        experience: '1-3 Years',
        location: 'Industrial Area, Thiruvazhiyode, Palakkad',
        salary: 'Best in Industry',
        openings: 1,
        description: '',
        requirements: '',
        circularUrl: '',
        circularType: 'none',
        driveUrl: '',
        isUrgent: false,
        deadline: ''
    });

    // Announcement Form State
    const [announcementText, setAnnouncementText] = useState('');
    const [announcementType, setAnnouncementType] = useState('info');
    const [announcementLink, setAnnouncementLink] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vacRes, annRes, banRes] = await Promise.all([
                api.get('/vacancies/admin'),
                api.get('/announcements/admin'),
                api.get('/vacancies/banner')
            ]);

            if (vacRes.data?.success) setVacancies(vacRes.data.data);
            if (annRes.data?.success) setAnnouncements(annRes.data.data);
            if (banRes.data?.success && banRes.data.data) {
                setBanner(banRes.data.data);
            }
        } catch (err) {
            console.error('Error fetching admin career data:', err);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (type, text) => {
        setFeedbackMsg({ type, text });
        setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    };

    // ─── File Upload Handler (for Circular & Banner) ──────────────────────────────
    const handleFileUpload = async (e, target) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        if (target === 'circular') setUploadingFile(true);
        if (target === 'banner') setUploadingBanner(true);

        try {
            const res = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const uploadedUrl = res.data?.fileUrl || res.data?.url;
            if (!uploadedUrl) throw new Error('File URL not returned by server.');

            if (target === 'circular') {
                const isPdf = file.name.toLowerCase().endsWith('.pdf');
                setVacancyForm(prev => ({
                    ...prev,
                    circularUrl: uploadedUrl,
                    circularType: isPdf ? 'pdf' : 'image'
                }));
                showNotification('success', `Circular ${file.name} uploaded successfully!`);
            } else if (target === 'banner') {
                setBanner(prev => ({ ...prev, imageUrl: uploadedUrl }));
                showNotification('success', 'Banner image uploaded successfully!');
            }
        } catch (err) {
            showNotification('error', `Upload failed: ${err.response?.data?.message || err.message}`);
        } finally {
            if (target === 'circular') setUploadingFile(false);
            if (target === 'banner') setUploadingBanner(false);
        }
    };

    // ─── Vacancy Actions ─────────────────────────────────────────────────────────
    const handleSaveVacancy = async (e) => {
        e.preventDefault();
        try {
            if (editingVacancyId) {
                const res = await api.put(`/vacancies/${editingVacancyId}`, vacancyForm);
                if (res.data?.success) {
                    showNotification('success', 'Vacancy updated successfully!');
                }
            } else {
                const res = await api.post('/vacancies', vacancyForm);
                if (res.data?.success) {
                    showNotification('success', 'New vacancy published successfully!');
                }
            }
            setShowVacancyForm(false);
            setEditingVacancyId(null);
            resetVacancyForm();
            fetchData();
        } catch (err) {
            showNotification('error', err.response?.data?.message || err.message);
        }
    };

    const handleDeleteVacancy = async (id) => {
        if (!window.confirm('Are you sure you want to delete this vacancy?')) return;
        try {
            await api.delete(`/vacancies/${id}`);
            showNotification('success', 'Vacancy deleted successfully.');
            setVacancies(vacancies.filter(v => v._id !== id));
        } catch (err) {
            showNotification('error', err.response?.data?.message || err.message);
        }
    };

    const handleToggleVacancyStatus = async (vacancy) => {
        const newStatus = vacancy.status === 'open' ? 'closed' : 'open';
        try {
            await api.put(`/vacancies/${vacancy._id}`, { status: newStatus });
            setVacancies(vacancies.map(v => v._id === vacancy._id ? { ...v, status: newStatus } : v));
            showNotification('success', `Vacancy status changed to ${newStatus}.`);
        } catch (err) {
            showNotification('error', err.message);
        }
    };

    const resetVacancyForm = () => {
        setVacancyForm({
            title: '',
            department: 'Mechanical Engineering',
            jobType: 'Full-time',
            experience: '1-3 Years',
            location: 'Industrial Area, Thiruvazhiyode, Palakkad',
            salary: 'Best in Industry',
            openings: 1,
            description: '',
            requirements: '',
            circularUrl: '',
            circularType: 'none',
            driveUrl: '',
            isUrgent: false,
            deadline: ''
        });
    };

    // ─── Banner Actions ──────────────────────────────────────────────────────────
    const handleSaveBanner = async (e) => {
        e.preventDefault();
        if (!banner.imageUrl) {
            return showNotification('error', 'Please provide or upload a banner image URL.');
        }
        try {
            const res = await api.post('/vacancies/banner', banner);
            if (res.data?.success) {
                showNotification('success', 'Vacancy Ad Banner updated successfully!');
            }
        } catch (err) {
            showNotification('error', err.response?.data?.message || err.message);
        }
    };

    const handleDeleteBanner = async () => {
        if (!window.confirm('Are you sure you want to remove the vacancy ad banner?')) return;
        try {
            await api.delete('/vacancies/banner');
            setBanner({
                title: '',
                description: '',
                imageUrl: '',
                driveUrl: '',
                actionLink: '#/careers',
                isActive: false,
                isUrgent: false
            });
            showNotification('success', 'Vacancy Ad Banner removed successfully.');
        } catch (err) {
            showNotification('error', err.response?.data?.message || err.message);
        }
    };

    // ─── Announcement Actions ────────────────────────────────────────────────────
    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementText.trim()) return;
        try {
            const res = await api.post('/announcements', {
                text: announcementText.trim(),
                type: announcementType,
                link: announcementLink.trim()
            });
            if (res.data?.success) {
                showNotification('success', 'Announcement published to website ticker!');
                setAnnouncementText('');
                setAnnouncementLink('');
                fetchData();
            }
        } catch (err) {
            showNotification('error', err.response?.data?.message || err.message);
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm('Delete this scrolling announcement?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            showNotification('success', 'Announcement removed.');
            setAnnouncements(announcements.filter(a => a._id !== id));
        } catch (err) {
            showNotification('error', err.message);
        }
    };

    const handleToggleAnnouncement = async (ann) => {
        try {
            const updated = !ann.isActive;
            await api.put(`/announcements/${ann._id}`, { isActive: updated });
            setAnnouncements(announcements.map(a => a._id === ann._id ? { ...a, isActive: updated } : a));
            showNotification('success', `Announcement ${updated ? 'activated' : 'hidden'}.`);
        } catch (err) {
            showNotification('error', err.message);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <span>Careers & Public Notices Hub</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                        Manage company job vacancies, circular downloads, ad banners, and scrolling maintenance tickers.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {feedbackMsg.text && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold shadow-md transition-all ${
                    feedbackMsg.type === 'success' 
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                }`}>
                    <span>{feedbackMsg.text}</span>
                    <button onClick={() => setFeedbackMsg({ type: '', text: '' })} className="opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Navigation Tabs (Mobile Scrollable) */}
            <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 w-max min-w-full pb-1">
                    <button
                        onClick={() => setActiveTab('vacancies')}
                        className={`flex-shrink-0 whitespace-nowrap pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === 'vacancies'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span>Job Vacancies ({vacancies.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('banner')}
                        className={`flex-shrink-0 whitespace-nowrap pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === 'banner'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Flame className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>Urgent Vacancy Ad Banner</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`flex-shrink-0 whitespace-nowrap pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === 'announcements'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Megaphone className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span>Scrolling Announcements ({announcements.length})</span>
                    </button>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: VACANCIES MANAGEMENT                                          */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'vacancies' && (
                <div className="space-y-6">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            Post, update, or remove job opportunities displayed on the public Careers portal.
                        </p>
                        <button
                            onClick={() => {
                                resetVacancyForm();
                                setEditingVacancyId(null);
                                setShowVacancyForm(true);
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Post New Vacancy</span>
                        </button>
                    </div>

                    {/* Vacancy Form Modal / Section */}
                    {showVacancyForm && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-blue-500/30 dark:border-blue-500/20 shadow-xl space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                    <span>{editingVacancyId ? 'Edit Vacancy' : 'Create New Job Vacancy'}</span>
                                </h3>
                                <button
                                    onClick={() => setShowVacancyForm(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveVacancy} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {/* Title */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Job Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Senior CNC Lathe Operator, Quality Engineer"
                                        value={vacancyForm.title}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Department *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Fabrication, Mechanical, Sales"
                                        value={vacancyForm.department}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, department: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Job Type */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Employment Type
                                    </label>
                                    <select
                                        value={vacancyForm.jobType}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, jobType: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                        <option value="Walk-in">Walk-in</option>
                                    </select>
                                </div>

                                {/* Experience */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Experience Required
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2-5 Years, Freshers Welcome"
                                        value={vacancyForm.experience}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, experience: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Openings */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        No. of Openings
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={vacancyForm.openings}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, openings: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Salary */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Remuneration / Salary
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ₹20,000 - ₹35,000 / month, Best in Industry"
                                        value={vacancyForm.salary}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, salary: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Location */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Work Location
                                    </label>
                                    <input
                                        type="text"
                                        value={vacancyForm.location}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, location: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Urgent Vacancy Checkbox */}
                                <div className="flex items-center gap-3 pt-6">
                                    <label className="relative flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={vacancyForm.isUrgent}
                                            onChange={(e) => setVacancyForm({ ...vacancyForm, isUrgent: e.target.checked })}
                                            className="w-5 h-5 rounded-lg text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Flame className="w-4 h-4 text-rose-500" />
                                            <span>Mark as Urgent Vacancy</span>
                                        </span>
                                    </label>
                                </div>

                                {/* Description */}
                                <div className="sm:col-span-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Detailed Description *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Outline job responsibilities, shift requirements, and primary tasks..."
                                        value={vacancyForm.description}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Requirements */}
                                <div className="sm:col-span-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Requirements & Qualifications (One per line)
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="ITI / Diploma in Mechanical Engineering&#10;Minimum 2 years experience operating CNC machinery&#10;Ability to read CAD and fabrication drawings"
                                        value={vacancyForm.requirements}
                                        onChange={(e) => setVacancyForm({ ...vacancyForm, requirements: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Circular PDF/Image File Upload */}
                                <div className="sm:col-span-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <span>Circular Attachment & Google Drive Integration</span>
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* File Upload */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                                Upload Circular Document (PDF or Image)
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => handleFileUpload(e, 'circular')}
                                                    className="text-xs file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                                                />
                                                {uploadingFile && (
                                                    <span className="text-xs text-blue-600 animate-pulse font-bold">Uploading...</span>
                                                )}
                                            </div>
                                            {vacancyForm.circularUrl && (
                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-bold truncate">
                                                    ✓ Attached: {vacancyForm.circularUrl}
                                                </p>
                                            )}
                                        </div>

                                        {/* Google Drive Link */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                                Google Drive Link (Public View/Download URL)
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://drive.google.com/file/d/.../view"
                                                value={vacancyForm.driveUrl}
                                                onChange={(e) => setVacancyForm({ ...vacancyForm, driveUrl: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Clients can directly open this Google Drive circular in a new tab.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Submit Actions */}
                                <div className="sm:col-span-3 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowVacancyForm(false)}
                                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                                    >
                                        {editingVacancyId ? 'Save Updates' : 'Publish Vacancy'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Vacancies List */}
                    {vacancies.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800">
                            <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Vacancies Published Yet</h3>
                            <p className="text-slate-500 text-xs mt-1 mb-4">Click "Post New Vacancy" above to add the first position.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {vacancies.map((vacancy) => (
                                <div 
                                    key={vacancy._id}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                vacancy.status === 'open' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                            }`}>
                                                {vacancy.status}
                                            </span>

                                            {vacancy.isUrgent && (
                                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                                                    <Flame className="w-3 h-3" />
                                                    <span>Urgent</span>
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">
                                            {vacancy.title}
                                        </h4>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-3">
                                            {vacancy.department} • {vacancy.jobType}
                                        </p>

                                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                                            {vacancy.description}
                                        </p>

                                        {/* Attachments indicators */}
                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                            {vacancy.circularUrl && (
                                                <a 
                                                    href={getDirectImageUrl(vacancy.circularUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>Circular File</span>
                                                </a>
                                            )}
                                            {vacancy.driveUrl && (
                                                <a 
                                                    href={vacancy.driveUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Drive Link</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => handleToggleVacancyStatus(vacancy)}
                                            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                        >
                                            {vacancy.status === 'open' ? 'Close Position' : 'Re-open Position'}
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setEditingVacancyId(vacancy._id);
                                                    setVacancyForm({
                                                        title: vacancy.title,
                                                        department: vacancy.department,
                                                        jobType: vacancy.jobType || 'Full-time',
                                                        experience: vacancy.experience || '',
                                                        location: vacancy.location || '',
                                                        salary: vacancy.salary || '',
                                                        openings: vacancy.openings || 1,
                                                        description: vacancy.description || '',
                                                        requirements: Array.isArray(vacancy.requirements) ? vacancy.requirements.join('\n') : '',
                                                        circularUrl: vacancy.circularUrl || '',
                                                        circularType: vacancy.circularType || 'none',
                                                        driveUrl: vacancy.driveUrl || '',
                                                        isUrgent: Boolean(vacancy.isUrgent),
                                                        deadline: vacancy.deadline ? vacancy.deadline.substring(0, 10) : ''
                                                    });
                                                    setShowVacancyForm(true);
                                                }}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                                title="Edit Vacancy"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteVacancy(vacancy._id)}
                                                className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-colors"
                                                title="Delete Vacancy"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: VACANCY AD BANNER                                             */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'banner' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                    <span>Urgent Vacancy Image Ad Banner</span>
                                </h3>
                                <p className="text-slate-500 text-xs mt-1">
                                    Display a prominent poster or advertisement banner at the top of the Home and Careers pages.
                                </p>
                            </div>

                            {banner.imageUrl && (
                                <button
                                    onClick={handleDeleteBanner}
                                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Remove Banner</span>
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSaveBanner} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Banner Title */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Banner Headline
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Urgent Walk-in Interview: CNC & Welders"
                                        value={banner.title}
                                        onChange={(e) => setBanner({ ...banner, title: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                                    />
                                </div>

                                {/* Banner Description */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Subcaption / Short Note
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Walk-in this Saturday 9 AM onwards at factory gate."
                                        value={banner.description}
                                        onChange={(e) => setBanner({ ...banner, description: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                                    />
                                </div>

                                {/* Image URL / Upload */}
                                <div className="sm:col-span-2 space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Banner Image * (Upload or paste Image URL)
                                    </label>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <input
                                            type="text"
                                            required
                                            placeholder="Paste image URL (Cloudinary, web, or Drive direct URL)..."
                                            value={banner.imageUrl}
                                            onChange={(e) => setBanner({ ...banner, imageUrl: e.target.value })}
                                            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                                        />
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload(e, 'banner')}
                                                className="text-xs file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                                            />
                                            {uploadingBanner && (
                                                <span className="text-xs text-blue-600 animate-pulse font-bold">Uploading...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Google Drive Link */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Google Drive Link (High-Res Poster / PDF Circular)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://drive.google.com/file/d/..."
                                        value={banner.driveUrl}
                                        onChange={(e) => setBanner({ ...banner, driveUrl: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                </div>

                                {/* Action Link */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Action Link
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="#/careers"
                                        value={banner.actionLink}
                                        onChange={(e) => setBanner({ ...banner, actionLink: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                                    />
                                </div>

                                {/* Toggle Switches */}
                                <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={banner.isActive}
                                            onChange={(e) => setBanner({ ...banner, isActive: e.target.checked })}
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            Enable Banner on Public Pages
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={banner.isUrgent}
                                            onChange={(e) => setBanner({ ...banner, isUrgent: e.target.checked })}
                                            className="w-5 h-5 rounded-lg text-rose-600 focus:ring-rose-500"
                                        />
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                            <Flame className="w-4 h-4" />
                                            <span>Urgent Badge</span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                                >
                                    Save & Publish Banner
                                </button>
                            </div>
                        </form>

                        {/* Live Banner Preview */}
                        {banner.imageUrl && (
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                                    Live Banner Preview:
                                </h4>
                                <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl max-w-3xl bg-slate-900 relative">
                                    <img 
                                        src={getDirectImageUrl(banner.imageUrl)} 
                                        alt="Preview" 
                                        className="w-full h-48 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black w-max uppercase mb-1">
                                            Urgent Vacancy
                                        </span>
                                        <h5 className="text-white font-bold text-base">{banner.title}</h5>
                                        <p className="text-slate-300 text-xs">{banner.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: SCROLLING ANNOUNCEMENTS                                       */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'announcements' && (
                <div className="space-y-6">
                    {/* New Announcement Form */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-indigo-500" />
                                <span>Add New Scrolling Announcement</span>
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">
                                Broadcast vital alerts across the top of the website (e.g. "Website under maintenance tonight from 11 PM to 2 AM" or "Walk-in interviews this Saturday").
                            </p>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Announcement Text *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Website under maintenance tonight from 11 PM to 2 AM for system upgrades."
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Notification Type / Color Theme
                                    </label>
                                    <select
                                        value={announcementType}
                                        onChange={(e) => setAnnouncementType(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                                    >
                                        <option value="info">Info Notice (Blue)</option>
                                        <option value="warning">General Warning (Amber)</option>
                                        <option value="maintenance">Maintenance Alert (Purple)</option>
                                        <option value="urgent">Urgent Announcement (Red)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Action Link (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. #/careers, or https://..."
                                        value={announcementLink}
                                        onChange={(e) => setAnnouncementLink(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                                >
                                    Publish Announcement
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Announcements List */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                            Current Active & Archived Announcements
                        </h4>

                        {announcements.length === 0 ? (
                            <p className="text-slate-400 text-xs py-4">No announcements published.</p>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {announcements.map((ann) => (
                                    <div key={ann._id} className="py-3.5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                                                ann.type === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' :
                                                ann.type === 'maintenance' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' :
                                                ann.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                                            }`}>
                                                {ann.type}
                                            </span>
                                            <p className={`text-sm truncate ${ann.isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400 line-through'}`}>
                                                {ann.text}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleToggleAnnouncement(ann)}
                                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                                                    ann.isActive 
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' 
                                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                                }`}
                                            >
                                                {ann.isActive ? 'Active' : 'Disabled'}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteAnnouncement(ann._id)}
                                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                title="Delete Announcement"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCareers;
