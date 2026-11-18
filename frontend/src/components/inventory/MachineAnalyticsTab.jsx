import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Activity, Clock, AlertTriangle, Wrench, Plus, RefreshCw, 
    Calendar, CheckCircle2, ChevronRight, BarChart2, ShieldCheck, X, FileText
} from 'lucide-react';

const DOWNTIME_REASONS = [
    'Mechanical Breakdown',
    'Electrical Failure',
    'Hydraulic / Pneumatic Issue',
    'Tool Wear / Blade Replacement',
    'Power Outage / Generator Switch',
    'Material Shortage',
    'Operator Unavailable',
    'Scheduled Preventive Maintenance',
    'Other'
];

const MachineAnalyticsTab = ({ machines = [] }) => {
    const [analytics, setAnalytics] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('30d');
    const [selectedMachineFilter, setSelectedMachineFilter] = useState('All');

    // Modal
    const [showLogModal, setShowLogModal] = useState(false);
    const [logForm, setLogForm] = useState({
        machineId: '',
        logType: 'OPERATION', // 'OPERATION' | 'DOWNTIME' | 'MAINTENANCE'
        date: new Date().toISOString().split('T')[0],
        startTime: new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16),
        plannedHours: 8,
        downtimeReason: 'Mechanical Breakdown',
        downtimeDescription: '',
        productionImpact: 'Minor Delay (<1 hr)',
        maintenanceCost: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, [timeframe, selectedMachineFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, logsRes] = await Promise.all([
                api.get('/machines/analytics', { params: { timeframe } }),
                api.get('/machines/logs', {
                    params: {
                        machineId: selectedMachineFilter !== 'All' ? selectedMachineFilter : undefined
                    }
                })
            ]);

            if (analyticsRes.data?.success) setAnalytics(analyticsRes.data);
            if (logsRes.data?.logs) setLogs(logsRes.data.logs);
        } catch (err) {
            console.error('Failed to load machine analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordLog = async (e) => {
        e.preventDefault();
        try {
            await api.post('/machines/logs', logForm);
            setShowLogModal(false);
            setLogForm({
                machineId: '',
                logType: 'OPERATION',
                date: new Date().toISOString().split('T')[0],
                startTime: new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 16),
                endTime: new Date().toISOString().slice(0, 16),
                plannedHours: 8,
                downtimeReason: 'Mechanical Breakdown',
                downtimeDescription: '',
                productionImpact: 'Minor Delay (<1 hr)',
                maintenanceCost: '',
                notes: ''
            });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to record machine log');
        }
    };

    const summary = analytics?.summary || {
        totalMachines: 0,
        availableMachines: 0,
        inRepairMachines: 0,
        totalOperatingHoursAll: 0,
        totalDowntimeHoursAll: 0,
        totalMaintenanceCostAll: 0,
        avgAvailabilityPct: 100
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        Machine Utilization & Downtime Analytics
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Track runtime hours, idle hours, breakdown causes, maintenance expenditure, and equipment availability.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                        {['7d', '30d', '90d', 'all'].map(tf => (
                            <button
                                key={tf}
                                type="button"
                                onClick={() => setTimeframe(tf)}
                                className={`px-2.5 py-1 rounded-lg uppercase ${
                                    timeframe === tf ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowLogModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        Log Run / Downtime
                    </button>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Operating Hours</span>
                    <p className="text-2xl font-black text-indigo-600 font-poppins mt-1">
                        {summary.totalOperatingHoursAll} <span className="text-xs text-slate-400 font-normal">hrs</span>
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold">In Active Production</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[11px] font-bold text-rose-500 uppercase">Breakdown Downtime</span>
                    <p className="text-2xl font-black text-rose-600 font-poppins mt-1">
                        {summary.totalDowntimeHoursAll} <span className="text-xs text-slate-400 font-normal">hrs</span>
                    </p>
                    <span className="text-[10px] text-rose-500 font-bold">Unplanned Lost Time</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-500 uppercase">Fleet Availability</span>
                    <p className="text-2xl font-black text-emerald-600 font-poppins mt-1">
                        {summary.avgAvailabilityPct}%
                    </p>
                    <span className="text-[10px] text-slate-400">{summary.availableMachines} / {summary.totalMachines} Available</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[11px] font-bold text-amber-500 uppercase">Maintenance Cost</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-poppins mt-1">
                        ₹{summary.totalMaintenanceCostAll.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400">Repairs & Servicing</span>
                </div>
            </div>

            {/* Leaderboards: Top Utilized vs Maximum Downtime */}
            {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Utilized */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4" />
                                Top Utilized Machinery
                            </h3>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Operating Hours</span>
                        </div>
                        <div className="space-y-2">
                            {(analytics.mostUtilized || []).map((m, idx) => (
                                <div key={m.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                                            <p className="text-[10px] text-slate-400">{m.code} • {m.brand}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-indigo-600 font-poppins text-sm">{m.totalOperatingHours} hrs</span>
                                        <span className="block text-[10px] text-emerald-600 font-bold">{m.utilizationPct}% Utilized</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Maximum Downtime */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-rose-600 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                Highest Downtime Machinery
                            </h3>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Lost Hours</span>
                        </div>
                        <div className="space-y-2">
                            {(analytics.maxDowntime || []).map((m, idx) => (
                                <div key={m.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                                            <p className="text-[10px] text-slate-400">{m.code} • {m.breakdownCount} Breakdowns</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-rose-600 font-poppins text-sm">{m.totalDowntimeHours} hrs</span>
                                        <span className="block text-[10px] text-slate-400">₹{m.maintenanceCost.toLocaleString()} spent</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Historical Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase text-slate-400">Equipment Operational & Downtime Logs</h3>
                    <select
                        value={selectedMachineFilter}
                        onChange={(e) => setSelectedMachineFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                    >
                        <option value="All">All Machines</option>
                        {machines.map(m => (
                            <option key={m._id} value={m._id}>{m.name} ({m.code || 'EQP'})</option>
                        ))}
                    </select>
                </div>

                {logs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        No operational or downtime logs recorded for this selection.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-black">
                                    <th className="text-left py-2">Date & Time</th>
                                    <th className="text-left py-2">Machine Name</th>
                                    <th className="text-center py-2">Log Type</th>
                                    <th className="text-right py-2">Duration</th>
                                    <th className="text-left py-2">Reason / Details</th>
                                    <th className="text-right py-2">Repair Cost</th>
                                    <th className="text-right py-2">Logged By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {logs.map(log => (
                                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="py-2.5">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {new Date(log.date).toLocaleDateString()}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">
                                                {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="py-2.5">
                                            <p className="font-bold text-slate-900 dark:text-white">{log.machineName}</p>
                                            <span className="text-[10px] text-slate-400">{log.machineCode}</span>
                                        </td>
                                        <td className="text-center py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                log.logType === 'OPERATION' ? 'bg-indigo-100 text-indigo-700' :
                                                log.logType === 'DOWNTIME' ? 'bg-rose-100 text-rose-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {log.logType}
                                            </span>
                                        </td>
                                        <td className="text-right py-2.5 font-black text-slate-900 dark:text-white font-poppins">
                                            {log.durationHours} hrs
                                        </td>
                                        <td className="py-2.5 max-w-xs">
                                            {log.logType === 'DOWNTIME' ? (
                                                <div>
                                                    <span className="font-bold text-rose-600 block">{log.downtimeReason}</span>
                                                    <span className="text-[10px] text-slate-500 line-clamp-1">{log.downtimeDescription || 'No description'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 dark:text-slate-400">{log.notes || 'Normal Operation'}</span>
                                            )}
                                        </td>
                                        <td className="text-right py-2.5 font-bold font-poppins">
                                            {log.maintenanceCost > 0 ? `₹${log.maintenanceCost.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="text-right py-2.5 text-slate-400 text-[11px]">
                                            {log.recordedByName || 'Supervisor'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════ MODAL: RECORD LOG ═══════════ */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Log Machine Run or Downtime</h3>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordLog} className="space-y-3.5">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Machine / Tool *</label>
                                <select
                                    required
                                    value={logForm.machineId}
                                    onChange={(e) => setLogForm({ ...logForm, machineId: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                >
                                    <option value="">Select Equipment</option>
                                    {machines.map(m => (
                                        <option key={m._id} value={m._id}>{m.name} ({m.code || 'EQP'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Log Type *</label>
                                    <select
                                        value={logForm.logType}
                                        onChange={(e) => setLogForm({ ...logForm, logType: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    >
                                        <option value="OPERATION">Operation (Run Time)</option>
                                        <option value="DOWNTIME">Downtime (Breakdown)</option>
                                        <option value="MAINTENANCE">Scheduled Maintenance</option>
                                        <option value="IDLE">Idle Time</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Planned Hours</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={logForm.plannedHours}
                                        onChange={(e) => setLogForm({ ...logForm, plannedHours: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">Start Time *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={logForm.startTime}
                                        onChange={(e) => setLogForm({ ...logForm, startTime: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase">End Time *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={logForm.endTime}
                                        onChange={(e) => setLogForm({ ...logForm, endTime: e.target.value })}
                                        className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {logForm.logType === 'DOWNTIME' && (
                                <div className="space-y-3 p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
                                    <div>
                                        <label className="text-[11px] font-bold text-rose-700 uppercase">Breakdown Reason *</label>
                                        <select
                                            value={logForm.downtimeReason}
                                            onChange={(e) => setLogForm({ ...logForm, downtimeReason: e.target.value })}
                                            className="w-full mt-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl p-2 text-xs font-bold"
                                        >
                                            {DOWNTIME_REASONS.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-rose-700 uppercase">Production Impact</label>
                                        <select
                                            value={logForm.productionImpact}
                                            onChange={(e) => setLogForm({ ...logForm, productionImpact: e.target.value })}
                                            className="w-full mt-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl p-2 text-xs font-bold"
                                        >
                                            <option value="None">None</option>
                                            <option value="Minor Delay (<1 hr)">Minor Delay (&lt;1 hr)</option>
                                            <option value="Moderate Delay (1-4 hrs)">Moderate Delay (1-4 hrs)</option>
                                            <option value="Severe Stoppage (>4 hrs)">Severe Stoppage (&gt;4 hrs)</option>
                                            <option value="Job Rescheduled">Job Rescheduled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-rose-700 uppercase">Repair Cost (₹)</label>
                                        <input
                                            type="number"
                                            placeholder="Parts / Labor Cost"
                                            value={logForm.maintenanceCost}
                                            onChange={(e) => setLogForm({ ...logForm, maintenanceCost: e.target.value })}
                                            className="w-full mt-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl p-2 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Description / Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Operator name, component replaced, or job remarks..."
                                    value={logForm.notes}
                                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowLogModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    Save Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MachineAnalyticsTab;
