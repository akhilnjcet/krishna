import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
  History, Calendar, Search, Filter, Trash2, CheckCircle2, 
  XCircle, Clock, Loader2, Download, Check, X,
  ChevronLeft, ChevronRight, User, PieChart, RefreshCw
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
    const [activeTab, setActiveTab] = useState('hub'); // 'hub', 'logs'
    const [staffList, setStaffList] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [biometricLogs, setBiometricLogs] = useState([]);
    const [loadingHub, setLoadingHub] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    
    // Config filters
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`; // YYYY-MM
    });
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly', 'weekly', 'daily'
    const [selectedWeek, setSelectedWeek] = useState(0); // 0 to 4 (Week 1 to Week 5)
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterLogStatus, setFilterLogStatus] = useState('');

    // Attendance edit cell state
    const [editingCell, setEditingCell] = useState(null); // { staffId, date, currentStatus }

    // Modal local inputs
    const [localStatus, setLocalStatus] = useState('');
    const [localCheckIn, setLocalCheckIn] = useState('');
    const [localCheckOut, setLocalCheckOut] = useState('');
    const [localBreakTime, setLocalBreakTime] = useState(0);

    useEffect(() => {
        if (editingCell) {
            setLocalStatus(editingCell.currentStatus || 'Present');
            setLocalCheckIn(editingCell.checkIn || '09:00');
            setLocalCheckOut(editingCell.checkOut || (editingCell.currentStatus === 'Half Day' ? '13:00' : '17:00'));
            setLocalBreakTime(editingCell.breakTime || 0);
        }
    }, [editingCell]);

    // Fetch staff list
    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaffList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch staff roster", error);
        }
    };

    // Fetch daily attendance records for month
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

    // Fetch biometric scan logs
    const fetchBiometricLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const res = await api.get(`/attendance?status=${filterLogStatus}`);
            setBiometricLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch biometric logs", error);
        } finally {
            setLoadingLogs(false);
        }
    }, [filterLogStatus]);

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        if (activeTab === 'hub') {
            fetchAttendanceHub();
        } else {
            fetchBiometricLogs();
        }
    }, [activeTab, fetchAttendanceHub, fetchBiometricLogs]);

    const handleDeleteBiometric = async (id) => {
        if (!window.confirm("Delete this biometric verification log?")) return;
        try {
            await api.delete(`/attendance/${id}`);
            fetchBiometricLogs();
        } catch (error) {
            console.error(error);
            alert("Failed to delete log.");
        }
    };

    const handleUpdateAttendance = async (staffId, date, status, checkIn, checkOut, breakTime) => {
        try {
            await api.post('/daily-attendance', { staffId, date, status, checkIn, checkOut, breakTime });
            // Refresh hub data instantly
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

    // Split days into weeks
    const weeksOfDays = useMemo(() => {
        const weeks = [];
        let currentWeek = [];
        daysInMonth.forEach((day, idx) => {
            currentWeek.push(day);
            // Split every 7 days or at the end of the month
            if (currentWeek.length === 7 || idx === daysInMonth.length - 1) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });
        return weeks;
    }, [daysInMonth]);

    // Active days shown depending on viewMode
    const activeDays = useMemo(() => {
        if (viewMode === 'monthly') return daysInMonth;
        if (viewMode === 'weekly') return weeksOfDays[selectedWeek] || [];
        if (viewMode === 'daily') return [new Date(selectedDate)];
        return daysInMonth;
    }, [viewMode, daysInMonth, weeksOfDays, selectedWeek, selectedDate]);

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

    // Compute calendar grid state
    const calendarGrid = useMemo(() => {
        const grid = {};
        attendanceRecords.forEach(rec => {
            const staffId = rec.staffId?._id || rec.staffId;
            const dateStr = rec.date; // format YYYY-MM-DD
            if (staffId && dateStr) {
                if (!grid[staffId]) grid[staffId] = {};
                grid[staffId][dateStr] = rec;
            }
        });
        return grid;
    }, [attendanceRecords]);

    // Calculate staff-wise percentage and counts for the month
    const staffSummaries = useMemo(() => {
        const summaries = {};
        filteredStaff.forEach(s => {
            let present = 0, absent = 0, half = 0, leave = 0, holiday = 0;
            const staffGrid = calendarGrid[s._id] || {};
            
            daysInMonth.forEach(day => {
                const dateStr = formatDateLocal(day);
                const rec = staffGrid[dateStr];
                const status = rec ? rec.status : undefined;
                if (status === 'Present') present++;
                else if (status === 'Absent') absent++;
                else if (status === 'Half Day') half++;
                else if (status === 'Leave') leave++;
                else if (status === 'Holiday') holiday++;
            });

            const totalCounted = present + absent + half + leave + holiday;
            const activeDaysCount = present + (half * 0.5);
            const countableDays = totalCounted - holiday;
            
            let percentage = 0;
            if (countableDays > 0) {
                percentage = Math.round((activeDaysCount / countableDays) * 100);
            } else if (totalCounted > 0) {
                percentage = 100;
            }

            summaries[s._id] = { present, absent, half, leave, holiday, totalCounted, percentage };
        });
        return summaries;
    }, [filteredStaff, calendarGrid, daysInMonth]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Present': return <span className="text-emerald-600 font-bold" title="Present">✅</span>;
            case 'Absent': return <span className="text-rose-600 font-bold" title="Absent">❌</span>;
            case 'Half Day': return <span className="text-amber-500 font-bold animate-pulse" title="Half Day">🟡</span>;
            case 'Leave': return <span className="text-purple-600 font-bold" title="Leave">🟣</span>;
            case 'Holiday': return <span className="text-blue-500 font-bold" title="Holiday">🔵</span>;
            default: return <span className="text-slate-300 font-bold">-</span>;
        }
    };

    const handleDownloadReport = () => {
        const columns = ['Employee ID', 'Name', 'Department', 'Present', 'Half Day', 'Absent', 'Leave', 'Holiday', 'Score %'];
        const data = filteredStaff.map(s => {
            const sum = staffSummaries[s._id] || { present: 0, half: 0, absent: 0, leave: 0, holiday: 0, percentage: 0 };
            return [
                s.staff_id,
                s.name.toUpperCase(),
                s.department,
                sum.present.toString(),
                sum.half.toString(),
                sum.absent.toString(),
                sum.leave.toString(),
                sum.holiday.toString(),
                `${sum.percentage}%`
            ];
        });
        generateGeneralReportPDF(data, `Attendance_Report_${selectedMonth}`, columns);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-800 min-h-screen relative font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Attendance Control Hub</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Verify verification scans, override attendance grids, and inspect compliance score indices.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadReport}
                        className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Download className="w-5 h-5" /> Export Attendance
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('hub')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'hub' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                >
                    📅 Attendance Grid Calendar
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'logs' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                >
                    🔍 Biometric scan logs
                </button>
            </div>

            {/* MAIN HUB VIEW */}
            {activeTab === 'hub' ? (
                <div className="space-y-6">
                    
                    {/* Control Panel / Filter bar */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Temporal Cycle</label>
                                    <input 
                                        type="month" 
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Scope View</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                        {['monthly', 'weekly', 'daily'].map((m) => (
                                            <button 
                                                key={m}
                                                onClick={() => setViewMode(m)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${viewMode === m ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {viewMode === 'weekly' && (
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Cycle Week</label>
                                        <select 
                                            value={selectedWeek}
                                            onChange={(e) => setSelectedWeek(Number(e.target.value))}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500 uppercase text-xs"
                                        >
                                            {weeksOfDays.map((w, idx) => (
                                                <option key={idx} value={idx}>Week {idx + 1} ({w[0].getDate()} - {w[w.length-1].getDate()})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {viewMode === 'daily' && (
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Inspect Date</label>
                                        <input 
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="space-y-1 w-48 md:w-60">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Search Query</label>
                                    <input 
                                        type="text"
                                        placeholder="Search name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Department List</label>
                                    <select 
                                        value={filterDept}
                                        onChange={(e) => setFilterDept(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none font-bold text-xs uppercase tracking-wider"
                                    >
                                        <option value="">All</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Status legends */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 justify-center">
                            <span className="flex items-center gap-1"><span className="text-emerald-600">✅</span> Present</span>
                            <span className="flex items-center gap-1"><span className="text-rose-600">❌</span> Absent</span>
                            <span className="flex items-center gap-1"><span>🟡</span> Half Day</span>
                            <span className="flex items-center gap-1"><span>🟣</span> Leave</span>
                            <span className="flex items-center gap-1"><span>🔵</span> Holiday</span>
                            <span className="text-indigo-600/80 italic ml-4 font-normal">Click cell grid to modify attendance instantly.</span>
                        </div>
                    </div>

                    {/* Attendance Grid Sheet */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full border-collapse text-left text-sm relative">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
                                        <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 sticky left-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[200px]">Staff Details</th>
                                        <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400 text-center">Score %</th>
                                        {activeDays.map(day => {
                                            const dateStr = formatDateLocal(day);
                                            const dayNum = day.getDate();
                                            const isToday = dateStr === formatDateLocal(new Date());
                                            return (
                                                <th 
                                                    key={dateStr} 
                                                    className={`px-3 py-4 text-center font-bold text-xs border-r border-slate-100 dark:border-slate-800 min-w-[45px] ${isToday ? 'bg-indigo-50/55 text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}
                                                >
                                                    <p className="leading-none">{dayNum}</p>
                                                    <p className="text-[7.5px] uppercase mt-1 opacity-70">
                                                        {day.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2)}
                                                    </p>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingHub ? (
                                        <tr>
                                            <td colSpan={activeDays.length + 2} className="py-20 text-center text-slate-400">
                                                <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-4" />
                                                Syncing attendance ledger...
                                            </td>
                                        </tr>
                                    ) : filteredStaff.length === 0 ? (
                                        <tr>
                                            <td colSpan={activeDays.length + 2} className="py-20 text-center text-slate-400 font-bold">
                                                No active staff members found matching query options.
                                            </td>
                                        </tr>
                                    ) : filteredStaff.map(staff => {
                                        const summaries = staffSummaries[staff._id] || { percentage: 0 };
                                        const staffGrid = calendarGrid[staff._id] || {};
                                        
                                        return (
                                            <tr key={staff._id} className="hover:bg-slate-50/60 dark:bg-slate-800/60 transition-colors">
                                                <td className="px-6 py-4 bg-white dark:bg-slate-900 sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{staff.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{staff.staff_id} • {staff.designation}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-tight ${
                                                        summaries.percentage >= 90 ? 'bg-emerald-50 text-emerald-700' :
                                                        summaries.percentage >= 75 ? 'bg-indigo-50 text-indigo-700' :
                                                        'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {summaries.percentage}%
                                                    </span>
                                                </td>
                                                
                                                {activeDays.map(day => {
                                                    const dateStr = formatDateLocal(day);
                                                    const rec = staffGrid[dateStr];
                                                    const status = rec ? rec.status : '';
                                                    
                                                    return (
                                                        <td 
                                                            key={dateStr}
                                                            onClick={() => setEditingCell({ 
                                                                staffId: staff._id, 
                                                                date: dateStr, 
                                                                currentStatus: status || '',
                                                                checkIn: rec?.checkIn || '09:00',
                                                                checkOut: rec?.checkOut || (status === 'Half Day' ? '13:00' : '17:00'),
                                                                breakTime: rec?.breakTime || 0
                                                            })}
                                                            className="px-2 py-4 text-center border-r border-slate-100 dark:border-slate-800 hover:bg-indigo-50/40 cursor-pointer transition-colors relative"
                                                        >
                                                            {getStatusIcon(status)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* BIOMETRICS SCANS VIEW */
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                placeholder="Search scan logs by staff name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-6 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition text-sm font-semibold"
                            />
                        </div>
                        <div className="md:w-64 relative">
                            <select 
                                value={filterLogStatus}
                                onChange={(e) => setFilterLogStatus(e.target.value)}
                                className="w-full pl-6 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl appearance-none focus:ring-2 focus:ring-indigo-500/20 outline-none transition uppercase font-bold text-xs"
                            >
                                <option value="">All Verification Status</option>
                                <option value="success">Successful Scans</option>
                                <option value="failed">Failed Attempts</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400">Staff Details</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400">IN / OUT Times</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400">Duration</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400">Log Status</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 dark:text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingLogs ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                                                Reading terminal biometric history...
                                            </td>
                                        </tr>
                                    ) : biometricLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                                                No attendance biometric activity logs found.
                                            </td>
                                        </tr>
                                    ) : biometricLogs.filter(log => 
                                        log.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        log.staff_id?.staff_id?.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).map(log => {
                                        return (
                                            <tr key={log._id} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-6 py-6">
                                                    <div>
                                                        <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{log.full_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                            {log.staff_id?.staff_id || 'N/A'} • {log.date}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col gap-1 text-xs font-semibold">
                                                        <span className="text-emerald-600">IN: {log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A'}</span>
                                                        <span className="text-rose-500">OUT: {log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--:--'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 font-mono font-bold text-xs text-slate-600 dark:text-slate-400">
                                                    {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '--'}
                                                </td>
                                                <td className="px-6 py-6">
                                                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                    }`}>
                                                        {log.status === 'success' ? 'SUCCESS SCAN' : 'FAILED ATTEMPT'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteBiometric(log._id)}
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Status Editor Modal */}
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
                                    <h4 className="font-black text-slate-950 text-lg uppercase tracking-tight">Set Attendance</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{editingCell.date}</p>
                                </div>
                                <button 
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 hover:bg-slate-100 dark:bg-slate-800/80 rounded-full text-slate-400 hover:text-slate-900 dark:text-white transition"
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
                                                className={`py-2 px-3 text-xs font-black uppercase tracking-wider border rounded-xl transition text-center ${localStatus === item.val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/80'}`}
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

                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Calculated Worked Hours:</span>
                                            <span className="font-mono text-indigo-600">
                                                {(() => {
                                                    if (!localCheckIn || !localCheckOut) return '0.00';
                                                    const [inH, inM] = localCheckIn.split(':').map(Number);
                                                    const [outH, outM] = localCheckOut.split(':').map(Number);
                                                    const totalMins = (outH * 60 + outM) - (inH * 60 + inM) - (Number(localBreakTime) || 0);
                                                    return Math.max(0, parseFloat((totalMins / 60).toFixed(2))).toFixed(2);
                                                })()} hrs
                                            </span>
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
