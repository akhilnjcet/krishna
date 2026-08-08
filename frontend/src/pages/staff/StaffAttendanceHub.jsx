import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
    Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, 
    Download, Eye, Search, Filter, ArrowLeft, ArrowRight, ShieldCheck, 
    Sparkles, RefreshCw, FileText, MapPin, Award, Activity
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import { generateGeneralReportPDF } from '../../services/pdfService';

const StaffAttendanceHub = () => {
    const { user } = useAuthStore();

    // Selected Month state YYYY-MM
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });

    const [loading, setLoading] = useState(true);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [summary, setSummary] = useState({
        present: 0,
        absent: 0,
        halfDay: 0,
        leave: 0,
        holiday: 0,
        totalDays: 0,
        percentage: 0
    });
    const [overtimeLogs, setOvertimeLogs] = useState([]);

    // Search and Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // View Modal State
    const [isReportModalOpen, setReportModalOpen] = useState(false);

    // Fetch Staff Attendance Logs & Summary
    const fetchAttendanceData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const staffId = user._id || user.id;
            const [summaryRes, dailyRes, otRes] = await Promise.all([
                api.get(`/daily-attendance/summary?month=${selectedMonth}&staffId=${staffId}`),
                api.get(`/daily-attendance?month=${selectedMonth}&staffId=${staffId}`),
                api.get(`/overtime?month=${selectedMonth}&staffId=${staffId}`)
            ]);

            if (summaryRes.data && summaryRes.data.summary) {
                setSummary(summaryRes.data.summary);
            }
            setAttendanceLogs(Array.isArray(dailyRes.data) ? dailyRes.data : []);
            setOvertimeLogs(Array.isArray(otRes.data) ? otRes.data : []);
        } catch (err) {
            console.error("Failed to load staff attendance data:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, user]);

    // Real-Time Socket Synchronization
    useEffect(() => {
        fetchAttendanceData();
        const socket = getSocket();
        if (socket) {
            const handleUpdate = () => {
                fetchAttendanceData();
            };
            socket.on('attendance_updated', handleUpdate);
            socket.on('attendance_recorded', handleUpdate);
            socket.on('daily_attendance_changed', handleUpdate);
            socket.on('clock_in', handleUpdate);
            socket.on('clock_out', handleUpdate);

            return () => {
                socket.off('attendance_updated', handleUpdate);
                socket.off('attendance_recorded', handleUpdate);
                socket.off('daily_attendance_changed', handleUpdate);
                socket.off('clock_in', handleUpdate);
                socket.off('clock_out', handleUpdate);
            };
        }
    }, [fetchAttendanceData]);

    // Overtime hours map for quick lookup by date
    const overtimeMap = useMemo(() => {
        const map = {};
        overtimeLogs.forEach(ot => {
            if (ot.date) {
                map[ot.date] = ot.hours || 0;
            }
        });
        return map;
    }, [overtimeLogs]);

    // Total Overtime calculation
    const totalOvertimeHours = useMemo(() => {
        return overtimeLogs.reduce((acc, ot) => acc + (ot.hours || 0), 0);
    }, [overtimeLogs]);

    // Filtered Logs Calculation
    const filteredLogs = useMemo(() => {
        return attendanceLogs.filter(log => {
            const matchesSearch = 
                !searchTerm || 
                (log.date && log.date.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.status && log.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.remarks && log.remarks.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [attendanceLogs, searchTerm, statusFilter]);

    // Pagination Calculation
    const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredLogs.slice(start, start + rowsPerPage);
    }, [filteredLogs, currentPage]);

    // Status Badge Helpers
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Present':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'Absent':
                return 'bg-rose-100 text-rose-800 border-rose-300';
            case 'Half Day':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'Leave':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'Holiday':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    // PDF Download Handler
    const handleDownloadPDF = () => {
        try {
            const columns = ['Date', 'Check-In', 'Check-Out', 'Status', 'Worked Hours', 'Overtime'];
            const tableData = attendanceLogs.map(log => [
                log.date || 'N/A',
                log.checkIn || '--',
                log.checkOut || '--',
                (log.status || 'N/A').toUpperCase(),
                `${log.workedHours || 0} hrs`,
                `${overtimeMap[log.date] || 0} hrs`
            ]);

            generateGeneralReportPDF(
                tableData, 
                `Attendance Report - ${selectedMonth} (${user?.name || 'Staff'})`, 
                columns
            );
        } catch (err) {
            console.error("Failed to generate PDF report:", err);
            alert("Error downloading Attendance PDF. Please try again.");
        }
    };

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* Top Title & Header Toolbar */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
                        <Activity className="w-4 h-4" /> Personnel Attendance Terminal
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight font-poppins">Attendance</h1>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Real-time daily clocking, monthly attendance breakdown, and automated payroll reporting.
                    </p>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Month Picker */}
                    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <input 
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => setReportModalOpen(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 border border-slate-700 transition shadow"
                    >
                        <Eye className="w-4 h-4 text-indigo-400" /> View Report
                    </button>

                    <button
                        onClick={handleDownloadPDF}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Present Days */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Present</span>
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.present}</h3>
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Days Attended</p>
                    </div>
                </div>

                {/* Absent Days */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Absent</span>
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600"><XCircle className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.absent}</h3>
                        <p className="text-[10px] text-rose-600 font-bold mt-0.5">Days Missed</p>
                    </div>
                </div>

                {/* Half Days */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Half Day</span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.halfDay}</h3>
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">Half Shifts</p>
                    </div>
                </div>

                {/* Leave Days */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Leave</span>
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><FileText className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.leave}</h3>
                        <p className="text-[10px] text-purple-600 font-bold mt-0.5">Approved Leaves</p>
                    </div>
                </div>

                {/* Holidays */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Holiday</span>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Award className="w-4 h-4" /></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.holiday}</h3>
                        <p className="text-[10px] text-blue-600 font-bold mt-0.5">Company Holidays</p>
                    </div>
                </div>

                {/* Attendance Score */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 rounded-3xl text-white shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Score</span>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white">{summary.percentage}%</h3>
                        <p className="text-[10px] text-indigo-100 font-bold mt-0.5">Monthly Ratio</p>
                    </div>
                </div>
            </div>

            {/* ATTENDANCE HISTORY TABLE & CONTROLS */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm space-y-4">
                {/* Search & Filter Bar */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search by date or status..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Leave">Leave</option>
                                <option value="Holiday">Holiday</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-4">
                        <span>Total Records: <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong></span>
                        <span>Overtime Total: <strong className="text-indigo-600">{totalOvertimeHours} hrs</strong></span>
                    </div>
                </div>

                {/* Table Component */}
                <div className="mobile-table-scroll">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Check-In Time</th>
                                <th className="px-6 py-4">Check-Out Time</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Working Hours</th>
                                <th className="px-6 py-4 text-center">Overtime</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                        Fetching daily attendance records...
                                    </td>
                                </tr>
                            ) : paginatedLogs.length > 0 ? (
                                paginatedLogs.map((log) => (
                                    <tr key={log._id || log.date} className="hover:bg-slate-50/60/60 dark:bg-slate-800/60 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            {log.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                            {log.checkIn || '--'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                            {log.checkOut || '--'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusBadge(log.status)}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            {log.workedHours || 0} hrs
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-indigo-600 whitespace-nowrap">
                                            {overtimeMap[log.date] || 0} hrs
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {log.location || 'Factory / Site'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                                            {log.remarks || 'Standard Shift Logged'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400 font-bold italic">
                                        No attendance logs found for {selectedMonth}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50/30/30 dark:bg-slate-800/30">
                        <span>Page {currentPage} of {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* VIEW ATTENDANCE REPORT MODAL */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto font-sans"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div>
                                    <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">ATTENDANCE REPORT SUMMARY</h2>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Monthly Personnel Statement ({selectedMonth})</p>
                                </div>
                                <button 
                                    onClick={() => setReportModalOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100/80 dark:bg-slate-800/80 transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Employee Info Header */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">EMPLOYEE DETAILS</span>
                                    <p className="font-black text-slate-900 dark:text-white">{user?.name || 'Staff Member'}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">ID: {user?.staff_id || user?._id || 'N/A'}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Dept: {user?.department || 'Operations'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">REPORT PARAMETERS</span>
                                    <p className="font-black text-indigo-600">CYCLE: {selectedMonth}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Score: {summary.percentage}%</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Overtime: {totalOvertimeHours} hrs</p>
                                </div>
                            </div>

                            {/* Summary Grid inside Modal */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div><span className="text-[9px] text-slate-400 font-bold block">PRESENT</span><span className="font-black text-emerald-600">{summary.present}</span></div>
                                <div><span className="text-[9px] text-slate-400 font-bold block">ABSENT</span><span className="font-black text-rose-600">{summary.absent}</span></div>
                                <div><span className="text-[9px] text-slate-400 font-bold block">HALF DAYS</span><span className="font-black text-amber-600">{summary.halfDay}</span></div>
                                <div><span className="text-[9px] text-slate-400 font-bold block">LEAVES</span><span className="font-black text-purple-600">{summary.leave}</span></div>
                                <div><span className="text-[9px] text-slate-400 font-bold block">HOLIDAYS</span><span className="font-black text-blue-600">{summary.holiday}</span></div>
                                <div><span className="text-[9px] text-slate-400 font-bold block">OVERTIME</span><span className="font-black text-indigo-600">{totalOvertimeHours} hrs</span></div>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs max-h-60 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                                            <th className="p-2.5">Date</th>
                                            <th className="p-2.5">In</th>
                                            <th className="p-2.5">Out</th>
                                            <th className="p-2.5">Status</th>
                                            <th className="p-2.5 text-right">Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attendanceLogs.map((log) => (
                                            <tr key={log.date} className="hover:bg-slate-50 dark:bg-slate-800 font-medium">
                                                <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{log.date}</td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">{log.checkIn || '--'}</td>
                                                <td className="p-2.5 text-slate-600 dark:text-slate-400">{log.checkOut || '--'}</td>
                                                <td className="p-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusBadge(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">{log.workedHours || 0} hrs</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                                <span className="text-slate-400 font-bold">Krishna Engineering Works [Official Registry]</span>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                                >
                                    <Download className="w-4 h-4" /> Download PDF Report
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffAttendanceHub;
