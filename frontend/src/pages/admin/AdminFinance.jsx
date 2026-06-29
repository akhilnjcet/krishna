import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Loader2, 
  AlertCircle, PieChart, Activity, Download, Banknote, Edit, Check, X,
  Briefcase, Landmark, CreditCard, Wallet, Calendar, UserCheck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReportHeader from '../../components/ReportHeader';
import { generateGeneralReportPDF, generateSalaryPDF } from '../../services/pdfService';

const AdminFinance = () => {
    const [activeTab, setActiveTab] = useState('expenses'); // 'expenses', 'payroll', 'overtime'
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Expenses State
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [addingExpense, setAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'others', description: '' });

    // Roster / Global Data State
    const [staffList, setStaffList] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [payrollRecords, setPayrollRecords] = useState([]);
    const [otRecords, setOtRecords] = useState([]);

    // Month Selector for Payroll & Overtime
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`; // YYYY-MM
    });

    // Payroll Drafts Calculation State
    const [payrollDrafts, setPayrollDrafts] = useState({});
    const [generatingDrafts, setGeneratingDrafts] = useState(false);

    // Modals
    const [showEditStaffModal, setShowEditStaffModal] = useState(false);
    const [selectedStaffForEdit, setSelectedStaffForEdit] = useState(null);
    const [editStaffFinanceForm, setEditStaffFinanceForm] = useState({
        base_salary: '',
        salaryType: 'Monthly',
        overtimeRate: '',
        bonusAmount: '',
        advanceAmount: '',
        deductionAmount: '',
        upi_id: '',
        bank_name: '',
        account_number: '',
        ifsc_code: ''
    });

    const [showOtModal, setShowOtModal] = useState(false);
    const [editingOt, setEditingOt] = useState(null);
    const [otForm, setOtForm] = useState({
        staffId: '',
        date: '',
        hours: '',
        remarks: ''
    });

    // Payment Transaction States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        staffId: '',
        staffName: '',
        month: '',
        totalEarnedSalary: 0,
        salaryAlreadyPaid: 0,
        salaryAdvance: 0,
        remainingBalance: 0,
        amount: '',
        type: 'Partial',
        paymentMethod: 'Cash',
        notes: ''
    });

    const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);
    const [overpaymentForm, setOverpaymentForm] = useState({
        approvedBy: '',
        reason: ''
    });

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyStaffName, setHistoryStaffName] = useState('');
    const [historyList, setHistoryList] = useState([]);

    const handleOpenPaymentModal = (staff, record) => {
        const totalEarned = record ? (record.totalEarnedSalary || record.netSalary || 0) : (staff.base_salary || 0);
        const alreadyPaid = record ? (record.salaryAlreadyPaid || 0) : 0;
        const advancePaid = record ? (record.salaryAdvance || 0) : 0;
        const remBalance = totalEarned - alreadyPaid - advancePaid;

        setPaymentForm({
            staffId: staff._id,
            staffName: staff.name,
            month: selectedMonth,
            totalEarnedSalary: totalEarned,
            salaryAlreadyPaid: alreadyPaid,
            salaryAdvance: advancePaid,
            remainingBalance: remBalance,
            amount: remBalance > 0 ? remBalance.toString() : '0',
            type: 'Partial',
            paymentMethod: 'Cash',
            notes: ''
        });
        setShowPaymentModal(true);
    };

    const handleOpenHistoryModal = (staff, record) => {
        setHistoryStaffName(staff.name);
        setHistoryList(record && record.payments ? record.payments : []);
        setShowHistoryModal(true);
    };

    const handleDisbursePayment = async (e) => {
        if (e) e.preventDefault();
        
        const enteredAmt = parseFloat(paymentForm.amount);
        if (isNaN(enteredAmt) || enteredAmt <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        // Check for overpayment
        if (enteredAmt > paymentForm.remainingBalance) {
            setShowOverpaymentWarning(true);
            return;
        }

        await submitPaymentTransaction(false);
    };

    const submitPaymentTransaction = async (isOverpayment) => {
        setActionLoading(true);
        try {
            const payload = {
                staffId: paymentForm.staffId,
                month: paymentForm.month,
                amount: parseFloat(paymentForm.amount),
                type: isOverpayment ? 'Overpayment' : paymentForm.type,
                paymentMethod: paymentForm.paymentMethod,
                notes: paymentForm.notes,
                exceededAllowed: isOverpayment,
                approvedBy: isOverpayment ? overpaymentForm.approvedBy : undefined,
                reason: isOverpayment ? overpaymentForm.reason : undefined
            };

            await api.post('/payroll/payment-transaction', payload);
            alert("Payment transaction recorded successfully.");
            
            setShowPaymentModal(false);
            setShowOverpaymentWarning(false);
            setOverpaymentForm({ approvedBy: '', reason: '' });
            await fetchAllData();
        } catch (err) {
            console.error("Payment failed", err);
            alert(err.response?.data?.message || "Failed to disburse payment.");
        } finally {
            setActionLoading(false);
        }
    };

    // Fetch Global Roster, Attendance, Payroll, and Overtime
    const fetchGlobalData = useCallback(async () => {
        try {
            const [staffRes, attendanceRes, payrollRes, otRes] = await Promise.all([
                api.get('/staff'),
                api.get(`/daily-attendance?month=${selectedMonth}`),
                api.get(`/payroll?month=${selectedMonth}`),
                api.get(`/overtime?month=${selectedMonth}`)
            ]);
            setStaffList(Array.isArray(staffRes.data) ? staffRes.data : []);
            setAttendanceList(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
            setPayrollRecords(Array.isArray(payrollRes.data) ? payrollRes.data : []);
            setOtRecords(Array.isArray(otRes.data) ? otRes.data : []);
        } catch (err) {
            console.error("Failed to fetch finance context", err);
        }
    }, [selectedMonth]);

    // Fetch Expenses Ledger
    const fetchExpenses = async () => {
        try {
            const [summaryRes, expensesRes] = await Promise.all([
                api.get('/finance/admin-overview'),
                api.get('/finance/expenses')
            ]);
            setSummary(summaryRes.data);
            setExpenses(expensesRes.data);
        } catch (err) {
            console.error('Expenses ledger sync failure:', err);
        }
    };

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            fetchExpenses(),
            fetchGlobalData()
        ]);
        setLoading(false);
    }, [fetchGlobalData]);

    useEffect(() => {
        fetchAllData();
    }, [selectedMonth, fetchAllData]);

    // Add Expense Action
    const handleAddExpense = async (e) => {
        e.preventDefault();
        setAddingExpense(true);
        try {
            await api.post('/finance/expenses', newExpense);
            setNewExpense({ title: '', amount: '', category: 'others', description: '' });
            await fetchExpenses();
        } catch (err) {
            console.error(err);
            alert("Administrative Error: Budget synchronization refused.");
        } finally {
            setAddingExpense(false);
        }
    };

    // Calculate Drafts for Roster
    const handleGenerateDrafts = async () => {
        setGeneratingDrafts(true);
        const drafts = {};
        try {
            // Fetch drafts sequentially or parallelly
            await Promise.all(staffList.map(async (staff) => {
                try {
                    const res = await api.get(`/payroll/draft?staffId=${staff._id}&month=${selectedMonth}`);
                    drafts[staff._id] = res.data;
                } catch (e) {
                    console.warn(`Failed to generate draft for ${staff.name}`, e);
                }
            }));
            setPayrollDrafts(drafts);
            alert("Payroll drafts loaded successfully for the roster.");
        } catch (err) {
            console.error(err);
            alert("Failed to compile payroll drafts.");
        } finally {
            setGeneratingDrafts(false);
        }
    };

    // Save/Lock payroll draft
    const handleSavePayroll = async (draft) => {
        setActionLoading(true);
        try {
            await api.post('/payroll', {
                staffId: draft.staffId,
                month: draft.month,
                baseSalary: draft.baseSalary,
                salaryType: draft.salaryType,
                totalWorkingDays: draft.totalWorkingDays,
                presentDays: draft.presentDays,
                absentDays: draft.absentDays,
                halfDays: draft.halfDays,
                leaveDays: draft.leaveDays,
                holidays: draft.holidays,
                overtimeHours: draft.overtimeHours,
                overtimeEarnings: draft.overtimeEarnings,
                bonus: draft.bonus,
                deductions: draft.deductions,
                advanceRecovery: draft.advanceRecovery,
                netSalary: draft.netSalary
            });
            alert("Payroll successfully locked and recorded.");
            // Refresh payroll records
            const payrollRes = await api.get(`/payroll?month=${selectedMonth}`);
            setPayrollRecords(Array.isArray(payrollRes.data) ? payrollRes.data : []);
        } catch (err) {
            console.error(err);
            alert("Failed to lock payroll record.");
        } finally {
            setActionLoading(false);
        }
    };

    // Disburse payroll (toggle status)
    const handleTogglePaymentStatus = async (recordId, currentStatus, netSalary, staffName, staffIdNum) => {
        const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
        if (!window.confirm(`Mark salary of ${staffName} as ${nextStatus.toUpperCase()}?`)) return;
        
        setActionLoading(true);
        try {
            await api.put(`/payroll/${recordId}/payment`, { status: nextStatus });
            
            // If marking paid, inject into Expense Ledger automatically
            if (nextStatus === 'paid') {
                await api.post('/finance/expenses', {
                    title: `Salary Disburse: ${staffName} (${staffIdNum})`,
                    amount: netSalary,
                    category: 'staff',
                    description: `Salary disbursement for ${staffName} for cycle ${selectedMonth}`
                });
            }
            
            alert(`Payment marked as ${nextStatus.toUpperCase()}. Ledger updated.`);
            // Refresh all data
            await fetchAllData();
        } catch (err) {
            console.error(err);
            alert("Failed to update payment status.");
        } finally {
            setActionLoading(false);
        }
    };

    // Submit modifier/financial profile update
    const handleUpdateStaffFinance = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.put(`/staff/${selectedStaffForEdit._id}`, editStaffFinanceForm);
            alert("Staff financial profile updated successfully.");
            setShowEditStaffModal(false);
            setSelectedStaffForEdit(null);
            // Refresh everything and drafts
            await fetchGlobalData();
            if (Object.keys(payrollDrafts).length > 0) {
                handleGenerateDrafts();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update staff financials.");
        } finally {
            setActionLoading(false);
        }
    };

    // Submit Log Overtime Entry
    const handleOtSubmit = async (e) => {
        e.preventDefault();
        
        // Validation: Verify if staff is marked "Present" or "Half Day" on the selected date.
        const attendanceOnDate = attendanceList.find(a => {
            const aStaffId = a.staffId?._id || a.staffId;
            return aStaffId === otForm.staffId && a.date === otForm.date;
        });

        if (!attendanceOnDate || !['Present', 'Half Day'].includes(attendanceOnDate.status)) {
            alert("Overtime Rule Violation: Overtime hours can only be logged on dates when the employee is marked as PRESENT or HALF DAY.");
            return;
        }

        setActionLoading(true);
        try {
            if (editingOt) {
                await api.put(`/overtime/${editingOt._id}`, {
                    hours: parseFloat(otForm.hours),
                    remarks: otForm.remarks
                });
                alert("Overtime entry updated successfully.");
            } else {
                await api.post('/overtime', otForm);
                alert("Overtime entry logged successfully.");
            }
            
            setShowOtModal(false);
            setEditingOt(null);
            setOtForm({ staffId: '', date: '', hours: '', remarks: '' });
            await fetchGlobalData();
            // Recalculate drafts if loaded
            if (Object.keys(payrollDrafts).length > 0) {
                handleGenerateDrafts();
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to save overtime entry.");
        } finally {
            setActionLoading(false);
        }
    };

    // Delete Overtime
    const handleOtDelete = async (id) => {
        if (!window.confirm("Remove this Overtime log?")) return;
        setActionLoading(true);
        try {
            await api.delete(`/overtime/${id}`);
            alert("Overtime entry removed.");
            await fetchGlobalData();
            if (Object.keys(payrollDrafts).length > 0) {
                handleGenerateDrafts();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to delete overtime entry.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Auditing National Budget Registry...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 font-sans bg-slate-50 min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Financial Intelligence & Payroll</h1>
                    <p className="text-slate-500 font-medium">Log expenditures, process monthly staff rosters, lock salary disbursements, and administer overtime registries.</p>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Disbursement Cycle</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold text-slate-700 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'expenses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    📈 Expense Ledger
                </button>
                <button 
                    onClick={() => setActiveTab('payroll')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'payroll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    💰 Salary & Payroll Manager
                </button>
                <button 
                    onClick={() => setActiveTab('overtime')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'overtime' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    ⏱️ Overtime Registry
                </button>
            </div>

            {/* TAB 1: EXPENSES LEDGER */}
            {activeTab === 'expenses' && (
                <div className="space-y-8">
                    {/* FINANCIAL OVERVIEW GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-slate-900 border-b-8 border-indigo-500 p-8 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Authenticated Income</p>
                            <h2 className="text-4xl font-black italic">₹ {summary?.totalIncome?.toLocaleString() || 0}</h2>
                            <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase tracking-widest leading-none">Net Revenue from Paid Units</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                            <TrendingDown className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-rose-500 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 mb-2">Total Expenditure</p>
                            <h2 className="text-4xl font-black italic text-slate-900">₹ {summary?.totalExpense?.toLocaleString() || 0}</h2>
                            <div className="mt-4 flex gap-4">
                                <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded italic uppercase">Salaries: {summary?.expenseBreakdown?.staff?.toLocaleString() || 0}</span>
                                <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded italic uppercase">Ops: {summary?.expenseBreakdown?.others?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                        <div className="bg-indigo-600 border-b-8 border-white p-8 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Liquid Profit</p>
                            <h2 className="text-4xl font-black italic">₹ {summary?.netProfit?.toLocaleString() || 0}</h2>
                            <p className="text-[9px] font-bold text-indigo-300 mt-4 uppercase tracking-widest leading-none">Net Yield AFTER Ops Deductions</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* EXPENSE INJECTION PORT */}
                        <div className="lg:col-span-5 bg-white border border-slate-200 p-8 rounded-[3rem] shadow-2xl h-fit">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3 mb-6">
                                <Plus className="text-indigo-600" /> Log Operational Expense
                            </h3>
                            
                            <form onSubmit={handleAddExpense} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction Title</label>
                                    <input 
                                        required
                                        value={newExpense.title}
                                        onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                                        placeholder="e.g. Structural Steel Order"
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Budget Value (₹)</label>
                                    <input 
                                        required
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Category Identifier</label>
                                    <select 
                                        value={newExpense.category}
                                        onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none uppercase text-xs tracking-wider"
                                    >
                                        <option value="material">Material Procurement</option>
                                        <option value="fuel">Fuel / Logistics</option>
                                        <option value="machinery">Machinery Maint.</option>
                                        <option value="utilities">Utilities & R&D</option>
                                        <option value="others">Other Direct Costs</option>
                                    </select>
                                </div>
                                <button 
                                    disabled={addingExpense}
                                    className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                >
                                    {addingExpense ? <Loader2 className="animate-spin w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                    Commit Expense entry →
                                </button>
                            </form>
                        </div>

                        {/* EXPENSE LOGS */}
                        <div className="lg:col-span-7 bg-white border border-slate-200 p-8 rounded-[3rem] shadow-2xl flex flex-col">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3 mb-6">
                                <PieChart className="text-indigo-600" /> Expenditure Audit Log
                            </h3>
                            
                            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
                                {expenses.length === 0 ? (
                                    <p className="text-center text-slate-400 py-10 font-bold">No expenditures logged yet.</p>
                                ) : expenses.map((exp, i) => (
                                    <div key={exp._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 transition flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm uppercase text-[9px]">
                                                {exp.category.slice(0, 3)}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-slate-950 text-sm uppercase">{exp.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(exp.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-rose-500 italic text-sm">₹ {exp.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SALARY & PAYROLL MANAGER */}
            {activeTab === 'payroll' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-950">Staff Payroll Registry</h3>
                            <p className="text-xs text-slate-400 font-medium">Verify draft sheets, configure modifer fields, lock salaries, and download professional salary slips.</p>
                        </div>
                        <button 
                            onClick={handleGenerateDrafts}
                            disabled={generatingDrafts}
                            className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 active:scale-95 transition disabled:opacity-50"
                        >
                            {generatingDrafts ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                            Generate / Refresh Monthly Drafts
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs min-w-[1200px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-5 font-bold text-slate-600">Employee Details</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Type / Base</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Total Earned</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Already Paid</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Salary Advance</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Remaining Balance</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Outstanding</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Status</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {staffList.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">No active staff roster loaded.</td>
                                        </tr>
                                    ) : staffList.map(staff => {
                                        const draft = payrollDrafts[staff._id];
                                        const locked = payrollRecords.find(p => p.staffId?._id === staff._id || p.staffId === staff._id);
                                        const record = locked || draft;
                                        
                                        return (
                                            <tr key={staff._id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-5">
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 text-sm leading-tight">{staff.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{staff.staff_id} • {staff.designation}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div>
                                                        <span className="font-bold text-slate-700">{staff.salaryType || 'Monthly'}</span>
                                                        <p className="font-bold text-indigo-600 mt-0.5">₹ {staff.base_salary?.toLocaleString()}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-slate-900">
                                                    ₹ {(record?.totalEarnedSalary ?? record?.netSalary ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 font-semibold text-slate-755">
                                                    ₹ {(record?.salaryAlreadyPaid ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 font-semibold text-slate-755">
                                                    ₹ {(record?.salaryAdvance ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 font-black text-indigo-600">
                                                    ₹ {(record?.remainingBalance ?? record?.netSalary ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 font-bold text-rose-600">
                                                    ₹ {(record?.outstandingAmount ?? 0).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] ${
                                                        record?.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                                                        record?.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {record?.paymentStatus ?? 'DRAFT'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Edit Parameters */}
                                                        <button 
                                                            title="Edit Modifiers / Salary Details"
                                                            onClick={() => {
                                                                setSelectedStaffForEdit(staff);
                                                                setEditStaffFinanceForm({
                                                                    base_salary: staff.base_salary || 0,
                                                                    salaryType: staff.salaryType || 'Monthly',
                                                                    overtimeRate: staff.overtimeRate || 0,
                                                                    bonusAmount: staff.bonusAmount || 0,
                                                                    advanceAmount: staff.advanceAmount || 0,
                                                                    deductionAmount: staff.deductionAmount || 0,
                                                                    upi_id: staff.upi_id || '',
                                                                    bank_name: staff.bank_name || '',
                                                                    account_number: staff.account_number || '',
                                                                    ifsc_code: staff.ifsc_code || ''
                                                                });
                                                                setShowEditStaffModal(true);
                                                            }}
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>

                                                        {/* Lock Sheet (for drafts) */}
                                                        {draft && !locked && (
                                                            <button 
                                                                title="Lock Payroll Record"
                                                                disabled={actionLoading}
                                                                onClick={() => handleSavePayroll(draft)}
                                                                className="px-3 py-2 bg-slate-900 text-white font-bold hover:bg-black rounded-lg transition"
                                                            >
                                                                Lock
                                                            </button>
                                                        )}

                                                        {/* Disburse Payment / Advance */}
                                                        <button 
                                                            title="Disburse Payment or Advance"
                                                            onClick={() => handleOpenPaymentModal(staff, record)}
                                                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-755 hover:bg-indigo-700 text-white rounded-lg font-bold transition"
                                                        >
                                                            Disburse
                                                        </button>

                                                        {/* View History */}
                                                        <button 
                                                            title="View Payment History"
                                                            onClick={() => handleOpenHistoryModal(staff, record)}
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                        </button>

                                                        {/* Download slip */}
                                                        {locked && (
                                                            <button 
                                                                title="Download salary slip"
                                                                onClick={() => generateSalaryPDF(locked, staff)}
                                                                className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
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

            {/* TAB 3: OVERTIME REGISTRY */}
            {activeTab === 'overtime' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-950">Overtime Logbook</h3>
                            <p className="text-xs text-slate-400 font-medium">Log staff overtime hours, edit remarks, and verify historical work cycles.</p>
                        </div>
                        <button 
                            onClick={() => {
                                setEditingOt(null);
                                setOtForm({ staffId: '', date: '', hours: '', remarks: '' });
                                setShowOtModal(true);
                            }}
                            className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
                        >
                            <Plus className="w-4 h-4" /> Add OT Entry
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-5 font-bold text-slate-600">Employee Details</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Log Date</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Hours Logged</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Rate / Hour</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Total Yield</th>
                                        <th className="px-6 py-5 font-bold text-slate-600">Remarks</th>
                                        <th className="px-6 py-5 font-bold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {otRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">No overtime records found for this cycle.</td>
                                        </tr>
                                    ) : otRecords.map(ot => {
                                        const staff = ot.staffId || {};
                                        return (
                                            <tr key={ot._id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-5">
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 text-sm leading-tight">{staff.name || 'Unknown'}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{staff.staff_id || 'N/A'} • {staff.designation || 'Staff'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 font-bold text-slate-600">{ot.date}</td>
                                                <td className="px-6 py-5 font-bold text-slate-700">{ot.hours} hrs</td>
                                                <td className="px-6 py-5 font-semibold text-slate-500">₹ {ot.ratePerHour || staff.overtimeRate || 0}</td>
                                                <td className="px-6 py-5 font-black text-slate-900 text-sm">₹ {ot.totalAmount?.toLocaleString()}</td>
                                                <td className="px-6 py-5 font-medium text-slate-500 max-w-xs truncate" title={ot.remarks}>{ot.remarks || 'Regular overtime'}</td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingOt(ot);
                                                                setOtForm({
                                                                    staffId: staff._id || ot.staffId,
                                                                    date: ot.date,
                                                                    hours: ot.hours.toString(),
                                                                    remarks: ot.remarks || ''
                                                                });
                                                                setShowOtModal(true);
                                                            }}
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOtDelete(ot._id)}
                                                            className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
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

            {/* MODAL: EDIT STAFF FINANCIAL PARAMETERS */}
            <AnimatePresence>
                {showEditStaffModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase">Edit Financial Parameters</h3>
                                    <p className="text-xs text-slate-500 font-medium">Configure payroll base rates and recurring modifier parameters for {selectedStaffForEdit?.name}.</p>
                                </div>
                                <button onClick={() => setShowEditStaffModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleUpdateStaffFinance} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Salary Protocol</label>
                                        <select 
                                            value={editStaffFinanceForm.salaryType}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, salaryType: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        >
                                            <option value="Monthly">Monthly</option>
                                            <option value="Daily Wage">Daily Wage</option>
                                            <option value="Contract">Contract</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Base Salary Value (INR)</label>
                                        <input 
                                            type="number"
                                            value={editStaffFinanceForm.base_salary}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, base_salary: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Overtime Rate / Hour (INR)</label>
                                        <input 
                                            type="number"
                                            value={editStaffFinanceForm.overtimeRate}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, overtimeRate: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Recurring Bonus (INR)</label>
                                        <input 
                                            type="number"
                                            value={editStaffFinanceForm.bonusAmount}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, bonusAmount: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Advance Recovery (INR)</label>
                                        <input 
                                            type="number"
                                            value={editStaffFinanceForm.advanceAmount}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, advanceAmount: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Recurring Deductions (INR)</label>
                                        <input 
                                            type="number"
                                            value={editStaffFinanceForm.deductionAmount}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, deductionAmount: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>

                                    <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Bank Details for Payout Transfer</h4>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Bank UPI ID</label>
                                        <input 
                                            type="text"
                                            placeholder="name@upi"
                                            value={editStaffFinanceForm.upi_id}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, upi_id: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Bank Institution Name</label>
                                        <input 
                                            type="text"
                                            placeholder="SBI / Federal"
                                            value={editStaffFinanceForm.bank_name}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, bank_name: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Account Number</label>
                                        <input 
                                            type="text"
                                            placeholder="00000000"
                                            value={editStaffFinanceForm.account_number}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, account_number: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Bank IFSC Code</label>
                                        <input 
                                            type="text"
                                            placeholder="SBIN0000000"
                                            value={editStaffFinanceForm.ifsc_code}
                                            onChange={e => setEditStaffFinanceForm({...editStaffFinanceForm, ifsc_code: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={actionLoading}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                    Apply Financial Override
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: ADD / EDIT OVERTIME ENTRY */}
            <AnimatePresence>
                {showOtModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 uppercase">{editingOt ? 'Edit' : 'Log'} Overtime Hours</h3>
                                <button onClick={() => setShowOtModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleOtSubmit} className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Staff Employee</label>
                                        {editingOt ? (
                                            <div className="bg-slate-100 p-3.5 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                                                {editingOt.staffId?.name}
                                            </div>
                                        ) : (
                                            <select
                                                required
                                                value={otForm.staffId}
                                                onChange={e => setOtForm({...otForm, staffId: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                            >
                                                <option value="">Select Employee...</option>
                                                {staffList.map(s => (
                                                    <option key={s._id} value={s._id}>{s.name} ({s.staff_id})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Service Date</label>
                                        {editingOt ? (
                                            <div className="bg-slate-100 p-3.5 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                                                {editingOt.date}
                                            </div>
                                        ) : (
                                            <input 
                                                required
                                                type="date"
                                                value={otForm.date}
                                                onChange={e => setOtForm({...otForm, date: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Hours Worked</label>
                                        <input 
                                            required
                                            type="number"
                                            step="0.5"
                                            placeholder="e.g. 2.5"
                                            value={otForm.hours}
                                            onChange={e => setOtForm({...otForm, hours: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Remarks / Project Context</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Welding support on project #2"
                                            value={otForm.remarks}
                                            onChange={e => setOtForm({...otForm, remarks: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={actionLoading}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                    Commit Entry
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: DISBURSE SALARY PAYMENT / ADVANCE */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 uppercase">Disburse Payment</h3>
                                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleDisbursePayment} className="p-6 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                                    <p className="font-bold text-slate-500">Employee: <span className="text-slate-900 font-extrabold">{paymentForm.staffName}</span></p>
                                    <p className="font-bold text-slate-500">Cycle: <span className="text-slate-900 font-extrabold">{paymentForm.month}</span></p>
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                                        <p className="text-slate-500">Total Earned: <span className="font-extrabold text-slate-900">₹{paymentForm.totalEarnedSalary.toLocaleString()}</span></p>
                                        <p className="text-slate-500">Already Paid: <span className="font-extrabold text-slate-900">₹{paymentForm.salaryAlreadyPaid.toLocaleString()}</span></p>
                                        <p className="text-slate-500">Advance Paid: <span className="font-extrabold text-slate-900">₹{paymentForm.salaryAdvance.toLocaleString()}</span></p>
                                        <p className="text-indigo-600 font-extrabold">Remaining: <span>₹{paymentForm.remainingBalance.toLocaleString()}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Payment Type</label>
                                        <select
                                            required
                                            value={paymentForm.type}
                                            onChange={e => setPaymentForm({...paymentForm, type: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        >
                                            <option value="Partial">Partial Salary</option>
                                            <option value="Advance">Salary Advance</option>
                                            <option value="Final Settlement">Final Settlement</option>
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Payment Amount (₹)</label>
                                        <input 
                                            required
                                            type="number"
                                            value={paymentForm.amount}
                                            onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Payment Method</label>
                                        <select
                                            required
                                            value={paymentForm.paymentMethod}
                                            onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Notes / Remarks</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Paid mid-month advance"
                                            value={paymentForm.notes}
                                            onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={actionLoading}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                    Disburse Payment
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: PREVENT ACCIDENTAL OVERPAYMENT WARNING */}
            <AnimatePresence>
                {showOverpaymentWarning && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-4 border-rose-500 overflow-hidden"
                        >
                            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
                                <AlertCircle className="w-8 h-8 text-rose-600 shrink-0" />
                                <div>
                                    <h3 className="text-xl font-black text-rose-900 leading-none">Warning!</h3>
                                    <p className="text-rose-700 text-[10px] font-bold uppercase tracking-wider mt-1">Accidental Overpayment Detected</p>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                                    The entered payment amount is greater than the employee's remaining payable salary based on working hours.
                                </p>
                                
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                                    <p className="text-slate-600 font-bold">Remaining Balance: <span className="text-slate-900 font-black">₹{parseFloat(paymentForm.remainingBalance).toLocaleString()}</span></p>
                                    <p className="text-slate-600 font-bold">Entered Amount: <span className="text-rose-600 font-black">₹{parseFloat(paymentForm.amount).toLocaleString()}</span></p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Approved By (Your Name)</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="Enter admin name"
                                            value={overpaymentForm.approvedBy}
                                            onChange={e => setOverpaymentForm({...overpaymentForm, approvedBy: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Reason for Overpayment</label>
                                        <input 
                                            required
                                            type="text"
                                            placeholder="Specify approval reason"
                                            value={overpaymentForm.reason}
                                            onChange={e => setOverpaymentForm({...overpaymentForm, reason: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => setShowOverpaymentWarning(false)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 text-center"
                                    >
                                        No, Edit Amount
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={!overpaymentForm.approvedBy || !overpaymentForm.reason || actionLoading}
                                        onClick={() => submitPaymentTransaction(true)}
                                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 text-center flex items-center justify-center"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                        Yes, Continue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: VIEW PAYMENT HISTORY */}
            <AnimatePresence>
                {showHistoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">Payment Ledger History</h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{historyStaffName} • Cycle: {selectedMonth}</p>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                {historyList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-bold">
                                        No transaction logs recorded for this payroll cycle.
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-4 py-3 font-bold text-slate-600">Date & Time</th>
                                                <th className="px-4 py-3 font-bold text-slate-600">Type</th>
                                                <th className="px-4 py-3 font-bold text-slate-600">Method</th>
                                                <th className="px-4 py-3 font-bold text-slate-600">Amount</th>
                                                <th className="px-4 py-3 font-bold text-slate-600">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyList.map((tx, idx) => (
                                                <tr key={tx._id || idx} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-4 py-3 font-medium text-slate-500">
                                                        {new Date(tx.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                                                            tx.type === 'Advance' ? 'bg-amber-50 text-amber-700' :
                                                            tx.type === 'Overpayment' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                                                        }`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-600">{tx.paymentMethod}</td>
                                                    <td className="px-4 py-3 font-extrabold text-slate-900">₹{tx.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        <p>{tx.notes || '-'}</p>
                                                        {tx.exceededAllowed && (
                                                            <div className="mt-1 bg-rose-50 text-rose-700 p-1.5 rounded border border-rose-100 text-[9px] font-semibold">
                                                                Overpayment Approved By: {tx.approvedBy}<br/>
                                                                Reason: {tx.reason}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AdminFinance;
