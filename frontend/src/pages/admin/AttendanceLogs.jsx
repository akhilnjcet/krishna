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

    const [editingLog, setEditingLog] = useState(null);
    const [editData, setEditData] = useState({ login_time: '', check_out: '' });

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

    const openEditModal = (log) => {
        setEditingLog(log);
        setEditData({
            login_time: log.login_time ? new Date(log.login_time).toISOString().slice(0, 16) : '',
            check_out: log.check_out ? new Date(log.check_out).toISOString().slice(0, 16) : ''
        });
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/attendance/${editingLog._id}`, {
                login_time: editData.login_time || null,
                check_out: editData.check_out || null
            });
            setEditingLog(null);
            fetchLogs();
        } catch (err) {
            alert("Failed to update log.");
        }
    };

    const exportToCSV = () => {
        const headers = ["Staff ID", "Full Name", "Date", "IN Time", "OUT Time", "Duration (mins)", "Salary Status", "IP Address"];
        const rows = logs.map(log => [
            log.staff_id?.staff_id || 'N/A',
            log.full_name,
            log.date,
            log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A',
            log.check_out ? new Date(log.check_out).toLocaleTimeString() : 'N/A',
            log.duration_minutes || 0,
            getSalaryStatus(log.duration_minutes),
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

    const getSalaryStatus = (minutes) => {
        if (!minutes || minutes < 240) return { label: 'Absent/Partial', color: 'bg-red-100 text-red-700' };
        if (minutes >= 480) return { label: 'Full Day', color: 'bg-emerald-100 text-emerald-700' };
        return { label: 'Half Day', color: 'bg-amber-100 text-amber-700' };
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                        <History className="w-10 h-10 text-indigo-600" />
                        Attendance Verification Logs
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Real-time tracking of staff verification, shift times, and automatic payroll calculation.</p>
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
            </div>

            {/* Logs Timeline/Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                <th className="px-6 py-5 font-bold text-slate-600">Staff Details</th>
                                <th className="px-6 py-5 font-bold text-slate-600">IN / OUT Times</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Duration</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Salary Status</th>
                                <th className="px-6 py-5 font-bold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium">Crunching biometric logs...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                                        No attendance activity recorded.
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => {
                                const status = getSalaryStatus(log.duration_minutes);
                                return (
                                <tr key={log._id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div>
                                            <p className="text-lg font-black text-slate-800">{log.full_name}</p>
                                            <p className="text-xs font-mono text-indigo-600 font-bold tracking-widest">{log.staff_id?.staff_id || 'UNKNOWN-ID'} • {log.date}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-medium text-slate-700">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <span className="text-emerald-600">IN: {log.login_time ? new Date(log.login_time).toLocaleTimeString() : 'N/A'}</span>
                                            <span className="text-red-500">OUT: {log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--:--'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-mono font-bold text-slate-600">
                                        {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '--'}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`font-bold uppercase tracking-widest text-[10px] py-1.5 px-3 rounded-lg w-fit ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => openEditModal(log)}
                                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold text-sm transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(log._id)}
                                                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingLog && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-900">Edit Timesheet</h2>
                            <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">IN Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={editData.login_time}
                                    onChange={(e) => setEditData({...editData, login_time: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">OUT Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={editData.check_out}
                                    onChange={(e) => setEditData({...editData, check_out: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>
                            <button 
                                onClick={handleUpdate}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AttendanceLogs;
