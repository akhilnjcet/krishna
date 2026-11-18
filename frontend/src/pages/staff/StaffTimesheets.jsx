import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
    History, Calendar, Loader2, Download,
    ArrowUpDown, RefreshCw, Clock, CheckCircle2,
    AlertCircle, Award, Filter
} from 'lucide-react';
import {
    formatTimeIST,
    formatDurationMinutes,
    getUnifiedAttendanceStatus
} from '../../utils/dateTimeUtil';

const StaffTimesheets = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
    const [sortAscending, setSortAscending] = useState(true); // Ascending by default (Oldest first)
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchLogs();
    }, [selectedMonth]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance/my-logs?month=${selectedMonth}`);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch timesheet logs:", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter and Sort logs
    const processedLogs = useMemo(() => {
        let list = [...logs];

        if (statusFilter !== 'ALL') {
            list = list.filter(l => l.status === statusFilter);
        }

        list.sort((a, b) => {
            const dateComp = (a.date || '').localeCompare(b.date || '');
            if (dateComp !== 0) {
                return sortAscending ? dateComp : -dateComp;
            }
            const timeA = a.login_time ? new Date(a.login_time).getTime() : 0;
            const timeB = b.login_time ? new Date(b.login_time).getTime() : 0;
            return sortAscending ? timeA - timeB : timeB - timeA;
        });

        return list;
    }, [logs, sortAscending, statusFilter]);

    // Summary calculations
    const summary = useMemo(() => {
        let present = 0;
        let halfDay = 0;
        let absent = 0;
        let totalOt = 0;
        let totalWorked = 0;

        logs.forEach(l => {
            if (l.status === 'Present') present++;
            else if (l.status === 'Half Day') halfDay++;
            else if (l.status === 'Absent') absent++;
            totalOt += (l.overtimeHours || 0);
            totalWorked += (l.workedHours || 0);
        });

        return {
            total: logs.length,
            present,
            halfDay,
            absent,
            totalOt: parseFloat(totalOt.toFixed(2)),
            totalWorked: parseFloat(totalWorked.toFixed(2))
        };
    }, [logs]);

    const exportToCSV = () => {
        const headers = ["Date", "Check-In (IST)", "Check-Out (IST)", "Worked Hours", "Duration", "Overtime (hrs)", "Status"];
        const rows = processedLogs.map(log => {
            const inDisp = log.checkInDisplay || (log.login_time ? formatTimeIST(log.login_time, false) : (log.checkInStr ? formatTimeIST(log.checkInStr, false) : '--'));
            const outDisp = log.checkOutDisplay || (log.check_out ? formatTimeIST(log.check_out, false) : (log.checkOutStr && log.checkOutStr !== '--' ? formatTimeIST(log.checkOutStr, false) : '--'));
            const dur = formatDurationMinutes(log.duration_minutes, inDisp, outDisp);
            const statusMeta = getUnifiedAttendanceStatus(log.status, outDisp !== '--' ? outDisp : log.check_out, log.duration_minutes, log.is_active_shift, inDisp !== '--' ? inDisp : log.login_time, log.date);

            return [
                log.date,
                inDisp,
                outDisp,
                log.workedHours || 0,
                dur,
                log.overtimeHours || 0,
                statusMeta.label
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `my_timesheets_${selectedMonth}.csv`;
        link.click();
    };

    return (
        <div className="p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <History className="w-8 h-8 text-blue-600" />
                        My Timesheets
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm font-medium">
                        Synchronized daily shift history, biometric timestamps, and pay status.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Month Picker */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Calendar className="w-4 h-4 text-blue-500 ml-2" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none pr-2 cursor-pointer"
                        />
                    </div>

                    {/* Sort Order Toggle */}
                    <button
                        type="button"
                        onClick={() => setSortAscending(!sortAscending)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                        title={sortAscending ? "Sorted Ascending (Oldest First)" : "Sorted Descending (Newest First)"}
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">{sortAscending ? "Oldest First" : "Newest First"}</span>
                    </button>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={fetchLogs}
                        className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
                        title="Refresh Timesheets"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={exportToCSV}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Records</span>
                    <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                        {summary.total}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Present Days</span>
                    <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {summary.present}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Half Days</span>
                    <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        {summary.halfDay}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Overtime (hrs)</span>
                    <p className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                        +{summary.totalOt} hrs
                    </p>
                </div>
            </div>

            {/* Timesheet List / Table Container */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Mobile Cards View (block sm:hidden) */}
                <div className="block sm:hidden p-3 space-y-3">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Loading synchronized records...</p>
                        </div>
                    ) : processedLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                            No timesheet records found for {selectedMonth}.
                        </div>
                    ) : (
                        processedLogs.map((log) => {
                            const inDisp = log.checkInDisplay || (log.login_time ? formatTimeIST(log.login_time, false) : (log.checkInStr ? formatTimeIST(log.checkInStr, false) : '--'));
                            const outDisp = log.checkOutDisplay || (log.check_out ? formatTimeIST(log.check_out, false) : (log.checkOutStr && log.checkOutStr !== '--' ? formatTimeIST(log.checkOutStr, false) : '--'));
                            const statusMeta = getUnifiedAttendanceStatus(
                                log.status,
                                outDisp !== '--' ? outDisp : log.check_out,
                                log.duration_minutes,
                                log.is_active_shift,
                                inDisp !== '--' ? inDisp : log.login_time,
                                log.date
                            );

                            return (
                                <div
                                    key={`m-ts-${log._id}`}
                                    className="p-3.5 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            <span>{log.date}</span>
                                        </div>
                                        <div className={`font-bold uppercase tracking-wider text-[9px] py-1 px-2 rounded-md shrink-0 whitespace-nowrap border ${statusMeta.color}`}>
                                            {statusMeta.label}
                                        </div>
                                    </div>

                                    <div className="text-xs bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 flex justify-between items-center">
                                        <div className="space-y-0.5">
                                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                                IN: {inDisp}
                                            </p>
                                            <p className="text-rose-500 dark:text-rose-400 font-bold text-[11px]">
                                                OUT: {outDisp}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Duration</span>
                                            <span className="font-mono font-black text-xs text-slate-700 dark:text-slate-300">
                                                {formatDurationMinutes(log.duration_minutes, inDisp, outDisp)}
                                            </span>
                                            {log.overtimeHours > 0 && (
                                                <span className="text-[10px] font-bold text-indigo-600 block">
                                                    +{log.overtimeHours}h OT
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View (hidden sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full border-collapse min-w-[700px] text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                <th className="px-5 py-3.5">Date</th>
                                <th className="px-5 py-3.5">IN / OUT Timestamps (IST)</th>
                                <th className="px-5 py-3.5 text-center">Worked Hours</th>
                                <th className="px-5 py-3.5 text-center">Duration</th>
                                <th className="px-5 py-3.5 text-center">Overtime</th>
                                <th className="px-5 py-3.5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                                        Loading synchronized timesheet records...
                                    </td>
                                </tr>
                            ) : processedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No attendance activity recorded for {selectedMonth}.
                                    </td>
                                </tr>
                            ) : (
                                processedLogs.map((log) => {
                                    const inDisp = log.checkInDisplay || (log.login_time ? formatTimeIST(log.login_time, false) : (log.checkInStr ? formatTimeIST(log.checkInStr, false) : '--'));
                                    const outDisp = log.checkOutDisplay || (log.check_out ? formatTimeIST(log.check_out, false) : (log.checkOutStr && log.checkOutStr !== '--' ? formatTimeIST(log.checkOutStr, false) : '--'));
                                    const statusMeta = getUnifiedAttendanceStatus(
                                        log.status,
                                        outDisp !== '--' ? outDisp : log.check_out,
                                        log.duration_minutes,
                                        log.is_active_shift,
                                        inDisp !== '--' ? inDisp : log.login_time,
                                        log.date
                                    );

                                    return (
                                        <tr key={log._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    <span>{log.date}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                        IN: {inDisp}
                                                    </span>
                                                    <span className="text-rose-500 dark:text-rose-400 font-bold">
                                                        OUT: {outDisp}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center font-bold">
                                                {log.workedHours || 0} hrs
                                            </td>
                                            <td className="px-5 py-3.5 text-center font-mono">
                                                {formatDurationMinutes(log.duration_minutes, inDisp, outDisp)}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {log.overtimeHours > 0 ? (
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                                        +{log.overtimeHours} hrs
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">--</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${statusMeta.color}`}>
                                                    {statusMeta.label}
                                                </span>
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
    );
};

export default StaffTimesheets;
