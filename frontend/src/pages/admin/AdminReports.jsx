import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { generateGeneralReportPDF } from '../../services/pdfService';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Filter, Calendar, Users, FileBarChart, Loader2, Database } from 'lucide-react';

const AdminReports = () => {
    const [reportType, setReportType] = useState('attendance'); // 'attendance', 'payroll', 'overtime', 'project-delay', 'salary-payment', 'performance'
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`; // YYYY-MM
    });
    const [paymentStatusFilter, setPaymentStatusFilter] = useState(''); // for salary-payment report: '', 'paid', 'unpaid'
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReportData = useCallback(async () => {
        setLoading(true);
        try {
            let url = '';
            if (reportType === 'attendance') {
                url = `/analytics/reports/attendance?month=${selectedMonth}`;
            } else if (reportType === 'payroll') {
                url = `/analytics/reports/payroll?month=${selectedMonth}`;
            } else if (reportType === 'overtime') {
                url = `/analytics/reports/overtime?month=${selectedMonth}`;
            } else if (reportType === 'project-delay') {
                url = '/analytics/reports/project-delay';
            } else if (reportType === 'salary-payment') {
                url = `/analytics/reports/salary-payment?status=${paymentStatusFilter}`;
            } else if (reportType === 'performance') {
                url = '/analytics/reports/performance';
            }

            const res = await api.get(url);
            setReportData(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to load report logs", err);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    }, [reportType, selectedMonth, paymentStatusFilter]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    // Define table headers and accessors depending on report type
    const reportSchema = useMemo(() => {
        switch (reportType) {
            case 'attendance':
                return {
                    title: 'Workforce Daily Attendance',
                    columns: ['Staff Name', 'Staff ID', 'Department', 'Date', 'Status'],
                    rowMapper: (r) => [
                        r.staffId?.name || 'N/A',
                        r.staffId?.staff_id || 'N/A',
                        r.staffId?.department || 'N/A',
                        r.date || 'N/A',
                        r.status || 'N/A'
                    ]
                };
            case 'payroll':
                return {
                    title: 'Monthly Consolidated Payroll Report',
                    columns: ['Staff Details', 'Monthly Salary', 'Hourly Rate', 'Present Days', 'Worked Hours', 'Total Salary Earned', 'Approved OT', 'Bonus', 'Advance Paid', 'Deductions', 'Already Paid', 'Remaining Salary', 'Net Payable', 'Status'],
                    rowMapper: (r) => {
                        const workingDays = r.staffId?.workingDaysPerMonth || 26;
                        const workingHours = r.staffId?.standardWorkingHoursPerDay || 8;
                        const hourlyRate = parseFloat(((r.baseSalary || 0) / (workingDays * workingHours)).toFixed(2));
                        const presentDays = r.presentDays || 0;
                        const halfDays = r.halfDays || 0;
                        const totalWorkedHours = r.totalWorkedHours !== undefined ? r.totalWorkedHours : (presentDays * workingHours + halfDays * (workingHours / 2));
                        
                        return [
                            `${r.staffId?.name || 'N/A'} (${r.staffId?.staff_id || 'N/A'})`,
                            `₹${r.baseSalary || 0}`,
                            `₹${hourlyRate || 0}`,
                            `${presentDays} Days`,
                            `${totalWorkedHours?.toFixed(1)} hrs`,
                            `₹${r.totalEarnedSalary || r.calculatedBase || 0}`,
                            `₹${r.overtimeEarnings || 0}`,
                            `₹${r.bonus || 0}`,
                            `₹${r.salaryAdvance || r.advanceRecovery || 0}`,
                            `₹${r.deductions || 0}`,
                            `₹${r.salaryAlreadyPaid || 0}`,
                            `₹${r.remainingBalance || 0}`,
                            `₹${r.netSalary || 0}`,
                            (r.paymentStatus || 'unpaid').toUpperCase()
                        ];
                    }
                };
            case 'overtime':
                return {
                    title: 'Overtime Logging & Rate Ledger',
                    columns: ['Staff Name', 'Staff ID', 'Date', 'Hours Worked', 'Rate / Hour', 'Total Yield', 'Remarks'],
                    rowMapper: (r) => [
                        r.staffId?.name || 'N/A',
                        r.staffId?.staff_id || 'N/A',
                        r.date || 'N/A',
                        `${r.hours || 0} hrs`,
                        `₹${r.ratePerHour || 0}`,
                        `₹${r.totalAmount || 0}`,
                        r.remarks || '-'
                    ]
                };
            case 'project-delay':
                return {
                    title: 'Project Delay & Work Resumed Incidents',
                    columns: ['Project Name', 'Operational Status', 'Reported By', 'Incident Reason', 'Date & Time', 'Remarks'],
                    rowMapper: (r) => [
                        r.projectName || 'N/A',
                        r.status || 'N/A',
                        r.reportedBy?.name || 'N/A',
                        r.reason || 'N/A',
                        r.reportedAt ? new Date(r.reportedAt).toLocaleString() : 'N/A',
                        r.remarks || '-'
                    ]
                };
            case 'salary-payment':
                return {
                    title: 'Treasury Salary Disbursement Log',
                    columns: ['Employee Name', 'Temporal Month', 'Disbursed Amount', 'Bank Name', 'Account Number', 'Payment Status'],
                    rowMapper: (r) => [
                        r.staffId?.name || 'N/A',
                        r.month || 'N/A',
                        `₹${r.netSalary || 0}`,
                        r.staffId?.bank_name || 'N/A',
                        r.staffId?.account_number || 'N/A',
                        (r.paymentStatus || 'unpaid').toUpperCase()
                    ]
                };
            case 'performance':
                return {
                    title: 'Staff Operational Performance Indexes',
                    columns: ['Employee Name', 'Staff ID', 'Department', 'Attendance %', 'Tasks Assigned', 'Tasks Completed', 'Total OT Logged'],
                    rowMapper: (r) => [
                        r.name || 'N/A',
                        r.staffId || 'N/A',
                        r.department || 'N/A',
                        `${r.attendancePercentage || 0}%`,
                        r.totalTasks?.toString() || '0',
                        r.completedTasks?.toString() || '0',
                        `${r.totalOTHours || 0} hrs`
                    ]
                };
            default:
                return { title: 'Report', columns: [], rowMapper: () => [] };
        }
    }, [reportType]);

    // Download PDF Report
    const handleDownloadPDF = () => {
        if (reportData.length === 0) return alert("No data available to export.");
        const mappedData = reportData.map(reportSchema.rowMapper);
        generateGeneralReportPDF(mappedData, reportSchema.title, reportSchema.columns);
    };

    // Download CSV/Excel Report
    const handleDownloadCSV = () => {
        if (reportData.length === 0) return alert("No data available to export.");
        
        const headerRow = reportSchema.columns.join(',');
        const bodyRows = reportData.map(r => 
            reportSchema.rowMapper(r).map(val => {
                // escape double quotes and wrap in quotes to prevent csv delimiter issues
                const str = (val || '').toString().replace(/"/g, '""');
                return `"${str}"`;
            }).join(',')
        );

        const csvContent = [headerRow, ...bodyRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportSchema.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen font-sans">
            
            {/* Header / Config Panel */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Enterprise Business Intelligence</h1>
                        <p className="text-slate-500 font-medium">Generate custom reports, audit workforce operations, track project constraints, and export CSV/PDF datasets.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={handleDownloadCSV}
                            className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition flex items-center gap-2 active:scale-95"
                        >
                            Export Excel / CSV
                        </button>
                        <button 
                            onClick={handleDownloadPDF}
                            className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Download className="w-5 h-5" /> Download PDF Report
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Analytical Registry</label>
                        <select 
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase tracking-wider text-slate-700 focus:border-indigo-500"
                        >
                            <option value="attendance">Staff Attendance Log</option>
                            <option value="payroll">Monthly Payroll Sheet</option>
                            <option value="overtime">Overtime Rate Summary</option>
                            <option value="project-delay">Project Delay Incidents</option>
                            <option value="salary-payment">Salary Payment Log</option>
                            <option value="performance">Staff Performance index</option>
                        </select>
                    </div>

                    {['attendance', 'payroll', 'overtime'].includes(reportType) && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Temporal Cycle</label>
                            <input 
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {reportType === 'salary-payment' && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Disbursement Status</label>
                            <select 
                                value={paymentStatusFilter}
                                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase text-slate-700 focus:border-indigo-500"
                            >
                                <option value="">All Transactions</option>
                                <option value="paid">PAID ONLY</option>
                                <option value="unpaid">UNPAID / OUTSTANDING</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics (Dynamic based on Selection) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Dataset Size', value: `${reportData.length} records`, icon: Database, color: 'indigo' },
                    { label: 'Analytical Domain', value: reportSchema.title, icon: FileText, color: 'blue' },
                    { label: 'Report Integrity', value: 'Verified', icon: FileBarChart, color: 'emerald' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                        <div className={`w-12 h-12 bg-${stat.color}-50 rounded-xl flex items-center justify-center`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">{stat.label}</p>
                            <p className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Data Grid view */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        📋 Dynamic Data Grid
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100/50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {reportSchema.columns.map((col, idx) => (
                                    <th key={idx} className="p-5">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={reportSchema.columns.length || 1} className="p-20 text-center text-slate-400">
                                        <Loader2 className="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-4" />
                                        Computing analytical summary...
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={reportSchema.columns.length || 1} className="p-20 text-center text-slate-400 font-bold">
                                        No datasets found matching your parameters.
                                    </td>
                                </tr>
                            ) : reportData.map((row, rowIdx) => {
                                const mapped = reportSchema.rowMapper(row);
                                return (
                                    <tr key={rowIdx} className="hover:bg-indigo-50/30 transition-colors">
                                        {mapped.map((val, colIdx) => (
                                            <td key={colIdx} className="p-5 text-slate-700 font-semibold">{val}</td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default AdminReports;
