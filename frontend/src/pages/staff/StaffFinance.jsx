import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
    Calendar, CheckCircle2, AlertCircle, Loader2, FileText, Download,
    Wallet, TrendingUp, History, Send, Info, CreditCard, Clock, UserCheck
} from 'lucide-react';
import { generateSalaryPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import ReportHeader from '../../components/ReportHeader';

const StaffFinance = () => {
    const [activeTab, setActiveTab] = useState('slips'); // 'slips', 'attendance', 'overtime'
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdvanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
    const { user } = useAuthStore();

    // Month Selector for Attendance & Overtime tabs
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`; // YYYY-MM
    });

    // Attendance & Overtime States for Staff
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [otRecords, setOtRecords] = useState([]);
    const [loadingTabContent, setLoadingTabContent] = useState(false);

    // Fetch primary salary payout history
    const fetchSalary = async () => {
        try {
            const res = await api.get('/finance/staff-salary');
            setHistory(res.data);
        } catch (err) {
            console.error('Salary sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch own attendance summary & overtime logs for month
    const fetchMonthlyLogs = useCallback(async () => {
        if (!user) return;
        setLoadingTabContent(true);
        try {
            const staffId = user._id || user.id;
            const [summaryRes, otRes] = await Promise.all([
                api.get(`/daily-attendance/summary?month=${selectedMonth}&staffId=${staffId}`),
                api.get(`/overtime?month=${selectedMonth}&staffId=${staffId}`)
            ]);
            setAttendanceSummary(summaryRes.data.summary || null);
            setAttendanceRecords(summaryRes.data.records || []);
            setOtRecords(Array.isArray(otRes.data) ? otRes.data : []);
        } catch (err) {
            console.error("Failed to load staff logs", err);
        } finally {
            setLoadingTabContent(false);
        }
    }, [selectedMonth, user]);

    useEffect(() => {
        fetchSalary();
    }, []);

    useEffect(() => {
        if (activeTab !== 'slips') {
            fetchMonthlyLogs();
        }
    }, [activeTab, fetchMonthlyLogs]);

    const handleDownloadSlip = (sal) => {
        if (sal.paymentStatus !== 'paid') return;
        generateSalaryPDF(sal, user);
    };

    const handleAdvanceRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/applications', {
                type: 'advance_salary',
                title: `Advance Salary Request: ₹${advanceForm.amount}`,
                description: advanceForm.reason,
                amount: parseFloat(advanceForm.amount)
            });
            alert(`Advance request of ₹${advanceForm.amount} submitted successfully for review.`);
            setAdvanceModalOpen(false);
            setAdvanceForm({ amount: '', reason: '' });
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Failed to submit advance salary request.");
        }
    };

    // Calculate payouts
    const totalPaid = history.filter(s => s.paymentStatus === 'paid').reduce((acc, s) => acc + (s.netSalary || s.salaryAmount || 0), 0);
    const pendingAmount = history.filter(s => s.paymentStatus !== 'paid').reduce((acc, s) => acc + (s.netSalary || s.salaryAmount || 0), 0);

    const stats = [
        { label: 'Total Earned', value: `₹ ${(totalPaid + pendingAmount).toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Cleared Amount', value: `₹ ${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pending Payout', value: `₹ ${pendingAmount.toLocaleString()}`, icon: History, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    // Calendar Calculations
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

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Present': return { symbol: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
            case 'Absent': return { symbol: '❌', color: 'bg-rose-50 text-rose-700 border-rose-100' };
            case 'Half Day': return { symbol: '🟡', color: 'bg-amber-50 text-amber-700 border-amber-100' };
            case 'Leave': return { symbol: '🟣', color: 'bg-purple-50 text-purple-700 border-purple-100' };
            case 'Holiday': return { symbol: '🔵', color: 'bg-blue-50 text-blue-700 border-blue-100' };
            default: return { symbol: '-', color: 'bg-slate-50 text-slate-400 border-slate-100' };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Syncing Payroll Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            
            <ReportHeader 
                title="Finance Ledger & Roster"
                subtitle="Manage your monthly earnings, inspect attendance, check overtime records, and download locked salary slips."
                data={history.map(sal => [
                    sal.month,
                    `₹ ${(sal.baseSalary || sal.salaryAmount || 0).toLocaleString()}`,
                    `₹ ${(sal.deductions || 0).toLocaleString()}`,
                    `₹ ${(sal.netSalary || sal.salaryAmount || 0).toLocaleString()}`,
                    sal.paymentStatus.toUpperCase()
                ])}
                columns={['Period', 'Base', 'Deduction', 'Net', 'Status']}
            />

            {/* Request Advance Action */}
            <div className="flex justify-between items-center -mt-4">
                {/* Tab Navigation */}
                <div className="flex bg-slate-200/50 p-1 rounded-2xl w-fit border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('slips')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'slips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        💰 Payouts & Salary Slips
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        📅 Attendance Calendar
                    </button>
                    <button 
                        onClick={() => setActiveTab('overtime')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'overtime' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        ⏱️ Overtime logs
                    </button>
                </div>

                <button 
                    onClick={() => setAdvanceModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                    Request Salary Advance
                </button>
            </div>

            {/* SLIPS VIEW */}
            {activeTab === 'slips' && (
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Salary History Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" /> Payout History
                            </h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-6 py-4">Month / Cycle</th>
                                        <th className="px-6 py-4">Base Salary</th>
                                        <th className="px-6 py-4">Overtime Pay</th>
                                        <th className="px-6 py-4">Deductions</th>
                                        <th className="px-6 py-4">Net Disbursed</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                                    {history.length > 0 ? history.map((sal) => (
                                        <tr key={sal._id} className="hover:bg-slate-50/50 transition group">
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-bold text-slate-700">{sal.month}</span>
                                            </td>
                                            <td className="px-6 py-5 italic">₹ {(sal.baseSalary || sal.salaryAmount || 0).toLocaleString()}</td>
                                            <td className="px-6 py-5 text-emerald-600">₹ {(sal.overtimeEarnings || 0).toLocaleString()}</td>
                                            <td className="px-6 py-5 text-rose-500">₹ {((sal.deductions || 0) + (sal.advanceRecovery || 0)).toLocaleString()}</td>
                                            <td className="px-6 py-5 text-sm font-black text-slate-800">₹ {(sal.netSalary || sal.salaryAmount || 0).toLocaleString()}</td>
                                            <td className="px-6 py-5">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                                                    sal.paymentStatus === 'paid' 
                                                    ? 'bg-emerald-50 text-emerald-700' 
                                                    : 'bg-amber-50 text-amber-700'
                                                }`}>
                                                    {sal.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <button 
                                                    onClick={() => handleDownloadSlip(sal)}
                                                    disabled={sal.paymentStatus !== 'paid'}
                                                    className={`p-2 rounded-lg border transition-all ${
                                                        sal.paymentStatus === 'paid' 
                                                        ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm' 
                                                        : 'border-slate-100 text-slate-300 cursor-not-allowed grayscale'
                                                    }`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-400 font-bold italic">No payment statements logged yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ATTENDANCE CALENDAR VIEW */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    {/* Controls & Metrics */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Inspect Month:</span>
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 focus:border-indigo-500"
                            />
                        </div>

                        {attendanceSummary && (
                            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-600">
                                <p>Score Index: <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black">{attendanceSummary.percentage}%</span></p>
                                <p>Present: <span className="text-emerald-600">{attendanceSummary.present}</span></p>
                                <p>Half Days: <span className="text-amber-500">{attendanceSummary.halfDay}</span></p>
                                <p>Absent: <span className="text-rose-500">{attendanceSummary.absent}</span></p>
                                <p>Leaves: <span className="text-purple-600">{attendanceSummary.leave}</span></p>
                                <p>Holidays: <span className="text-blue-500">{attendanceSummary.holiday}</span></p>
                            </div>
                        )}
                    </div>

                    {/* 35-Day Grid Calendar */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="grid grid-cols-7 gap-3 text-center mb-4">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                <div key={d} className="text-[10px] font-black text-slate-400 tracking-widest">{d}</div>
                            ))}
                        </div>

                        {loadingTabContent ? (
                            <div className="py-20 text-center text-slate-400">
                                <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mx-auto" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-3">
                                {(() => {
                                    // Align calendar starting offset (blank boxes)
                                    const firstDay = daysInMonth[0];
                                    if (!firstDay) return null;
                                    const offset = firstDay.getDay();
                                    const boxes = [];
                                    
                                    for (let i = 0; i < offset; i++) {
                                        boxes.push(<div key={`blank-${i}`} className="aspect-square bg-slate-50 border border-slate-100 rounded-2xl opacity-40"></div>);
                                    }

                                    daysInMonth.forEach(day => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const record = attendanceRecords.find(r => r.date === dateStr);
                                        const status = record ? record.status : '';
                                        const ui = getStatusIcon(status);

                                        boxes.push(
                                            <div 
                                                key={dateStr}
                                                className={`aspect-square p-3 border rounded-2xl flex flex-col justify-between items-center transition hover:shadow-md ${ui.color}`}
                                            >
                                                <span className="text-xs font-black self-start">{day.getDate()}</span>
                                                <span className="text-lg">{ui.symbol}</span>
                                            </div>
                                        );
                                    });

                                    return boxes;
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* OVERTIME LOGS VIEW */}
            {activeTab === 'overtime' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Inspect Month:</span>
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" /> Overtime Logging Summary
                            </h3>
                            <div className="text-[9px] font-black uppercase text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                                Total OT Yield: ₹ {otRecords.reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Hours Logged</th>
                                        <th className="px-6 py-4">Rate Per Hour</th>
                                        <th className="px-6 py-4">Yield (INR)</th>
                                        <th className="px-6 py-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
                                    {loadingTabContent ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-slate-400">
                                                <Loader2 className="animate-spin w-6 h-6 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : otRecords.length > 0 ? otRecords.map(ot => (
                                        <tr key={ot._id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-5 font-bold">{ot.date}</td>
                                            <td className="px-6 py-5 font-bold text-slate-700">{ot.hours} hrs</td>
                                            <td className="px-6 py-5 text-slate-500">₹ {ot.ratePerHour}</td>
                                            <td className="px-6 py-5 text-sm font-black text-slate-800">₹ {ot.totalAmount?.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-slate-400 font-medium italic">{ot.remarks || '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-slate-400 font-bold italic">No overtime logs registered for this month.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Advance Salary Modal */}
            <AnimatePresence>
                {isAdvanceModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAdvanceModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-8 text-white relative">
                                <div className="absolute top-0 right-0 p-8 opacity-20"><Wallet className="w-24 h-24 rotate-12" /></div>
                                <h3 className="text-2xl font-bold mb-1">Request Advance</h3>
                                <p className="text-indigo-100 text-sm font-medium tracking-tight uppercase tracking-wider">Salary Advance Submission Form</p>
                            </div>
                            
                            <form onSubmit={handleAdvanceRequest} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Request Amount (₹)</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-slate-300" />
                                            <input 
                                                type="number" 
                                                required
                                                placeholder="e.g. 5000" 
                                                className="bg-transparent w-full outline-none text-slate-700 font-bold"
                                                value={advanceForm.amount}
                                                onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Reason for Advance</label>
                                        <textarea 
                                            required
                                            rows="4" 
                                            placeholder="Please describe why you need the advance..." 
                                            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 font-medium text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                                            value={advanceForm.reason}
                                            onChange={(e) => setAdvanceForm({...advanceForm, reason: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">Advance approvals are subject to prior monthly attendance scores and current work progress status.</p>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setAdvanceModalOpen(false)}
                                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffFinance;
