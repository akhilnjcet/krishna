import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  History, Calendar, 
  Loader2, Download
} from 'lucide-react';

const StaffTimesheets = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance/my-logs`);
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ["Date", "IN Time", "OUT Time", "Duration (mins)", "Salary Status"];
        const rows = logs.map(log => [
            log.date,
            log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A',
            log.check_out ? new Date(log.check_out).toLocaleTimeString() : 'N/A',
            log.duration_minutes || 0,
            getSalaryStatus(log.duration_minutes).label
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `my_timesheets_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getSalaryStatus = (minutes) => {
        if (!minutes || minutes < 240) return { label: 'Absent/Partial', color: 'bg-red-100 text-red-700' };
        if (minutes >= 480) return { label: 'Full Day', color: 'bg-emerald-100 text-emerald-700' };
        return { label: 'Half Day', color: 'bg-amber-100 text-amber-700' };
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 flex items-center gap-3">
                        <History className="w-10 h-10 text-blue-600" />
                        My Timesheets
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Review your daily attendance, shift logs, and calculated pay status.</p>
                </div>
                
                <button 
                    onClick={exportToCSV}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                    <Download className="w-5 h-5" /> Export Records
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                <th className="px-6 py-5 font-bold text-slate-600">Date</th>
                                <th className="px-6 py-5 font-bold text-slate-600">IN / OUT Times</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Duration</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Salary Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">Loading your records...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center text-slate-500">
                                        No attendance activity recorded yet. Time to log in!
                                    </td>
                                </tr>
                            ) : logs.map((log) => {
                                const status = getSalaryStatus(log.duration_minutes);
                                return (
                                <tr key={log._id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-6">
                                        <span className="flex items-center gap-2 text-slate-900 font-black">
                                            <Calendar className="w-5 h-5 text-blue-500" />
                                            {log.date}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 font-medium text-slate-700">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <span className="text-emerald-600 font-bold">IN: {log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A'}</span>
                                            <span className="text-red-500 font-bold">OUT: {log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--:--'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-mono font-bold text-slate-600 text-lg">
                                        {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '--'}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`font-bold uppercase tracking-widest text-[10px] py-1.5 px-3 rounded-lg w-fit ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffTimesheets;
