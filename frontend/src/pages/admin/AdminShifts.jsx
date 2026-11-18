import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { generateGeneralReportPDF } from '../../services/pdfService';
import {
    Clock, Plus, Edit, Trash2, CheckCircle2, AlertTriangle, AlertCircle,
    UserCheck, Moon, Sun, Shield, RefreshCw, Calendar, Search, Filter,
    Check, X, Eye, FileText, ArrowRight, UserX, CheckSquare, Sparkles,
    ChevronDown, ChevronUp, Info, HelpCircle, Download, Bell, Sliders,
    Award, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminShifts({ isEmbedded = false }) {
    const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'shifts' | 'late-arrival'
    const [shifts, setShifts] = useState([]);
    const [rosterData, setRosterData] = useState({ summary: {}, roster: [] });
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Late Arrival Management States
    const [lateSettings, setLateSettings] = useState({
        shiftId: '',
        shiftName: 'Morning Shift',
        shiftCode: 'MORNING',
        startTime: '09:00',
        gracePeriodMinutes: 10,
        lateDetectionEnabled: true,
        lateNotificationsEnabled: true,
        lateNotificationChannels: { inApp: true, email: false, whatsapp: false }
    });
    const [lateSettingsLoading, setLateSettingsLoading] = useState(false);
    const [lateSettingsSaving, setLateSettingsSaving] = useState(false);

    const [lateReportMonth, setLateReportMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [lateReportDate, setLateReportDate] = useState('');
    const [lateReportStaffId, setLateReportStaffId] = useState('ALL');
    const [lateReportData, setLateReportData] = useState({
        summary: { totalLateArrivals: 0, uniqueLateEmployees: 0, totalLateMinutes: 0, averageLateMinutes: 0, mostFrequentLate: [] },
        records: []
    });
    const [lateReportLoading, setLateReportLoading] = useState(false);

    // Filters for Roster
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [shiftFilter, setShiftFilter] = useState('ALL');

    // Modals
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [selectedRosterItem, setSelectedRosterItem] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [shiftToAssign, setShiftToAssign] = useState(null);

    // Form States
    const [shiftForm, setShiftForm] = useState({
        name: '',
        code: '',
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        expectedHours: 7,
        gracePeriodMinutes: 10,
        earlyExitAllowanceMinutes: 15,
        shiftType: 'Regular',
        isOvernight: false,
        overtimeEnabled: true,
        minOvertimeMinutes: 30,
        overtimeMultiplier: 1.0,
        weeklyOffDays: ['Sunday'],
        applicableDepartments: '',
        isDefault: false,
        autoShiftClosure: true,
        closureBufferHours: 4
    });

    const [correctionForm, setCorrectionForm] = useState({
        staffId: '',
        staffName: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        breakTime: 60,
        shiftId: '',
        reason: ''
    });

    const [selectedStaffIds, setSelectedStaffIds] = useState([]);

    // Fetch Initial Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [shiftsRes, rosterRes, staffRes] = await Promise.all([
                api.get('/shifts'),
                api.get('/shifts/roster/today'),
                api.get('/staff').catch(() => ({ data: [] }))
            ]);

            setShifts(shiftsRes.data.shifts || []);
            setRosterData(rosterRes.data || { summary: {}, roster: [] });
            setStaffList(staffRes.data || []);
        } catch (err) {
            console.error('Failed to load shift management data:', err);
            setError(err.response?.data?.message || err.message || 'Failed to connect to shift controller.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const showNotice = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
    };

    // Fetch Morning Shift Late Arrival Settings
    const fetchLateArrivalSettings = useCallback(async () => {
        setLateSettingsLoading(true);
        try {
            const res = await api.get('/shifts/settings/late-arrival');
            if (res.data?.success && res.data?.settings) {
                setLateSettings(res.data.settings);
            }
        } catch (err) {
            console.error('Failed to load late arrival settings:', err);
        } finally {
            setLateSettingsLoading(false);
        }
    }, []);

    // Fetch Late Arrival Reports & Dashboard Summary
    const fetchLateArrivalReports = useCallback(async () => {
        setLateReportLoading(true);
        try {
            const params = new URLSearchParams();
            if (lateReportMonth) params.append('month', lateReportMonth);
            if (lateReportDate) params.append('date', lateReportDate);
            if (lateReportStaffId && lateReportStaffId !== 'ALL') params.append('staffId', lateReportStaffId);

            const res = await api.get(`/shifts/reports/late-arrivals?${params.toString()}`);
            if (res.data?.success) {
                setLateReportData({
                    summary: res.data.summary || { totalLateArrivals: 0, uniqueLateEmployees: 0, totalLateMinutes: 0, averageLateMinutes: 0, mostFrequentLate: [] },
                    records: res.data.records || []
                });
            }
        } catch (err) {
            console.error('Failed to load late arrival reports:', err);
        } finally {
            setLateReportLoading(false);
        }
    }, [lateReportMonth, lateReportDate, lateReportStaffId]);

    // Save Morning Shift Late Arrival Settings
    const handleSaveLateSettings = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLateSettingsSaving(true);
        setError(null);
        try {
            const payload = {
                startTime: lateSettings.startTime,
                gracePeriodMinutes: Number(lateSettings.gracePeriodMinutes),
                lateDetectionEnabled: !!lateSettings.lateDetectionEnabled,
                lateNotificationsEnabled: !!lateSettings.lateNotificationsEnabled,
                lateNotificationChannels: lateSettings.lateNotificationChannels || { inApp: true, email: false, whatsapp: false }
            };

            const res = await api.put('/shifts/settings/late-arrival', payload);
            if (res.data?.success) {
                showNotice('Morning Shift Late Arrival settings saved & updated successfully.');
                await fetchLateArrivalSettings();
                await fetchLateArrivalReports();
                await fetchData();
            }
        } catch (err) {
            console.error('Failed to save late arrival settings:', err);
            setError(err.response?.data?.message || 'Failed to update late arrival settings.');
        } finally {
            setLateSettingsSaving(false);
        }
    };

    // Export CSV Report
    const handleExportLateCSV = () => {
        const records = lateReportData.records || [];
        if (records.length === 0) {
            alert('No late arrival records available to export.');
            return;
        }
        const headers = ['Employee Name', 'Date', 'Shift Start', 'Actual IN', 'Late Minutes', 'Status'];
        const rows = records.map(r => [
            `"${(r.staffName || '').replace(/"/g, '""')}"`,
            `"${r.date || ''}"`,
            `"${r.shiftStart || ''}"`,
            `"${r.actualIn || ''}"`,
            r.lateMinutes || 0,
            `"${(r.status || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Monthly_Late_Arrival_Report_${lateReportMonth || 'current'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export PDF Report
    const handleExportLatePDF = async () => {
        const records = lateReportData.records || [];
        if (records.length === 0) {
            alert('No late arrival records available to export.');
            return;
        }
        const columns = ['Employee Name', 'Date', 'Shift Start', 'Actual IN', 'Late Minutes', 'Status'];
        const rows = records.map(r => [
            r.staffName || 'Unknown',
            r.date || '--',
            r.shiftStart || '--',
            r.actualIn || '--',
            `${r.lateMinutes || 0} min`,
            r.status || 'Late'
        ]);
        const title = `Monthly Late Arrival Report - ${lateReportMonth}`;
        await generateGeneralReportPDF(rows, title, columns);
    };

    // Fetch late data when tab changes to late-arrival
    useEffect(() => {
        if (activeTab === 'late-arrival') {
            fetchLateArrivalSettings();
            fetchLateArrivalReports();
        }
    }, [activeTab, fetchLateArrivalSettings, fetchLateArrivalReports]);

    // Open Shift Modal (Create or Edit)
    const handleOpenShiftModal = (shift = null) => {
        if (shift) {
            setEditingShift(shift);
            setShiftForm({
                name: shift.name || '',
                code: shift.code || '',
                startTime: shift.startTime || '09:00',
                endTime: shift.endTime || '17:00',
                breakDuration: shift.breakDuration !== undefined ? shift.breakDuration : 60,
                expectedHours: shift.expectedHours !== undefined ? shift.expectedHours : 7,
                gracePeriodMinutes: shift.gracePeriodMinutes !== undefined ? shift.gracePeriodMinutes : 10,
                earlyExitAllowanceMinutes: shift.earlyExitAllowanceMinutes !== undefined ? shift.earlyExitAllowanceMinutes : 15,
                shiftType: shift.shiftType || 'Regular',
                isOvernight: !!shift.isOvernight,
                overtimeEnabled: shift.overtimeEnabled !== undefined ? shift.overtimeEnabled : true,
                minOvertimeMinutes: shift.minOvertimeMinutes || 30,
                overtimeMultiplier: shift.overtimeMultiplier || 1.0,
                weeklyOffDays: Array.isArray(shift.weeklyOffDays) ? shift.weeklyOffDays : ['Sunday'],
                applicableDepartments: Array.isArray(shift.applicableDepartments) ? shift.applicableDepartments.join(', ') : '',
                isDefault: !!shift.isDefault,
                autoShiftClosure: shift.autoShiftClosure !== undefined ? shift.autoShiftClosure : true,
                closureBufferHours: shift.closureBufferHours || 4
            });
        } else {
            setEditingShift(null);
            setShiftForm({
                name: '',
                code: '',
                startTime: '09:00',
                endTime: '17:00',
                breakDuration: 60,
                expectedHours: 7,
                gracePeriodMinutes: 10,
                earlyExitAllowanceMinutes: 15,
                shiftType: 'Regular',
                isOvernight: false,
                overtimeEnabled: true,
                minOvertimeMinutes: 30,
                overtimeMultiplier: 1.0,
                weeklyOffDays: ['Sunday'],
                applicableDepartments: '',
                isDefault: false,
                autoShiftClosure: true,
                closureBufferHours: 4
            });
        }
        setIsShiftModalOpen(true);
    };

    // Save Shift (Create or Update)
    const handleSaveShift = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);

        try {
            const depts = shiftForm.applicableDepartments
                .split(',')
                .map(d => d.trim())
                .filter(Boolean);

            const payload = {
                ...shiftForm,
                code: shiftForm.code.toUpperCase().trim(),
                applicableDepartments: depts
            };

            if (editingShift) {
                await api.put(`/shifts/${editingShift._id}`, payload);
                showNotice(`Shift "${payload.name}" updated successfully.`);
            } else {
                await api.post('/shifts', payload);
                showNotice(`New Shift "${payload.name}" created successfully.`);
            }

            setIsShiftModalOpen(false);
            await fetchData();
        } catch (err) {
            console.error('Error saving shift:', err);
            setError(err.response?.data?.message || 'Failed to save shift configuration.');
        } finally {
            setActionLoading(false);
        }
    };

    // Toggle Shift Active Status
    const handleToggleShiftStatus = async (shift) => {
        setActionLoading(true);
        try {
            await api.patch(`/shifts/${shift._id}/toggle`);
            showNotice(`Shift status updated.`);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to toggle shift.');
        } finally {
            setActionLoading(false);
        }
    };

    // Delete Shift
    const handleDeleteShift = async (shift) => {
        if (!window.confirm(`Are you sure you want to delete shift "${shift.name}" (${shift.code})? This action cannot be undone.`)) {
            return;
        }
        setActionLoading(true);
        try {
            await api.delete(`/shifts/${shift._id}`);
            showNotice(`Shift "${shift.name}" deleted.`);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete shift.');
        } finally {
            setActionLoading(false);
        }
    };

    // Open Staff Assignment Modal
    const handleOpenAssignModal = (shift) => {
        setShiftToAssign(shift);
        // Pre-select staff already assigned to this shift
        const preSelected = staffList
            .filter(s => s.assignedShift === shift._id || s.assignedShift?._id === shift._id)
            .map(s => s._id);
        setSelectedStaffIds(preSelected);
        setIsAssignModalOpen(true);
    };

    const handleSaveStaffAssignment = async () => {
        if (!shiftToAssign) return;
        setActionLoading(true);
        try {
            await api.post(`/shifts/${shiftToAssign._id}/assign`, {
                staffIds: selectedStaffIds
            });
            showNotice(`Staff assignments updated for shift "${shiftToAssign.name}".`);
            setIsAssignModalOpen(false);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign staff.');
        } finally {
            setActionLoading(false);
        }
    };

    // Open Correction Modal
    const handleOpenCorrectionModal = (rosterItem) => {
        setSelectedRosterItem(rosterItem);
        setCorrectionForm({
            staffId: rosterItem.staffId,
            staffName: rosterItem.name,
            date: rosterItem.date || new Date().toISOString().split('T')[0],
            checkIn: rosterItem.checkIn && rosterItem.checkIn !== '--' ? rosterItem.checkIn : '09:00',
            checkOut: rosterItem.checkOut && rosterItem.checkOut !== '--' ? rosterItem.checkOut : '17:00',
            breakTime: rosterItem.shift?.breakDuration || 60,
            shiftId: rosterItem.shift?.id || '',
            reason: ''
        });
        setIsCorrectionModalOpen(true);
    };

    // Submit Manual Attendance Correction
    const handleSubmitCorrection = async (e) => {
        e.preventDefault();
        if (!correctionForm.reason.trim()) {
            alert('A mandatory reason is required for attendance audit trail compliance.');
            return;
        }

        setActionLoading(true);
        try {
            await api.post('/shifts/attendance/correct', correctionForm);
            showNotice(`Attendance corrected for ${correctionForm.staffName} on ${correctionForm.date}.`);
            setIsCorrectionModalOpen(false);
            await fetchData();
        } catch (err) {
            console.error('Correction failed:', err);
            setError(err.response?.data?.message || 'Failed to record manual attendance correction.');
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered Roster
    const filteredRoster = useMemo(() => {
        return (rosterData.roster || []).filter(item => {
            const matchesSearch = !searchTerm ||
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.shift?.name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'COMPLETED' && item.status === 'COMPLETED') ||
                (statusFilter === 'IN_PROGRESS' && item.status === 'IN PROGRESS') ||
                (statusFilter === 'MISSING_OUT' && item.status === 'MISSING OUT') ||
                (statusFilter === 'LATE' && item.isLate) ||
                (statusFilter === 'OVERTIME' && item.overtimeHours > 0) ||
                (statusFilter === 'ABSENT' && item.status === 'Absent');

            const matchesShift = shiftFilter === 'ALL' || item.shift?.id === shiftFilter || item.shift?.name === shiftFilter;

            return matchesSearch && matchesStatus && matchesShift;
        });
    }, [rosterData.roster, searchTerm, statusFilter, shiftFilter]);

    const summary = rosterData.summary || {
        totalStaff: 0,
        activeNow: 0,
        completedToday: 0,
        missingOut: 0,
        lateArrivals: 0,
        overtimeHours: 0
    };

    return (
        <div className={`space-y-6 ${isEmbedded ? '' : 'p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-100'}`}>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Admin Shift Time Control & Attendance Roster
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Enterprise shift management, overnight shift calculation, grace periods, and audit trail correction.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={fetchData}
                        disabled={loading || actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                        title="Reload latest records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => handleOpenShiftModal(null)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Shift</span>
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                    >
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>{successMessage}</span>
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400"
                    >
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
                <button
                    onClick={() => setActiveTab('roster')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                        activeTab === 'roster'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    <span>Today's Live Roster ({filteredRoster.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                        activeTab === 'shifts'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Shift Configurations ({shifts.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('late-arrival')}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                        activeTab === 'late-arrival'
                            ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Sliders className="w-4 h-4" />
                    <span>Late Arrival Settings & Reports</span>
                </button>
            </div>

            {/* TAB 1: TODAY'S LIVE ROSTER */}
            {activeTab === 'roster' && (
                <div className="space-y-6">
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Staff</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">{summary.totalStaff || 0}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">Active Now (In Progress)</span>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{summary.activeNow || 0}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">Completed Shifts</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summary.completedToday || 0}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">Missing OUT</span>
                            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{summary.missingOut || 0}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">Late Arrivals</span>
                            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{summary.lateArrivals || 0}</span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-1">Overtime Hours</span>
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{summary.overtimeHours || 0} hrs</span>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search staff name, department, or shift..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold focus:outline-none"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="IN_PROGRESS">Active (In Progress)</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="MISSING_OUT">Missing OUT</option>
                                <option value="LATE">Late Arrivals</option>
                                <option value="OVERTIME">Overtime Tracked</option>
                                <option value="ABSENT">Absent / Off</option>
                            </select>

                            <select
                                value={shiftFilter}
                                onChange={(e) => setShiftFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold focus:outline-none"
                            >
                                <option value="ALL">All Shifts</option>
                                {shifts.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Roster Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3">Shift Timing</th>
                                        <th className="px-4 py-3">Clock IN / OUT</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Duration</th>
                                        <th className="px-4 py-3 text-center">Flags</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                    {filteredRoster.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 font-medium">
                                                No employees match the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRoster.map((item) => {
                                            const isCompleted = item.status === 'COMPLETED';
                                            const isInProgress = item.status === 'IN PROGRESS';
                                            const isMissingOut = item.status === 'MISSING OUT';

                                            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300';
                                            if (isCompleted) {
                                                badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
                                            } else if (isInProgress) {
                                                badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
                                            } else if (isMissingOut) {
                                                badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
                                            } else if (item.status === 'Absent') {
                                                badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
                                            }

                                            return (
                                                <tr key={item.staffId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {item.department || 'General'}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                            {item.shift?.isOvernight ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                                                            <span>{item.shift?.startTime} - {item.shift?.endTime}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {item.shift?.name}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div className="space-y-0.5">
                                                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                IN: {item.checkIn || '--'}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-rose-500 dark:text-rose-400">
                                                                OUT: {item.checkOut || '--'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${badgeStyle}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        {item.durationFormatted || '--'}
                                                        {item.workedHours > 0 && (
                                                            <span className="block text-[10px] text-slate-400 font-normal">
                                                                {item.workedHours} hrs
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            {item.isLate && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                                                                    Late +{item.lateMinutes}m
                                                                </span>
                                                            )}
                                                            {item.isEarlyExit && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400">
                                                                    Early Exit
                                                                </span>
                                                            )}
                                                            {item.overtimeHours > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                                    +{item.overtimeHours}h OT
                                                                </span>
                                                            )}
                                                            {!item.isLate && !item.isEarlyExit && !item.overtimeHours && (
                                                                <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleOpenCorrectionModal(item)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                                                            title="Manually correct timestamps with audit compliance"
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                            <span>Correct</span>
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

            {/* TAB 2: SHIFT CONFIGURATIONS */}
            {activeTab === 'shifts' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shifts.map((shift) => (
                            <div
                                key={shift._id}
                                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-sm space-y-4 transition hover:shadow-md ${
                                    shift.isDefault
                                        ? 'border-blue-400 dark:border-blue-700/80'
                                        : 'border-slate-200/80 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-black text-slate-900 dark:text-white text-base">
                                                {shift.name}
                                            </h3>
                                            {shift.isDefault && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
                                                    Default
                                                </span>
                                            )}
                                            {shift.isOvernight && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center gap-1">
                                                    <Moon className="w-2.5 h-2.5" />
                                                    Overnight
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                            Code: {shift.code}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleToggleShiftStatus(shift)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition border ${
                                            shift.isActive
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        {shift.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Shift Timings & Specs */}
                                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700/60 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400">Timing</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                            {shift.startTime} – {shift.endTime}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400">Expected Working Hours</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {shift.expectedHours} hrs (Break: {shift.breakDuration}m)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400">Grace Period (Late)</span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400">
                                            +{shift.gracePeriodMinutes || 10} mins
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400">Early Exit Allowance</span>
                                        <span className="font-bold text-orange-600 dark:text-orange-400">
                                            -{shift.earlyExitAllowanceMinutes || 15} mins
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400">Weekly Off Days</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {Array.isArray(shift.weeklyOffDays) && shift.weeklyOffDays.length > 0
                                                ? shift.weeklyOffDays.join(', ')
                                                : 'None'}
                                        </span>
                                    </div>
                                </div>

                                {/* Assigned Staff / Departments */}
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                    {shift.applicableDepartments && shift.applicableDepartments.length > 0 && (
                                        <div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">Depts: </span>
                                            {shift.applicableDepartments.join(', ')}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span>Assigned Staff: <b className="text-blue-600 dark:text-blue-400">{shift.assignedStaffCount || 0} employees</b></span>
                                        <button
                                            onClick={() => handleOpenAssignModal(shift)}
                                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                        >
                                            Assign Staff
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => handleOpenShiftModal(shift)}
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>

                                    {!shift.isDefault && (
                                        <button
                                            onClick={() => handleDeleteShift(shift)}
                                            className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: LATE ARRIVAL SETTINGS & REPORTING */}
            {activeTab === 'late-arrival' && (
                <div className="space-y-6">
                    {/* SECTION 1: DEDICATED LATE ARRIVAL SETTINGS */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                                        <Sliders className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        Morning Shift Late Arrival Settings
                                    </h2>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Configure shift start time, grace periods, automatic late detection rules, and real-time alerts.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchLateArrivalSettings}
                                disabled={lateSettingsLoading}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1.5 self-start sm:self-auto"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${lateSettingsLoading ? 'animate-spin' : ''}`} />
                                <span>Reload Config</span>
                            </button>
                        </div>

                        {/* Rules Calculation Explainer Banner */}
                        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                            <div className="flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-blue-950 dark:text-blue-200">
                                        Automated Late Arrival Calculation Formula:
                                    </p>
                                    <p className="text-blue-800 dark:text-blue-300 leading-relaxed text-[11px]">
                                        Late duration is calculated relative to configured shift start time, excluding the grace period:
                                        <br />
                                        <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-100 font-semibold">
                                            Late Minutes = Check-In Time - (Shift Start Time + Grace Period)
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 shrink-0 space-y-0.5">
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✓ IN at 09:10 AM → On Time (0 min)
                                </div>
                                <div className="text-rose-600 dark:text-rose-400 font-bold">
                                    ⚠ IN at 09:25 AM → Late (+15 mins)
                                </div>
                            </div>
                        </div>

                        {/* Settings Form */}
                        <form onSubmit={handleSaveLateSettings} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Morning Shift Start Time */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Morning Shift Start Time *
                                    </label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="time"
                                            required
                                            value={lateSettings.startTime || '09:00'}
                                            onChange={(e) => setLateSettings({ ...lateSettings, startTime: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400">Official scheduled start (IST)</span>
                                </div>

                                {/* Grace Period in Minutes */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Grace Period (Minutes) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        required
                                        value={lateSettings.gracePeriodMinutes ?? 10}
                                        onChange={(e) => setLateSettings({ ...lateSettings, gracePeriodMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px] text-slate-400">No late penalty within grace limit</span>
                                </div>

                                {/* Late Arrival Detection Toggle */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Late Arrival Detection
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setLateSettings({ ...lateSettings, lateDetectionEnabled: !lateSettings.lateDetectionEnabled })}
                                        className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                                            lateSettings.lateDetectionEnabled
                                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <span>{lateSettings.lateDetectionEnabled ? 'Detection Enabled' : 'Detection Disabled'}</span>
                                        <span className={`w-2.5 h-2.5 rounded-full ${lateSettings.lateDetectionEnabled ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                    </button>
                                    <span className="text-[10px] text-slate-400">Flags attendance after grace period</span>
                                </div>

                                {/* Late Arrival Notifications Toggle */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Late Notifications
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setLateSettings({ ...lateSettings, lateNotificationsEnabled: !lateSettings.lateNotificationsEnabled })}
                                        className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                                            lateSettings.lateNotificationsEnabled
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <span>{lateSettings.lateNotificationsEnabled ? 'Alerts Active' : 'Alerts Disabled'}</span>
                                        <Bell className={`w-3.5 h-3.5 ${lateSettings.lateNotificationsEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </button>
                                    <span className="text-[10px] text-slate-400">Notifies management on late check-in</span>
                                </div>
                            </div>

                            {/* Notification Channels */}
                            {lateSettings.lateNotificationsEnabled && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                                        Notification Delivery Channels
                                    </span>
                                    <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={lateSettings.lateNotificationChannels?.inApp ?? true}
                                                onChange={(e) => setLateSettings({
                                                    ...lateSettings,
                                                    lateNotificationChannels: {
                                                        ...lateSettings.lateNotificationChannels,
                                                        inApp: e.target.checked
                                                    }
                                                })}
                                                className="rounded text-blue-600 focus:ring-0"
                                            />
                                            <span>In-App Realtime Alert (Instant bell notification)</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={lateSettings.lateNotificationChannels?.email ?? false}
                                                onChange={(e) => setLateSettings({
                                                    ...lateSettings,
                                                    lateNotificationChannels: {
                                                        ...lateSettings.lateNotificationChannels,
                                                        email: e.target.checked
                                                    }
                                                })}
                                                className="rounded text-blue-600 focus:ring-0"
                                            />
                                            <span>Email Digest</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={lateSettings.lateNotificationChannels?.whatsapp ?? false}
                                                onChange={(e) => setLateSettings({
                                                    ...lateSettings,
                                                    lateNotificationChannels: {
                                                        ...lateSettings.lateNotificationChannels,
                                                        whatsapp: e.target.checked
                                                    }
                                                })}
                                                className="rounded text-blue-600 focus:ring-0"
                                            />
                                            <span>WhatsApp Dispatch</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Save Settings Action Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={lateSettingsSaving}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-2"
                                >
                                    {lateSettingsSaving ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Saving Settings & Recalculating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Save Late Arrival Settings</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* SECTION 2: LATE ARRIVAL SUMMARY & KPI DASHBOARD */}
                    <div className="space-y-4">
                        {/* Filter Toolbar & Export Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Month Filter */}
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="month"
                                        value={lateReportMonth}
                                        onChange={(e) => setLateReportMonth(e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                                    />
                                </div>

                                {/* Optional Single Date Filter */}
                                <div className="flex items-center gap-1.5 text-xs">
                                    <input
                                        type="date"
                                        placeholder="Specific Date"
                                        value={lateReportDate}
                                        onChange={(e) => setLateReportDate(e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                                    />
                                    {lateReportDate && (
                                        <button
                                            type="button"
                                            onClick={() => setLateReportDate('')}
                                            className="p-1 rounded text-slate-400 hover:text-slate-600"
                                            title="Clear date filter"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Employee Filter */}
                                <div className="flex items-center gap-1.5 text-xs">
                                    <select
                                        value={lateReportStaffId}
                                        onChange={(e) => setLateReportStaffId(e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[160px] truncate"
                                    >
                                        <option value="ALL">All Employees</option>
                                        {staffList.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} ({s.department || 'Staff'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleExportLatePDF}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                                    title="Download Monthly Late Arrival Report PDF"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download PDF Report</span>
                                </button>

                                <button
                                    onClick={handleExportLateCSV}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                                    title="Export Late Arrival Data as CSV"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Download CSV</span>
                                </button>
                            </div>
                        </div>

                        {/* KPI Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                                    Total Late Arrivals
                                </span>
                                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                                    {lateReportData.summary?.totalLateArrivals || 0}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Recorded in {lateReportMonth}</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                                    Employees Late
                                </span>
                                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                                    {lateReportData.summary?.uniqueLateEmployees || 0}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Unique staff members</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 block mb-1">
                                    Total Late Minutes
                                </span>
                                <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                                    {lateReportData.summary?.totalLateMinutes || 0}m
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Accumulated lost time</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
                                    Average Late Delay
                                </span>
                                <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                                    {lateReportData.summary?.averageLateMinutes || 0}m
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Per late arrival event</span>
                            </div>
                        </div>

                        {/* SECTION 3: MOST FREQUENT LATE ARRIVALS LEADERBOARD */}
                        {lateReportData.summary?.mostFrequentLate && lateReportData.summary.mostFrequentLate.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Most Frequent Late Arrivals ({lateReportMonth})
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {lateReportData.summary.mostFrequentLate.slice(0, 6).map((item, idx) => (
                                        <div
                                            key={item.staffId || idx}
                                            className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                    idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                }`}>
                                                    #{idx + 1}
                                                </span>
                                                <div>
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {item.department || 'General'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                                                    {item.lateCount} {item.lateCount === 1 ? 'time' : 'times'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    +{item.totalLateMinutes}m total
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECTION 4: DATE-WISE LATE ARRIVAL HISTORY */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Date-Wise Late Arrival History ({lateReportData.records?.length || 0} Records)
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Chronological breakdown of late check-ins with actual arrival and penalty duration.
                                    </p>
                                </div>
                            </div>

                            {lateReportLoading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                                    Loading late arrival history...
                                </div>
                            ) : lateReportData.records?.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-bold italic">
                                    No late arrivals recorded for the selected filter criteria.
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards (sm:hidden) */}
                                    <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                        {lateReportData.records.map((rec) => (
                                            <div key={rec.id} className="p-3.5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black text-xs text-slate-900 dark:text-white block">
                                                            {rec.staffName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {rec.department || 'General'}
                                                        </span>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                                                        +{rec.lateMinutes}m Late
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Date</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.date}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Shift Start</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{rec.shiftStart}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Actual IN</span>
                                                        <span className="font-bold text-rose-600 dark:text-rose-400">{rec.actualIn}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop Table (hidden sm:block) */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                                    <th className="px-5 py-3">Employee Name</th>
                                                    <th className="px-5 py-3">Department</th>
                                                    <th className="px-5 py-3">Date</th>
                                                    <th className="px-5 py-3">Shift Start</th>
                                                    <th className="px-5 py-3">Actual IN</th>
                                                    <th className="px-5 py-3 text-center">Late Minutes</th>
                                                    <th className="px-5 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                                {lateReportData.records.map((rec) => (
                                                    <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                            {rec.staffName}
                                                        </td>
                                                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                                                            {rec.department || 'General'}
                                                        </td>
                                                        <td className="px-5 py-3 whitespace-nowrap">
                                                            {rec.date}
                                                        </td>
                                                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                                                            {rec.shiftStart}
                                                        </td>
                                                        <td className="px-5 py-3 font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                            {rec.actualIn}
                                                        </td>
                                                        <td className="px-5 py-3 text-center font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                                            +{rec.lateMinutes} min
                                                        </td>
                                                        <td className="px-5 py-3 whitespace-nowrap">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                                                                {rec.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE / EDIT SHIFT */}
            <AnimatePresence>
                {isShiftModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-xl w-full p-6 shadow-2xl space-y-5 my-8"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                        {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Configure schedule, break durations, grace periods, and overtime multiplier.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsShiftModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Shift Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Morning Shift"
                                            value={shiftForm.name}
                                            onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Shift Code (Unique) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. MORNING"
                                            value={shiftForm.code}
                                            onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Start Time (HH:mm) *
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={shiftForm.startTime}
                                            onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            End Time (HH:mm) *
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={shiftForm.endTime}
                                            onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Break Duration (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shiftForm.breakDuration}
                                            onChange={(e) => setShiftForm({ ...shiftForm, breakDuration: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Expected Hours *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.25"
                                            min="1"
                                            required
                                            value={shiftForm.expectedHours}
                                            onChange={(e) => setShiftForm({ ...shiftForm, expectedHours: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Grace Period (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shiftForm.gracePeriodMinutes}
                                            onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMinutes: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Early Exit Allowance (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={shiftForm.earlyExitAllowanceMinutes}
                                            onChange={(e) => setShiftForm({ ...shiftForm, earlyExitAllowanceMinutes: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Shift Type
                                        </label>
                                        <select
                                            value={shiftForm.shiftType}
                                            onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Night">Night</option>
                                            <option value="Flexible">Flexible</option>
                                            <option value="Rotational">Rotational</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Applicable Departments
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Engineering, Operations"
                                            value={shiftForm.applicableDepartments}
                                            onChange={(e) => setShiftForm({ ...shiftForm, applicableDepartments: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Weekly Off Days Selection */}
                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Weekly Off Days
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => {
                                            const isChecked = shiftForm.weeklyOffDays.includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => {
                                                        const newDays = isChecked
                                                            ? shiftForm.weeklyOffDays.filter(d => d !== day)
                                                            : [...shiftForm.weeklyOffDays, day];
                                                        setShiftForm({ ...shiftForm, weeklyOffDays: newDays });
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                                        isChecked
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Toggles: Overnight & Default */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shiftForm.isOvernight}
                                            onChange={(e) => setShiftForm({ ...shiftForm, isOvernight: e.target.checked })}
                                            className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <div>
                                            <span className="font-bold block text-slate-900 dark:text-white">Overnight Shift</span>
                                            <span className="text-[10px] text-slate-400">Crosses midnight (+24h duration support)</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={shiftForm.isDefault}
                                            onChange={(e) => setShiftForm({ ...shiftForm, isDefault: e.target.checked })}
                                            className="rounded text-blue-600 focus:ring-0"
                                        />
                                        <div>
                                            <span className="font-bold block text-slate-900 dark:text-white">Default Fallback Shift</span>
                                            <span className="text-[10px] text-slate-400">Used if no custom shift is assigned</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsShiftModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20"
                                    >
                                        {actionLoading ? 'Saving...' : editingShift ? 'Save Changes' : 'Create Shift'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: MANUAL ATTENDANCE TIMESTAMP CORRECTION */}
            <AnimatePresence>
                {isCorrectionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-5"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        <span>Manual Timestamp Correction</span>
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Audit-compliant timestamp adjustment with mandatory reason logging.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCorrectionModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
                                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl space-y-1">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                                        Employee: <b className="text-blue-600 dark:text-blue-400">{correctionForm.staffName}</b>
                                    </span>
                                    <span className="text-slate-500 text-[11px] block">
                                        Record Date: <b>{correctionForm.date}</b>
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Corrected Check-IN Time *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 09:00 or 08:59 AM"
                                            value={correctionForm.checkIn}
                                            onChange={(e) => setCorrectionForm({ ...correctionForm, checkIn: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Corrected Check-OUT Time *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 17:00 or 04:54 AM"
                                            value={correctionForm.checkOut}
                                            onChange={(e) => setCorrectionForm({ ...correctionForm, checkOut: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Break Deduction (mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={correctionForm.breakTime}
                                            onChange={(e) => setCorrectionForm({ ...correctionForm, breakTime: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                            Applicable Shift
                                        </label>
                                        <select
                                            value={correctionForm.shiftId}
                                            onChange={(e) => setCorrectionForm({ ...correctionForm, shiftId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        >
                                            <option value="">Auto-resolve from employee</option>
                                            {shifts.map(s => (
                                                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Mandatory Audit Reason *
                                    </label>
                                    <textarea
                                        required
                                        rows="3"
                                        placeholder="Explain reason for manual timestamp adjustment (e.g. Biometric device reboot, employee field visit, missed scan approval)..."
                                        value={correctionForm.reason}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
                                    ></textarea>
                                </div>

                                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsCorrectionModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-600/20"
                                    >
                                        {actionLoading ? 'Recording Correction...' : 'Commit Correction'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: ASSIGN STAFF TO SHIFT */}
            <AnimatePresence>
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                                        Assign Staff to Shift
                                    </h2>
                                    <p className="text-xs text-blue-600 font-bold">
                                        {shiftToAssign?.name} ({shiftToAssign?.code})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                                {staffList.length === 0 ? (
                                    <p className="text-slate-400 py-4 text-center">No staff found.</p>
                                ) : (
                                    staffList.map(staff => {
                                        const isChecked = selectedStaffIds.includes(staff._id);
                                        return (
                                            <label
                                                key={staff._id}
                                                className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                                            >
                                                <div className="space-y-0.5">
                                                    <span className="font-bold block text-slate-800 dark:text-slate-200">
                                                        {staff.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {staff.department || 'General'} • {staff.designation || 'Staff'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedStaffIds([...selectedStaffIds, staff._id]);
                                                        } else {
                                                            setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff._id));
                                                        }
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-0"
                                                />
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                                <span className="text-slate-400 font-medium">
                                    {selectedStaffIds.length} staff selected
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAssignModalOpen(false)}
                                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveStaffAssignment}
                                        disabled={actionLoading}
                                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Assignments'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
