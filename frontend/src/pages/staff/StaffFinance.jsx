import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
    Calendar, CheckCircle2, AlertCircle, Loader2, FileText, Download,
    Wallet, TrendingUp, History, Send, Info, CreditCard, Clock, UserCheck, Eye, X, ShieldCheck
} from 'lucide-react';
import { generateSalaryPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import ReportHeader from '../../components/ReportHeader';
import { getSocket } from '../../utils/socket';

const StaffFinance = () => {
    const [activeTab, setActiveTab] = useState('slips'); // 'slips', 'attendance', 'overtime'
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdvanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [selectedSlipForView, setSelectedSlipForView] = useState(null);
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
    const fetchSalary = useCallback(async () => {
        try {
            const res = await api.get('/finance/staff-salary');
            setHistory(res.data);
        } catch (err) {
            console.error('Salary sync failure:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time synchronization via Socket.IO
    useEffect(() => {
        fetchSalary();
        const socket = getSocket();
        if (socket) {
            const handleSocketUpdate = (data) => {
                fetchSalary();
            };
            socket.on('payroll_updated', handleSocketUpdate);
            socket.on('payment_status_changed', handleSocketUpdate);
            socket.on('salary_updated', handleSocketUpdate);

            return () => {
                socket.off('payroll_updated', handleSocketUpdate);
                socket.off('payment_status_changed', handleSocketUpdate);
                socket.off('salary_updated', handleSocketUpdate);
            };
        }
    }, [fetchSalary]);

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
        if (activeTab !== 'slips') {
            fetchMonthlyLogs();
        }
    }, [activeTab, fetchMonthlyLogs]);

    const handleDownloadSlip = (sal) => {
        try {
            if (!sal) {
                alert("No salary slip record selected for download.");
                return;
            }
            generateSalaryPDF(sal, user);
        } catch (err) {
            console.error("Failed to generate salary PDF:", err);
            alert("An error occurred while generating the PDF. Please try again.");
        }
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

    // Calculate payouts with precision
    const totalCleared = history
        .filter(s => ['paid', 'Paid', 'Completed'].includes(s.paymentStatus))
        .reduce((acc, s) => acc + (s.salaryAlreadyPaid || s.netSalary || s.salaryAmount || 0), 0);

    const pendingAmount = history
        .filter(s => !['paid', 'Paid', 'Completed'].includes(s.paymentStatus))
        .reduce((acc, s) => acc + (s.remainingBalance !== undefined ? s.remainingBalance : (s.netSalary || s.salaryAmount || 0)), 0);

    const totalEarned = totalCleared + pendingAmount;

    const stats = [
        { label: 'Total Earned', value: `₹ ${totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Cleared Amount', value: `₹ ${totalCleared.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pending Payout', value: `₹ ${pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: History, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const getStatusStyle = (status) => {
        const s = String(status || '').toLowerCase();
        if (s === 'paid') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (s === 'processing') return 'bg-blue-100 text-blue-800 border-blue-300';
        if (s === 'pending' || s === 'unpaid' || s === 'partially_paid') return 'bg-amber-100 text-amber-800 border-amber-300';
        if (s === 'failed') return 'bg-rose-100 text-rose-800 border-rose-300';
        if (s === 'cancelled') return 'bg-slate-200 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600';
        return 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    };

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
            default: return { symbol: '-', color: 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800' };
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
                title="Finance Ledger"
                subtitle="Manage your monthly earnings, inspect attendance, check overtime records, and download locked salary slips."
                data={Array.isArray(history) ? history.map(sal => [
                    sal?.month || 'N/A',
                    `₹ ${(sal?.baseSalary || sal?.salaryAmount || 0).toLocaleString()}`,
                    `₹ ${(sal?.deductions || 0).toLocaleString()}`,
                    `₹ ${(sal?.netSalary || sal?.salaryAmount || 0).toLocaleString()}`,
                    (sal?.paymentStatus || 'Pending').toUpperCase()
                ]) : []}
                columns={['Period', 'Base', 'Deduction', 'Net', 'Status']}
            />

            {/* Request Advance Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-4">
                {/* Tab Navigation */}
                <div className="flex flex-wrap bg-slate-200/50 p-1 rounded-2xl w-full md:w-fit border border-slate-200 dark:border-slate-700 gap-1">
                    <button 
                        onClick={() => setActiveTab('slips')}
                        className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'slips' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                    >
                        💰 Payouts & Slips
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'attendance' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                    >
                        📅 Calendar
                    </button>
                    <button 
                        onClick={() => setActiveTab('overtime')}
                        className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'overtime' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                    >
                        ⏱️ Overtime
                    </button>
                </div>

                <button 
                    onClick={() => setAdvanceModalOpen(true)}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                    Request Salary Advance
                </button>
            </div>

            {/* SLIPS VIEW */}
            {activeTab === 'slips' && (
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {stats.map((stat, idx) => (
                            <div key={stat.label} className={`bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 sm:gap-4 w-full ${idx === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                                <div className={`${stat.bg} ${stat.color} p-3 sm:p-4 rounded-2xl flex-shrink-0`}>
                                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5 truncate">{stat.label}</p>
                                    <h3 className="text-base sm:text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Salary History Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30/30 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" /> Payout History
                            </h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-6 py-4">Month / Cycle</th>
                                        <th className="px-6 py-4">Base Salary</th>
                                        <th className="px-6 py-4">OT Pay</th>
                                        <th className="px-6 py-4">Deductions</th>
                                        <th className="px-6 py-4">Net Payable</th>
                                        <th className="px-6 py-4">Disbursed</th>
                                        <th className="px-6 py-4">Remaining</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {Array.isArray(history) && history.length > 0 ? history.map((sal) => {
                                        if (!sal) return null;
                                        const netPayable   = sal.netSalary || sal.salaryAmount || 0;
                                        const disbursed    = sal.salaryAlreadyPaid ?? 0;
                                        const remaining    = sal.remainingBalance ?? (netPayable - disbursed);
                                        const deductions   = (sal.deductions || 0) + (sal.advanceRecovery || 0);
                                        const isCurrentMonth = sal.month === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })();
                                        return (
                                            <tr key={sal._id} className={`hover:bg-slate-50/50/50 dark:bg-slate-800/50 transition group ${isCurrentMonth ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="px-6 py-5">
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sal.month}</span>
                                                        {isCurrentMonth && (
                                                            <span className="ml-2 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Current</span>
                                                        )}
                                                        {sal.updatedAt && (
                                                            <p className="text-[9px] text-slate-400 mt-0.5">Updated: {new Date(sal.updatedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 italic">₹ {(sal.baseSalary || sal.salaryAmount || 0).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-5 text-emerald-600 font-bold">₹ {(sal.overtimeEarnings || 0).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-5 text-rose-500 font-bold">₹ {deductions.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-white">₹ {netPayable.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-5 text-sm font-bold text-emerald-700">₹ {disbursed.toLocaleString('en-IN')}</td>
                                                <td className={`px-6 py-5 text-sm font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>₹ {Math.max(0, remaining).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${getStatusStyle(sal.paymentStatus)}`}>
                                                        {sal.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => setSelectedSlipForView(sal)}
                                                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                                                            title="View Salary Slip Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownloadSlip(sal)}
                                                            className="p-2 rounded-xl border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
                                                            title="Download PDF Salary Slip"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="9" className="p-12 text-center text-slate-400 font-bold italic">No payment statements logged yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW SALARY SLIP MODAL */}
            <AnimatePresence>
                {selectedSlipForView && (
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
                            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto font-sans"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow">
                                        K
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">KRISHNA ENGINEERING WORKS</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Official Monthly Salary Slip ({selectedSlipForView.month})</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedSlipForView(null)}
                                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100/80 dark:bg-slate-800/80 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Employee Info Grid */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">EMPLOYEE INFORMATION</span>
                                    <p className="font-black text-slate-900 dark:text-white">{selectedSlipForView.staffId?.name || user?.name || 'Employee'}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">ID: {selectedSlipForView.staffId?.staff_id || user?.staff_id || 'N/A'}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Dept: {selectedSlipForView.staffId?.department || user?.department || 'Operations'}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Designation: {selectedSlipForView.staffId?.designation || user?.designation || 'Staff'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">TRANSACTION DETAILS</span>
                                    <p className="font-black text-indigo-600">TXN-{String(selectedSlipForView._id).slice(-8).toUpperCase()}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Month: {selectedSlipForView.month}</p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Status: <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusStyle(selectedSlipForView.paymentStatus)}`}>{selectedSlipForView.paymentStatus}</span></p>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Method: {selectedSlipForView.payments?.[0]?.paymentMethod || 'Bank Transfer'}</p>
                                </div>
                            </div>

                            {/* Attendance Summary */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                                <div className="bg-slate-900 text-white px-4 py-2 font-black uppercase tracking-wider text-[10px]">
                                    Attendance Summary
                                </div>
                                <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center bg-slate-50 dark:bg-slate-800">
                                    <div><span className="text-[9px] text-slate-400 font-bold block">WORKING</span><span className="font-black text-slate-800 dark:text-slate-200">{selectedSlipForView.totalWorkingDays || 26}</span></div>
                                    <div><span className="text-[9px] text-slate-400 font-bold block">PRESENT</span><span className="font-black text-emerald-600">{selectedSlipForView.presentDays || 0}</span></div>
                                    <div><span className="text-[9px] text-slate-400 font-bold block">HALF DAYS</span><span className="font-black text-amber-600">{selectedSlipForView.halfDays || 0}</span></div>
                                    <div><span className="text-[9px] text-slate-400 font-bold block">LEAVES</span><span className="font-black text-purple-600">{selectedSlipForView.leaveDays || 0}</span></div>
                                    <div><span className="text-[9px] text-slate-400 font-bold block">HOLIDAYS</span><span className="font-black text-blue-600">{selectedSlipForView.holidays || 0}</span></div>
                                    <div><span className="text-[9px] text-slate-400 font-bold block">OVERTIME</span><span className="font-black text-indigo-600">{selectedSlipForView.overtimeHours || 0} hrs</span></div>
                                </div>
                            </div>

                            {/* Financial Breakdown Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto text-xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-indigo-600 text-white font-black uppercase text-[10px]">
                                            <th className="p-3">Earnings & Allowances</th>
                                            <th className="p-3 text-right">Amount (₹)</th>
                                            <th className="p-3">Deductions</th>
                                            <th className="p-3 text-right">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        <tr>
                                            <td className="p-3 font-bold">Base Salary</td>
                                            <td className="p-3 text-right">₹ {(selectedSlipForView.baseSalary || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-3 font-bold text-rose-600">Advance Recovery</td>
                                            <td className="p-3 text-right text-rose-600">₹ {(selectedSlipForView.advanceRecovery || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold">Overtime Earnings</td>
                                            <td className="p-3 text-right">₹ {(selectedSlipForView.overtimeEarnings || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-3 font-bold text-rose-600">Other Deductions</td>
                                            <td className="p-3 text-right text-rose-600">₹ {(selectedSlipForView.deductions || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-bold">Bonus & Incentives</td>
                                            <td className="p-3 text-right">₹ {(selectedSlipForView.bonus || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-3"></td>
                                            <td className="p-3"></td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-800 font-black">
                                            <td className="p-3">Net Disbursed Salary</td>
                                            <td className="p-3 text-right text-indigo-600 text-sm" colSpan="3">
                                                ₹ {(selectedSlipForView.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer & Signature */}
                            <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-4 text-[10px] text-slate-400">
                                <div>
                                    <p className="font-bold text-slate-500 dark:text-slate-400">Krishna Engineering Works [SEAL]</p>
                                    <p>System Generated Monthly Salary Slip</p>
                                </div>
                                <button
                                    onClick={() => {
                                        handleDownloadSlip(selectedSlipForView);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition"
                                >
                                    <Download className="w-4 h-4" /> Download PDF Slip
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ATTENDANCE CALENDAR VIEW */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    {/* Controls & Metrics */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Inspect Month:</span>
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500"
                            />
                        </div>

                        {attendanceSummary && (
                            <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
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
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 gap-1 sm:gap-3 text-center mb-4">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                <div key={d} className="text-[8px] sm:text-[10px] font-black text-slate-400 tracking-widest">{d}</div>
                            ))}
                        </div>

                        {loadingTabContent ? (
                            <div className="py-20 text-center text-slate-400">
                                <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mx-auto" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1 sm:gap-3">
                                {(() => {
                                    // Align calendar starting offset (blank boxes)
                                    const firstDay = daysInMonth[0];
                                    if (!firstDay) return null;
                                    const offset = firstDay.getDay();
                                    const boxes = [];
                                    
                                    for (let i = 0; i < offset; i++) {
                                        boxes.push(<div key={`blank-${i}`} className="aspect-square bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg sm:rounded-2xl opacity-40"></div>);
                                    }

                                    daysInMonth.forEach(day => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const record = attendanceRecords.find(r => r.date === dateStr);
                                        const status = record ? record.status : '';
                                        const ui = getStatusIcon(status);

                                        boxes.push(
                                            <div 
                                                key={dateStr}
                                                className={`aspect-square p-1.5 sm:p-3 border rounded-xl sm:rounded-2xl flex flex-col justify-between items-center transition hover:shadow-md ${ui.color}`}
                                            >
                                                <span className="text-[9px] sm:text-xs font-black self-start">{day.getDate()}</span>
                                                <span className="text-xs sm:text-lg">{ui.symbol}</span>
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
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Inspect Month:</span>
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-300 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30/30 dark:bg-slate-800/30">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" /> Overtime Logging Summary
                            </h3>
                            <div className="text-[9px] font-black uppercase text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                                Total OT Yield: ₹ {otRecords.reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50/50 dark:bg-slate-800/50 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Hours Logged</th>
                                        <th className="px-6 py-4">Rate Per Hour</th>
                                        <th className="px-6 py-4">Yield (INR)</th>
                                        <th className="px-6 py-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-600 dark:text-slate-400 font-semibold">
                                    {loadingTabContent ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-slate-400">
                                                <Loader2 className="animate-spin w-6 h-6 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : otRecords.length > 0 ? otRecords.map(ot => (
                                        <tr key={ot._id} className="hover:bg-slate-50/50/50 dark:bg-slate-800/50 transition">
                                            <td className="px-6 py-5 font-bold">{ot.date}</td>
                                            <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-300">{ot.hours} hrs</td>
                                            <td className="px-6 py-5 text-slate-500 dark:text-slate-400">₹ {ot.ratePerHour}</td>
                                            <td className="px-6 py-5 text-sm font-black text-slate-800 dark:text-slate-200">₹ {ot.totalAmount?.toLocaleString()}</td>
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
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
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
                                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-slate-300" />
                                            <input 
                                                type="number" 
                                                required
                                                placeholder="e.g. 5000" 
                                                className="bg-transparent w-full outline-none text-slate-700 dark:text-slate-300 font-bold"
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
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 w-full outline-none text-slate-700 dark:text-slate-300 font-medium text-sm focus:ring-2 focus:ring-indigo-100 transition-all"
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
                                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors"
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
