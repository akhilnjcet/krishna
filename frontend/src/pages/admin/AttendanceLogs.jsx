import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  History, Calendar, Search, Filter, Trash2, 
  MapPin, CheckCircle2, XCircle, Clock, Smartphone, Loader2, Download
} from 'lucide-react';
import { motion } from 'framer-motion';

const AttendanceLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [filterStatus]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance?status=${filterStatus}`);
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this log entry?")) return;
        try {
            await api.delete(`/attendance/${id}`);
            fetchLogs();
        } catch (err) {
            alert("Failed to delete log.");
        }
    };

    const exportToCSV = () => {
        const headers = ["Staff ID", "Full Name", "Date", "Login Time", "Confidence", "Status", "IP Address"];
        const rows = logs.map(log => [
            log.staff_id?.staff_id || 'N/A',
            log.full_name,
            log.date,
            log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A',
            (log.face_match_confidence * 100).toFixed(2) + '%',
            log.status,
            log.device_ip
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const filteredLogs = logs.filter(log => 
        log.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.staff_id?.staff_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                        <History className="w-10 h-10 text-indigo-600" />
                        Attendance Verification Logs
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Real-time tracking of staff facial verification and biometric logins.</p>
                </div>
                
                <button 
                    onClick={exportToCSV}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                    <Download className="w-5 h-5" /> Export Report (CSV)
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by staff name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    />
                </div>
                <div className="md:w-64 relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    >
                        <option value="">All Statuses</option>
                        <option value="success">Success</option>
                        <option value="fail">Failed</option>
                    </select>
                </div>
            </div>

            {/* Logs Timeline/Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                <th className="px-6 py-5 font-bold text-slate-600">Timestamp</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Staff Details</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Device/IP</th>
                                <th className="px-6 py-5 font-bold text-slate-600 text-center">Confidence Score</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Result</th>
                                <th className="px-6 py-5 font-bold text-slate-600 text-right">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">Crunching biometric logs...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                                        No attendance activity recorded for the selected period.
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-2 text-slate-900 font-black">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                {log.date}
                                            </span>
                                            <span className="flex items-center gap-2 text-slate-500 font-medium text-sm mt-1">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div>
                                            <p className="text-lg font-black text-slate-800">{log.full_name}</p>
                                            <p className="text-xs font-mono text-indigo-600 font-bold tracking-widest">{log.staff_id?.staff_id || 'UNKNOWN-ID'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex items-center gap-2 text-slate-600 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {log.device_ip || 'Hidden IP'}
                                            </span>
                                            <span className="flex items-center gap-2 text-slate-400 text-xs">
                                                <Smartphone className="w-3.5 h-3.5" /> Web Interface
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-mono text-center">
                                        <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 inline-block font-black text-indigo-600">
                                            {(log.face_match_confidence * 100).toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`flex items-center gap-2 font-bold uppercase tracking-widest text-xs py-2 px-3 rounded-xl w-fit ${
                                            log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {log.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                            {log.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <button 
                                            onClick={() => handleDelete(log._id)}
                                            className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceLogs;
