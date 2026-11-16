import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
  History, Calendar, Search, Filter, Trash2, CheckCircle2, 
  XCircle, Clock, Loader2, Download, Check, X,
  ChevronLeft, ChevronRight, User, PieChart, RefreshCw,
  MapPin, Eye, ShieldCheck, AlertCircle, ShieldAlert,
  Send, ExternalLink, FileSpreadsheet, FileText, CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReportHeader from '../../components/ReportHeader';
import { generateGeneralReportPDF } from '../../services/pdfService';

const formatDateLocal = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
};

const AttendanceLogs = () => {
    // Active Tab: 'hub' (Daily Attendance Matrix) | 'logs' (Biometric & Location Logs) | 'exceptions' (Correction Requests)
    const [activeTab, setActiveTab] = useState('logs');
    
    // Core Data
    const [staffList, setStaffList] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [biometricLogs, setBiometricLogs] = useState([]);
    const [exceptions, setExceptions] = useState([]);

    const [loadingHub, setLoadingHub] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [loadingExceptions, setLoadingExceptions] = useState(false);
    
    // Config filters
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`; // YYYY-MM
    });
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly', 'weekly', 'daily'
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStaffId, setFilterStaffId] = useState('');
    const [filterAction, setFilterAction] = useState(''); // 'Check in', 'Check out'
    const [filterResult, setFilterResult] = useState(''); // 'success', 'mismatch', 'fail', 'manual_override'
    const [filterDept, setFilterDept] = useState('');

    // Attendance Matrix edit cell state
    const [editingCell, setEditingCell] = useState(null);
    const [localStatus, setLocalStatus] = useState('');
    const [localCheckIn, setLocalCheckIn] = useState('');
    const [localCheckOut, setLocalCheckOut] = useState('');
    const [localBreakTime, setLocalBreakTime] = useState(0);

    // Face Image Audit Modal State
    const [selectedImageRecord, setSelectedImageRecord] = useState(null);
    const [loadingImageAudit, setLoadingImageAudit] = useState(false);
    const [deletingImage, setDeletingImage] = useState(false);

    // Map Preview Modal State
    const [selectedMapLocation, setSelectedMapLocation] = useState(null);

    // Correction Review State
    const [reviewingCorrection, setReviewingCorrection] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    useEffect(() => {
        if (editingCell) {
            setLocalStatus(editingCell.currentStatus || 'Present');
            setLocalCheckIn(editingCell.checkIn || '09:00');
            setLocalCheckOut(editingCell.checkOut || (editingCell.currentStatus === 'Half Day' ? '13:00' : '17:00'));
            setLocalBreakTime(editingCell.breakTime || 0);
        }
    }, [editingCell]);

    // Fetch staff roster
    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaffList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch staff roster", error);
        }
    };

    // Fetch daily attendance matrix records for month
    const fetchAttendanceHub = useCallback(async () => {
        setLoadingHub(true);
        try {
            const res = await api.get(`/daily-attendance?month=${selectedMonth}`);
            setAttendanceRecords(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch daily attendance", error);
        } finally {
            setLoadingHub(false);
        }
    }, [selectedMonth]);

    // Fetch biometric & location attendance logs with full filter parameters
    const fetchBiometricLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const params = new URLSearchParams();
            if (selectedMonth) params.append('month', selectedMonth);
            if (filterStaffId) params.append('staff_id', filterStaffId);
            if (filterAction) params.append('action', filterAction);
            if (filterResult) params.append('verification_result', filterResult);
            if (searchQuery) params.append('search', searchQuery);

            const res = await api.get(`/attendance?${params.toString()}`);
            setBiometricLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch biometric logs", error);
        } finally {
            setLoadingLogs(false);
        }
    }, [selectedMonth, filterStaffId, filterAction, filterResult, searchQuery]);

    // Fetch exceptions and correction requests
    const fetchExceptions = useCallback(async () => {
        setLoadingExceptions(true);
        try {
            const res = await api.get('/attendance/exceptions');
            setExceptions(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch exceptions", error);
        } finally {
            setLoadingExceptions(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        if (activeTab === 'hub') {
            fetchAttendanceHub();
        } else if (activeTab === 'logs') {
            fetchBiometricLogs();
        } else if (activeTab === 'exceptions') {
            fetchExceptions();
        }
    }, [activeTab, fetchAttendanceHub, fetchBiometricLogs, fetchExceptions]);

    // View Face Image and log access in audit trail
    const handleViewFaceImage = async (logId) => {
        setLoadingImageAudit(true);
        try {
            const res = await api.get(`/attendance/${logId}/image`);
            if (res.data.success) {
                setSelectedImageRecord({
                    logId,
                    ...res.data
                });
            }
        } catch (error) {
            console.error("Failed to view face image:", error);
            alert(error.response?.data?.message || "Failed to load face image audit.");
        } finally {
            setLoadingImageAudit(false);
        }
    };

    // Delete face image under organizational retention policy
    const handleDeleteFaceImage = async () => {
        if (!selectedImageRecord?.logId) return;

        const confirmed = window.confirm(
            "Are you sure you want to permanently delete this captured face image under the organization's privacy and data retention policy?\n\nThe attendance record, timestamp, and location details will remain intact."
        );
        if (!confirmed) return;

        setDeletingImage(true);
        try {
            const res = await api.delete(`/attendance/${selectedImageRecord.logId}/image`);
            if (res.data.success) {
                alert("Face image permanently deleted under retention policy. Attendance record preserved.");
                setSelectedImageRecord(prev => ({
                    ...prev,
                    face_image: null,
                    face_image_deleted: true,
                    face_image_deleted_by_name: 'You (Administrator)',
                    face_image_deleted_at: new Date().toISOString()
                }));
                fetchBiometricLogs();
            }
        } catch (error) {
            console.error("Failed to delete face image:", error);
            alert(error.response?.data?.message || "Failed to delete face image.");
        } finally {
            setDeletingImage(false);
        }
    };

    // Review attendance correction (Approve / Reject)
    const handleReviewCorrectionSubmit = async (decision) => {
        if (!reviewingCorrection) return;
        setReviewSubmitting(true);
        try {
            await api.put(`/attendance/${reviewingCorrection._id}/review-correction`, {
                decision,
                review_notes: reviewNotes
            });
            alert(`Correction request ${decision} successfully.`);
            setReviewingCorrection(null);
            setReviewNotes('');
            fetchExceptions();
            fetchBiometricLogs();
        } catch (error) {
            console.error("Failed to review correction:", error);
            alert(error.response?.data?.message || "Failed to submit decision.");
        } finally {
            setReviewSubmitting(false);
        }
    };

    // Update Attendance in Matrix Hub
    const handleUpdateAttendance = async (staffId, date, status, checkIn, checkOut, breakTime) => {
        try {
            await api.post('/daily-attendance', { staffId, date, status, checkIn, checkOut, breakTime });
            fetchAttendanceHub();
            setEditingCell(null);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Failed to update attendance.");
        }
    };

    // Calculate days of the selected month
    const daysInMonth = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const days = [];
        while (date.getMonth() === month - 1) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [selectedMonth]);

    // Active days shown depending on viewMode
    const activeDays = useMemo(() => {
        if (viewMode === 'monthly') return daysInMonth;
        if (viewMode === 'daily') return [new Date(selectedDate)];
        return daysInMonth;
    }, [viewMode, daysInMonth, selectedDate]);

    // Filtered staff roster
    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  s.staff_id?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = filterDept ? s.department === filterDept : true;
            return matchesSearch && matchesDept;
        });
    }, [staffList, searchQuery, filterDept]);

    const departments = useMemo(() => {
        return [...new Set(staffList.map(s => s.department || 'General'))];
    }, [staffList]);

    // Compute calendar grid state for Hub
    const calendarGrid = useMemo(() => {
        const grid = {};
        attendanceRecords.forEach(rec => {
            const staffId = rec.staffId?._id || rec.staffId;
            const dateStr = rec.date;
            if (staffId && dateStr) {
                if (!grid[staffId]) grid[staffId] = {};
                grid[staffId][dateStr] = rec;
            }
        });
        return grid;
    }, [attendanceRecords]);

    // Export Filtered Records to CSV
    const exportToCSV = () => {
        if (!biometricLogs.length) {
            alert("No records to export.");
            return;
        }

        const headers = [
            "Staff ID", "Staff Name", "Action", "Date", "Timestamp", 
            "Status", "Confidence (%)", "Verification Result", 
            "Address", "Latitude", "Longitude", "Face Image Status", "Correction Status"
        ];

        const rows = biometricLogs.map(log => [
            `"${log.staff_id?.staff_id || ''}"`,
            `"${log.staff_id?.name || log.full_name || ''}"`,
            `"${log.action || log.type || 'Check in'}"`,
            `"${log.date || ''}"`,
            `"${log.login_time ? new Date(log.login_time).toLocaleString() : ''}"`,
            `"${log.status || ''}"`,
            `"${log.face_match_confidence || 0}"`,
            `"${log.verification_result || log.verification_reason || ''}"`,
            `"${(log.location?.address || '').replace(/"/g, '""')}"`,
            `"${log.location?.latitude || ''}"`,
            `"${log.location?.longitude || ''}"`,
            `"${log.face_image_deleted ? 'Purged (Retention Policy)' : log.face_image ? 'Retained' : 'None'}"`,
            `"${log.correction_status || 'none'}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `staff_attendance_audit_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Pending exceptions count
    const pendingExceptionsCount = useMemo(() => {
        return exceptions.filter(e => e.correction_status === 'pending').length;
    }, [exceptions]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4" /> Secure Staff Attendance & Biometrics
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                        Attendance Registry & Verification Hub
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Audit staff clock-ins, inspect captured face images with access logging, review GPS stamps, and manage exception corrections.
                    </p>
                </div>

                {/* Export Options */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={exportToCSV}
                        className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'logs') fetchBiometricLogs();
                            else if (activeTab === 'exceptions') fetchExceptions();
                            else fetchAttendanceHub();
                        }}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 p-2.5 rounded-2xl transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs (Fully Responsive - Never overflows mobile screen) */}
            <div className="w-full border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full">
                    <button
                        type="button"
                        onClick={() => setActiveTab('logs')}
                        className={`min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition flex items-center justify-center gap-1 sm:gap-2 text-center ${
                            activeTab === 'logs'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                        title="Biometric & Location Logs"
                    >
                        <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Biometric & Location Logs</span>
                        <span className="sm:hidden truncate">Logs</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('exceptions')}
                        className={`min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition flex items-center justify-center gap-1 sm:gap-2 text-center relative ${
                            activeTab === 'exceptions'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                        title="Exceptions & Corrections"
                    >
                        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
                        <span className="hidden sm:inline">Exceptions & Corrections</span>
                        <span className="sm:hidden truncate">Exceptions</span>
                        {pendingExceptionsCount > 0 && (
                            <span className="bg-rose-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 sm:py-0.5 rounded-full ml-0.5">
                                {pendingExceptionsCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('hub')}
                        className={`min-w-0 px-2 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition flex items-center justify-center gap-1 sm:gap-2 text-center ${
                            activeTab === 'hub'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                        title="Monthly Roster Matrix"
                    >
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Monthly Roster Matrix</span>
                        <span className="sm:hidden truncate">Roster</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Biometric & Location Logs */}
            {activeTab === 'logs' && (
                <div className="space-y-6">
                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Search Staff</label>
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Name or ID..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Staff Member</label>
                            <select
                                value={filterStaffId}
                                onChange={(e) => setFilterStaffId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">All Staff Members</option>
                                {staffList.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.staff_id || 'ID'})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                            </input>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Action</label>
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">All Actions</option>
                                <option value="Check in">Check in</option>
                                <option value="Check out">Check out</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Verification</label>
                            <select
                                value={filterResult}
                                onChange={(e) => setFilterResult(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">All Results</option>
                                <option value="success">Biometric Match</option>
                                <option value="mismatch">Face Mismatch</option>
                                <option value="manual_override">Manual Override</option>
                                <option value="fail">Failed Attempt</option>
                            </select>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4">Action & Time</th>
                                        <th className="px-6 py-4">Verification Status</th>
                                        <th className="px-6 py-4">Location Details</th>
                                        <th className="px-6 py-4">Face Snapshot</th>
                                        <th className="px-6 py-4 text-right">Audit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loadingLogs ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                                Loading attendance logs...
                                            </td>
                                        </tr>
                                    ) : biometricLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                                                No attendance logs match the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        biometricLogs.map((log) => {
                                            const staff = log.staff_id || {};
                                            const isSuccess = log.status === 'success';
                                            const isCheckOut = log.action === 'Check out' || log.type === 'OUT';

                                            return (
                                                <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                    {/* Staff Member */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                                                                {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white">
                                                                    {staff.name || log.full_name || 'Staff Member'}
                                                                </h4>
                                                                <p className="text-[11px] text-slate-400">
                                                                    ID: {staff.staff_id || 'N/A'} • {staff.department || 'Operations'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Action & Time */}
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                isCheckOut 
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            }`}>
                                                                <Clock className="w-3 h-3" /> {log.action || log.type || 'Check in'}
                                                            </span>
                                                            <div className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                                                                {log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {log.date || ''}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Verification Status */}
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                isSuccess 
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' 
                                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                                            }`}>
                                                                {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                                                                {isSuccess ? 'Verified' : 'Verification Failed'}
                                                            </span>
                                                            {log.face_match_confidence > 0 && (
                                                                <p className="text-[11px] font-bold text-slate-500">
                                                                    Confidence: {log.face_match_confidence}%
                                                                </p>
                                                            )}
                                                            {log.verification_reason && (
                                                                <p className="text-[10px] text-slate-400 max-w-xs truncate" title={log.verification_reason}>
                                                                    {log.verification_reason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Location Details */}
                                                    <td className="px-6 py-4">
                                                        {log.location?.latitude ? (
                                                            <div className="space-y-1 max-w-xs">
                                                                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                                                                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                    <span className="truncate" title={log.location.address || 'Coordinates Recorded'}>
                                                                        {log.location.address || `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedMapLocation(log.location)}
                                                                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" /> View Map Coordinates
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">No location captured</span>
                                                        )}
                                                    </td>

                                                    {/* Face Snapshot & Retention Status */}
                                                    <td className="px-6 py-4">
                                                        {log.face_image_deleted ? (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                                                                    <ShieldAlert className="w-3 h-3 text-amber-500" /> Purged (Retention Policy)
                                                                </span>
                                                                {log.face_image_deleted_by_name && (
                                                                    <p className="text-[9px] text-slate-400">
                                                                        By {log.face_image_deleted_by_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : log.face_image ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewFaceImage(log._id)}
                                                                className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> View Face Image
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-xs">No image</span>
                                                        )}
                                                    </td>

                                                    {/* Audit Button */}
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewFaceImage(log._id)}
                                                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 underline cursor-pointer"
                                                        >
                                                            Audit Trail ({log.audit_trail?.length || 1})
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Exceptions & Correction Requests */}
            {activeTab === 'exceptions' && (
                <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-5 rounded-3xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                Staff Attendance Exceptions & Manual Correction Requests
                            </h3>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                                Under organizational employment rules and privacy standards, employees experiencing camera hardware failure, GPS timeouts, or mobile glitches can request human verification. Review and approve exceptions below.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4">Requested Action</th>
                                        <th className="px-6 py-4">Reason & Location Notes</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loadingExceptions ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                                Loading exceptions...
                                            </td>
                                        </tr>
                                    ) : exceptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-slate-400 font-bold">
                                                No attendance exceptions or pending correction requests found.
                                            </td>
                                        </tr>
                                    ) : (
                                        exceptions.map((exc) => {
                                            const details = exc.correction_details || {};
                                            const isPending = exc.correction_status === 'pending';

                                            return (
                                                <tr key={exc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {exc.staff_id?.name || exc.full_name || 'Staff Member'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            ID: {exc.staff_id?.staff_id || 'N/A'} • {exc.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                            {details.requested_action || exc.action || 'Check in'}
                                                        </span>
                                                        <div className="text-[10px] text-slate-400">
                                                            Requested for: {details.requested_time ? new Date(details.requested_time).toLocaleTimeString() : 'Current Time'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-sm">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                                            {details.reason || exc.verification_reason}
                                                        </p>
                                                        {exc.location?.address && (
                                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                                📍 {exc.location.address}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                            exc.correction_status === 'approved' 
                                                                ? 'bg-emerald-100 text-emerald-800' 
                                                                : exc.correction_status === 'rejected'
                                                                ? 'bg-rose-100 text-rose-800'
                                                                : 'bg-amber-100 text-amber-800 animate-pulse'
                                                        }`}>
                                                            {exc.correction_status || 'Exception'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isPending ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviewingCorrection(exc);
                                                                    setReviewNotes('');
                                                                }}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow"
                                                            >
                                                                Review Request
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                Reviewed by {details.reviewed_by_name || 'Admin'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Monthly Roster Matrix (Preserved from existing view) */}
            {activeTab === 'hub' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('monthly')}
                                    className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'monthly' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600' : 'text-slate-500'}`}
                                >
                                    Month View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('daily')}
                                    className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'daily' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600' : 'text-slate-500'}`}
                                >
                                    Day View
                                </button>
                            </div>
                        </div>

                        {viewMode === 'daily' && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        )}
                    </div>

                    {/* Matrix Grid */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500">
                                    <th className="px-6 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800/90 z-10">Staff</th>
                                    {activeDays.map((d) => (
                                        <th key={d.toISOString()} className="px-3 py-4 text-center min-w-[50px]">
                                            <div>{d.getDate()}</div>
                                            <div className="text-[8px] text-slate-400 uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loadingHub ? (
                                    <tr>
                                        <td colSpan={activeDays.length + 1} className="text-center py-12 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                            Loading monthly roster matrix...
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((staff) => (
                                        <tr key={staff._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-900 z-10 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                {staff.name}
                                                <div className="text-[10px] text-slate-400 font-normal">{staff.staff_id}</div>
                                            </td>
                                            {activeDays.map((day) => {
                                                const dateStr = formatDateLocal(day);
                                                const record = calendarGrid[staff._id]?.[dateStr];
                                                const status = record?.status || '-';

                                                return (
                                                    <td key={dateStr} className="px-2 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingCell({
                                                                staffId: staff._id,
                                                                date: dateStr,
                                                                currentStatus: record?.status,
                                                                checkIn: record?.checkIn,
                                                                checkOut: record?.checkOut,
                                                                breakTime: record?.breakTime
                                                            })}
                                                            className={`w-7 h-7 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                                                status === 'Present' 
                                                                    ? 'bg-emerald-500 text-white' 
                                                                    : status === 'Half Day' 
                                                                    ? 'bg-amber-400 text-slate-950'
                                                                    : status === 'Absent'
                                                                    ? 'bg-rose-500 text-white'
                                                                    : status === 'Leave'
                                                                    ? 'bg-indigo-500 text-white'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                            }`}
                                                            title={`${dateStr}: ${status} (Click to edit)`}
                                                        >
                                                            {status === 'Present' ? 'P' : status === 'Half Day' ? 'HD' : status === 'Absent' ? 'A' : status === 'Leave' ? 'L' : '-'}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL 1: Face Image Audit & Deletion Modal */}
            <AnimatePresence>
                {selectedImageRecord && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
                                        <Eye className="w-3.5 h-3.5" /> Administrator Face Image Audit
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                        Captured Attendance Snapshot
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Staff: {selectedImageRecord.staff?.name} ({selectedImageRecord.staff?.staff_id}) • {new Date(selectedImageRecord.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedImageRecord(null)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Image Display Area */}
                            <div className="space-y-4">
                                {selectedImageRecord.face_image_deleted ? (
                                    <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
                                        <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Face Image Deleted Under Retention Policy
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                            This face image was permanently purged by {selectedImageRecord.face_image_deleted_by_name || 'an administrator'} on {new Date(selectedImageRecord.face_image_deleted_at).toLocaleString()} in compliance with privacy retention guidelines.
                                        </p>
                                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                            ✓ The attendance timestamp, verification result, and location records remain securely preserved.
                                        </p>
                                    </div>
                                ) : selectedImageRecord.face_image ? (
                                    <div className="space-y-3">
                                        <div className="aspect-4/3 max-w-md mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-indigo-500/20 shadow-md">
                                            <img
                                                src={selectedImageRecord.face_image}
                                                alt="Captured Attendance Face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Admin Image Deletion Trigger */}
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h5 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                                                    Retention & Privacy Policy
                                                </h5>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Only authorized administrators may delete captured images.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleDeleteFaceImage}
                                                disabled={deletingImage}
                                                className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {deletingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                Delete Face Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        No image snapshot was captured for this record.
                                    </div>
                                )}
                            </div>

                            {/* Immutable Audit Trail List */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Record Audit Trail & Access Logs
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {selectedImageRecord.audit_trail?.map((audit, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between items-start gap-3">
                                            <div>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                                                    {audit.action}
                                                </span>
                                                <p className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {audit.details || 'Action performed'}
                                                </p>
                                                <span className="text-[10px] text-slate-400">
                                                    By: {audit.performed_by_name || 'System'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                {new Date(audit.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: Interactive Location Map Preview */}
            <AnimatePresence>
                {selectedMapLocation && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase">
                                    <MapPin className="w-4 h-4" /> Recorded Work Yard Location
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMapLocation(null)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {selectedMapLocation.address || 'GPS Coordinates Logged'}
                            </p>

                            <div className="text-[11px] text-slate-500 font-mono">
                                Coordinates: {selectedMapLocation.latitude?.toFixed(6)}, {selectedMapLocation.longitude?.toFixed(6)} (Accuracy: ±{Math.round(selectedMapLocation.accuracy || 0)}m)
                            </div>

                            {/* Embedded OpenStreetMap Iframe */}
                            <div className="aspect-16/9 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                <iframe
                                    title="Attendance Map View"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMapLocation.longitude - 0.005}%2C${selectedMapLocation.latitude - 0.003}%2C${selectedMapLocation.longitude + 0.005}%2C${selectedMapLocation.latitude + 0.003}&layer=mapnik&marker=${selectedMapLocation.latitude}%2C${selectedMapLocation.longitude}`}
                                />
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <a
                                    href={`https://www.google.com/maps?q=${selectedMapLocation.latitude},${selectedMapLocation.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMapLocation(null)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 3: Correction Review Dialog */}
            <AnimatePresence>
                {reviewingCorrection && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
                        >
                            <div className="space-y-1">
                                <div className="text-xs font-black uppercase text-indigo-600">
                                    Attendance Correction Review
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    {reviewingCorrection.staff_id?.name || reviewingCorrection.full_name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Date: {reviewingCorrection.date} • Requested Action: {reviewingCorrection.correction_details?.requested_action || reviewingCorrection.action}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Stated Reason</span>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        {reviewingCorrection.correction_details?.reason || reviewingCorrection.verification_reason}
                                    </p>
                                </div>
                                {reviewingCorrection.location?.address && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 block">Location Notes</span>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {reviewingCorrection.location.address}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                                    Admin Review Notes / Findings
                                </label>
                                <textarea
                                    rows={3}
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="e.g. Verified with work yard foreman; approved manual check-in..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewingCorrection(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={reviewSubmitting}
                                    onClick={() => handleReviewCorrectionSubmit('rejected')}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition"
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    disabled={reviewSubmitting}
                                    onClick={() => handleReviewCorrectionSubmit('approved')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow transition"
                                >
                                    Approve Exception
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Attendance Status Editor Modal (Matrix) */}
            <AnimatePresence>
                {editingCell && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl p-8 max-w-md w-full space-y-6"
                        >
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h4 className="font-black text-slate-950 dark:text-white text-lg uppercase tracking-tight">Set Attendance</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{editingCell.date}</p>
                                </div>
                                <button 
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 hover:bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-900 dark:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Status</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Present', val: 'Present' },
                                            { label: 'Absent', val: 'Absent' },
                                            { label: 'Half Day', val: 'Half Day' },
                                            { label: 'Leave', val: 'Leave' },
                                            { label: 'Holiday', val: 'Holiday' }
                                        ].map((item) => (
                                            <button
                                                type="button"
                                                key={item.val}
                                                onClick={() => {
                                                    setLocalStatus(item.val);
                                                    if (item.val === 'Half Day') {
                                                        setLocalCheckOut('13:00');
                                                    } else if (item.val === 'Present') {
                                                        setLocalCheckOut('17:00');
                                                    }
                                                }}
                                                className={`py-2 px-3 text-xs font-black uppercase tracking-wider border rounded-xl transition text-center ${localStatus === item.val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(localStatus === 'Present' || localStatus === 'Half Day') && (
                                    <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Check In</label>
                                                <input 
                                                    type="time" 
                                                    value={localCheckIn}
                                                    onChange={(e) => setLocalCheckIn(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Check Out</label>
                                                <input 
                                                    type="time" 
                                                    value={localCheckOut}
                                                    onChange={(e) => setLocalCheckOut(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Break Time (mins)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={localBreakTime}
                                                onChange={(e) => setLocalBreakTime(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleUpdateAttendance(
                                    editingCell.staffId, 
                                    editingCell.date, 
                                    localStatus, 
                                    localCheckIn, 
                                    localCheckOut, 
                                    localBreakTime
                                )}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                            >
                                Save Attendance Override
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AttendanceLogs;
