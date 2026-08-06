import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import FaceCapture from '../../components/FaceCapture';
import StaffIdCardModal from '../../components/StaffIdCardModal';
import { 
  Users, UserPlus, Search, Filter, Mail, Phone, Briefcase, 
  Trash2, Edit, Camera, X, Check, Loader2, AlertCircle, ChevronRight,
  Banknote, BadgeIndianRupee, Download, CreditCard
} from 'lucide-react';
import { generateGeneralReportPDF } from '../../services/pdfService';
import { motion, AnimatePresence } from 'framer-motion';

const AdminStaff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showIdCardModal, setShowIdCardModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [attendanceSummary, setAttendanceSummary] = useState({ totalMinutes: 0, shifts: 0, estimatedSalary: 0 });
    const [payAdjustment, setPayAdjustment] = useState(0); 

    const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);
    const [overpaymentForm, setOverpaymentForm] = useState({ approvedBy: '', reason: '' });
    const [paymentFormType, setPaymentFormType] = useState('Partial');
    const [paymentFormMethod, setPaymentFormMethod] = useState('Cash');
    const [paymentFormNotes, setPaymentFormNotes] = useState('');

    const handleDownloadRoster = () => {
        if (!staff || staff.length === 0) return alert("No staff data to export.");
        const columns = ['Emp ID', 'Full Name', 'Department', 'Designation', 'Contact'];
        const data = staff.map(s => [
            s.staff_id,
            s.name.toUpperCase(),
            s.department,
            s.designation,
            s.phone
        ]);
        generateGeneralReportPDF(data, 'Enterprise Resource Report', columns);
    };

    const [formData, setFormData] = useState({
        staff_id: '',
        name: '',
        phone: '',
        email: '',
        department: '',
        designation: '',
        username: '',
        password: '',
        role: 'staff',
        status: 'active',
        upi_id: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        base_salary: '',
        joiningDate: new Date().toISOString().split('T')[0],
        address: '',
        emergencyContact: '',
        salaryType: 'Monthly',
        overtimeRate: 0,
        bonusAmount: 0,
        advanceAmount: 0,
        deductionAmount: 0
    });

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/staff?search=${searchQuery}&department=${filterDept}`);
            setStaff(res.data);
        } catch (err) {
            console.error("Failed to fetch staff data:", err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterDept]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);


    const handleAddStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/staff', formData);
            fetchStaff();
            setShowAddModal(false);
            resetForm();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add staff.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/staff/${selectedStaff._id}`, formData);
            fetchStaff();
            setShowEditModal(false);
            resetForm();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update staff.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            staff_id: '', name: '', phone: '', email: '', 
            department: '', designation: '', username: '', password: '', 
            role: 'staff', status: 'active',
            upi_id: '', bank_name: '', account_number: '', 
            ifsc_code: '', base_salary: '',
            joiningDate: new Date().toISOString().split('T')[0],
            address: '', emergencyContact: '', salaryType: 'Monthly',
            overtimeRate: 0, bonusAmount: 0, advanceAmount: 0, deductionAmount: 0
        });
        setSelectedStaff(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this staff member? All related data will be lost.")) return;
        try {
            await api.delete(`/staff/${id}`);
            fetchStaff();
        } catch (err) {
            console.error(err);
            alert("Failed to delete staff.");
        }
    };

    const handleFaceRegister = async (descriptor) => {
        setLoading(true);
        try {
            await api.post(`/staff/${selectedStaff._id}/register-face`, { descriptor });
            alert("Face registered successfully!");
            setShowFaceModal(false);
            fetchStaff();
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to register face.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFace = async (id) => {
        if (!window.confirm("Are you sure you want to remove the registered face?")) return;
        try {
            await api.delete(`/staff/${id}/face`);
            alert("Face data removed.");
            fetchStaff();
        } catch (err) {
            console.error(err);
            alert("Failed to remove face data.");
        }
    };

    const fetchAttendanceStats = async (staffId, baseSalary) => {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const currentMonthStr = `${year}-${month}`;

            const res = await api.get(`/payroll/draft?staffId=${staffId}&month=${currentMonthStr}`);
            const draft = res.data;

            setAttendanceSummary({
                shifts: draft.presentDays + draft.halfDays,
                totalMinutes: draft.overtimeHours * 60,
                estimatedSalary: draft.netSalary,
                totalEarnedSalary: draft.totalEarnedSalary || draft.netSalary || 0,
                salaryAlreadyPaid: draft.salaryAlreadyPaid || 0,
                salaryAdvance: draft.salaryAdvance || 0,
                remainingBalance: draft.remainingBalance !== undefined ? draft.remainingBalance : (draft.netSalary || 0),
                outstandingAmount: draft.outstandingAmount || 0
            });

            const rem = draft.remainingBalance !== undefined ? draft.remainingBalance : (draft.netSalary || 0);
            setPayAmount(rem > 0 ? rem.toString() : '0');
            setPayAdjustment(0);
            setPaymentFormType('Partial');
            setPaymentFormMethod('Cash');
            setPaymentFormNotes('');
        } catch (err) {
            console.error("Stats Error:", err);
        }
    };

    const handleConfirmPayout = async () => {
        const finalAmount = parseFloat(payAmount) + parseFloat(payAdjustment || 0);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            return alert("Please enter a valid amount.");
        }

        // Check for overpayment
        if (finalAmount > attendanceSummary.remainingBalance) {
            setShowOverpaymentWarning(true);
            return;
        }

        await submitPaymentTransaction(false, finalAmount);
    };

    const submitPaymentTransaction = async (isOverpayment, amountToPay) => {
        setLoading(true);
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const currentMonthStr = `${year}-${month}`;

            const payload = {
                staffId: selectedStaff._id,
                month: currentMonthStr,
                amount: amountToPay,
                type: isOverpayment ? 'Overpayment' : paymentFormType,
                paymentMethod: paymentFormMethod,
                notes: paymentFormNotes,
                exceededAllowed: isOverpayment,
                approvedBy: isOverpayment ? overpaymentForm.approvedBy : undefined,
                reason: isOverpayment ? overpaymentForm.reason : undefined
            };

            await api.post('/payroll/payment-transaction', payload);
            alert("Salary Payout Logged successfully!");
            
            setShowPayModal(false);
            setShowOverpaymentWarning(false);
            setOverpaymentForm({ approvedBy: '', reason: '' });
            setPayAmount('');
            setPayAdjustment(0);
            setPaymentFormNotes('');
            fetchStaff();
        } catch (err) {
            console.error("Payout error:", err);
            alert(err.response?.data?.message || "Failed to disburse payment.");
        } finally {
            setLoading(false);
        }
    };

    const safeStaff = Array.isArray(staff) ? staff : [];
    const departments = [...new Set(safeStaff.map(s => s?.department || 'General'))];

    return (
        <div className="mobile-p-reset space-y-6 md:space-y-8 bg-slate-50 min-h-screen force-full-width">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
                        Staff Management
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest opacity-60">Operations Registry & Biometrics</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadRoster}
                        className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition active:scale-95 flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" /> Export Staff List
                    </button>
                    <button 
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <UserPlus className="w-5 h-5" /> Add New Staff
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total', value: safeStaff.length, color: 'indigo' },
                    { label: 'Active', value: safeStaff.filter(s => s?.status === 'active').length, color: 'emerald' },
                    { label: 'Face ID', value: safeStaff.filter(s => s?.faceDescriptor && Array.isArray(s.faceDescriptor) && s.faceDescriptor.length > 0).length, color: 'amber' },
                    { label: 'Dept', value: departments.length, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm text-left">
                        <p className="text-slate-500 font-black text-[9px] md:text-xs uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-xl md:text-3xl font-black text-${stat.color}-600 mt-1`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name, ID or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    />
                </div>
                <div className="md:w-64 relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select 
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mobile-table-scroll">
                <div className="min-w-[800px] md:min-w-full">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                                <th className="px-6 py-5 font-bold text-slate-600">ID / Name</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Department / Role</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Contact</th>
                                <th className="px-6 py-5 font-bold text-slate-600 text-center">Face Data</th>
                                <th className="px-6 py-5 font-bold text-slate-600">Status</th>
                                <th className="px-6 py-5 font-bold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-500 font-medium font-mono">Synchronizing staff data...</p>
                                    </td>
                                </tr>
                            ) : safeStaff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        No staff members found matching your search criteria.
                                    </td>
                                </tr>
                            ) : safeStaff.map((member) => (
                                <tr key={member._id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-mono text-indigo-600 font-bold">{member.staff_id}</p>
                                            <p className="text-lg font-bold text-slate-900 capitalize leading-tight mt-1">{member.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                                <Briefcase className="w-4 h-4 text-slate-400" />
                                                {member.designation}
                                            </span>
                                            <span className="text-sm text-slate-500">{member.department}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2 text-slate-600 group-hover:text-indigo-600 transition-colors">
                                                <Mail className="w-3.5 h-3.5" /> {member.email}
                                            </span>
                                            <span className="flex items-center gap-2 text-slate-600">
                                                <Phone className="w-3.5 h-3.5" /> {member.phone}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {member.faceDescriptor?.length > 0 ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-100 mx-auto w-fit">
                                                <Check className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-tighter">Registered</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-1.5 px-3 rounded-full border border-amber-100 mx-auto w-fit">
                                                <Camera className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-tighter">Pending</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                            member.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                title="View Staff ID Card"
                                                onClick={() => { setSelectedStaff(member); setShowIdCardModal(true); }}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <CreditCard className="w-5 h-5" />
                                            </button>
                                            <button 
                                                title="Register Face"
                                                onClick={() => { setSelectedStaff(member); setShowFaceModal(true); }}
                                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>

                                            <button 
                                                title="Calculate & Payout"
                                                onClick={() => { 
                                                    setSelectedStaff(member); 
                                                    fetchAttendanceStats(member._id, member.base_salary);
                                                    setShowPayModal(true); 
                                                }}
                                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Banknote className="w-5 h-5" />
                                            </button>
                                            {member.faceDescriptor?.length > 0 && (
                                                <button 
                                                    title="Remove Face Data"
                                                    onClick={() => handleDeleteFace(member._id)}
                                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button 
                                                title="Edit"
                                                onClick={() => { 
                                                    setSelectedStaff(member); 
                                                    setFormData({
                                                        ...member,
                                                        password: '',
                                                        upi_id: member.upi_id || '',
                                                        bank_name: member.bank_name || '',
                                                        account_number: member.account_number || '',
                                                        ifsc_code: member.ifsc_code || '',
                                                        base_salary: member.base_salary || '',
                                                        joiningDate: member.joiningDate ? new Date(member.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                                        address: member.address || '',
                                                        emergencyContact: member.emergencyContact || '',
                                                        salaryType: member.salaryType || 'Monthly',
                                                        overtimeRate: member.overtimeRate || 0,
                                                        bonusAmount: member.bonusAmount || 0,
                                                        advanceAmount: member.advanceAmount || 0,
                                                        deductionAmount: member.deductionAmount || 0
                                                    });
                                                    setShowEditModal(true); 
                                                }}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button 
                                                title="Delete"
                                                onClick={() => handleDelete(member._id)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{showEditModal ? 'Update' : 'Register'} Staff</h2>
                                    <p className="text-slate-500 font-medium">Capture profile details for the system.</p>
                                </div>
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="p-2 hover:bg-slate-200 rounded-full transition">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                            <form onSubmit={showEditModal ? handleEditStaff : handleAddStaff} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Staff ID*</label>
                                    <input required type="text" placeholder="STF-001" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.staff_id} onChange={e => setFormData({...formData, staff_id: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Name*</label>
                                    <input required type="text" placeholder="John Doe" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Email*</label>
                                    <input required type="email" placeholder="john@example.com" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Phone*</label>
                                    <input required type="tel" placeholder="+91 99999 99999" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Department*</label>
                                    <input required type="text" placeholder="Engineering" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Designation*</label>
                                    <input required type="text" placeholder="Field Engineer" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Username*</label>
                                    <input required type="text" placeholder="johndoe.user" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Access Role*</label>
                                    <select 
                                        required 
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-bold" 
                                        value={formData.role} 
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                    >
                                        <option value="staff">Staff Operator</option>
                                        <option value="customer">Customer / Project Owner</option>
                                    </select>
                                </div>
                                {showEditModal && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Account Status*</label>
                                        <select 
                                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-bold" 
                                            value={formData.status} 
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive / Suspended</option>
                                        </select>
                                    </div>
                                )}

                                {/* --- Profile Parameters Section --- */}
                                <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-4">
                                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Profile Parameters</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Joining Date</label>
                                    <input type="date" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-bold" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Emergency Contact</label>
                                    <input type="text" placeholder="Contact Name & Phone" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})} />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Address</label>
                                    <textarea rows={2} placeholder="Full Residing Address..." className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </div>

                                {/* --- Financial Data Section --- */}
                                <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-4">
                                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Financial Protocol Registry</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Salary Type</label>
                                    <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition font-bold" value={formData.salaryType} onChange={e => setFormData({...formData, salaryType: e.target.value})}>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Daily Wage">Daily Wage</option>
                                        <option value="Contract">Contract</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Base Salary (INR)</label>
                                    <input type="number" placeholder="25000" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Overtime Rate Per Hour (INR)</label>
                                    <input type="number" placeholder="150" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.overtimeRate} onChange={e => setFormData({...formData, overtimeRate: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Bonus Amount (INR)</label>
                                    <input type="number" placeholder="0" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.bonusAmount} onChange={e => setFormData({...formData, bonusAmount: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Advance Amount (INR)</label>
                                    <input type="number" placeholder="0" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Deduction Amount (INR)</label>
                                    <input type="number" placeholder="0" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.deductionAmount} onChange={e => setFormData({...formData, deductionAmount: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">UPI ID (for Direct Pay)</label>
                                    <input type="text" placeholder="name@upi" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.upi_id} onChange={e => setFormData({...formData, upi_id: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Bank Name</label>
                                    <input type="text" placeholder="SBI / HDFC / Federal" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Account Number</label>
                                    <input type="text" placeholder="00000000000" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">IFSC Code</label>
                                    <input type="text" placeholder="SBIN0000001" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.ifsc_code} onChange={e => setFormData({...formData, ifsc_code: e.target.value})} />
                                </div>

                                {!showEditModal && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Secure Access Key [Password]*</label>
                                        <input required type="password" placeholder="••••••••" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    </div>
                                )}
                                <div className="md:col-span-2 pt-6 flex gap-4">
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition active:scale-[0.98]">
                                        {showEditModal ? 'Apply Updates' : 'Create Staff Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showFaceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex flex-col items-center max-h-[95vh] overflow-y-auto"
                        >
                            <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6">
                                <Camera className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 text-center">Facial Biometrics</h2>
                            <p className="text-slate-500 text-center mt-2 font-medium mb-10 max-w-sm">Registering face for <span className="text-indigo-600 font-bold">{selectedStaff?.name}</span>. Ensure proper lighting.</p>
                            
                            <FaceCapture 
                                onCapture={handleFaceRegister} 
                                buttonText="Scan and Save Descriptor"
                            />
                            
                            <button 
                                onClick={() => setShowFaceModal(false)}
                                className="mt-8 text-slate-400 font-bold hover:text-slate-600 transition uppercase tracking-widest text-xs py-2"
                            >
                                Cancel Process
                            </button>
                        </motion.div>
                    </div>
                )}

                {showPayModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-10 flex flex-col my-8"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex-shrink-0 flex items-center justify-center">
                                    <BadgeIndianRupee className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="text-left text-balance">
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Salary Disburser</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">Recipient: {selectedStaff?.name}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                                    <p className="text-slate-500 font-medium">Total Earned: <span className="font-extrabold text-slate-900">₹{attendanceSummary.totalEarnedSalary?.toLocaleString()}</span></p>
                                    <p className="text-slate-500 font-medium">Already Paid: <span className="font-extrabold text-slate-900">₹{attendanceSummary.salaryAlreadyPaid?.toLocaleString()}</span></p>
                                    <p className="text-slate-500 font-medium">Advance Paid: <span className="font-extrabold text-slate-900">₹{attendanceSummary.salaryAdvance?.toLocaleString()}</span></p>
                                    <p className="text-indigo-600 font-extrabold">Remaining: <span>₹{attendanceSummary.remainingBalance?.toLocaleString()}</span></p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Shifts</p>
                                        <p className="text-lg font-black text-slate-900">{attendanceSummary.shifts}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Hours</p>
                                        <p className="text-lg font-black text-slate-900">{(attendanceSummary.totalMinutes / 60).toFixed(1)}h</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 flex flex-col items-start relative">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Payment Amount (₹)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            value={parseFloat(payAmount) + parseFloat(payAdjustment || 0)}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setPayAmount(val.toString());
                                                setPayAdjustment(0);
                                            }}
                                            className="text-3xl font-black text-slate-900 bg-transparent w-full outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-2 -ml-2"
                                        />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200 w-full flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Quick Adjust:</span>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setPayAdjustment(prev => prev - 500)}
                                                className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all text-xs"
                                            >-</button>
                                            <span className={`text-[11px] font-black min-w-[45px] text-center ${payAdjustment < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {payAdjustment > 0 ? '+' : ''}{payAdjustment}
                                            </span>
                                            <button 
                                                onClick={() => setPayAdjustment(prev => prev + 500)}
                                                className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all text-xs"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Payment Type</label>
                                        <select
                                            value={paymentFormType}
                                            onChange={e => setPaymentFormType(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none font-bold text-xs"
                                        >
                                            <option value="Partial">Partial Salary</option>
                                            <option value="Advance">Salary Advance</option>
                                            <option value="Final Settlement">Final Settlement</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Method</label>
                                        <select
                                            value={paymentFormMethod}
                                            onChange={e => setPaymentFormMethod(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none font-bold text-xs"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Notes / Remarks</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Paid mid-month advance"
                                        value={paymentFormNotes}
                                        onChange={e => setPaymentFormNotes(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none font-bold text-xs text-slate-700"
                                    />
                                </div>

                                {selectedStaff?.upi_id && paymentFormMethod === 'UPI' && (
                                    <div className="flex flex-col items-center gap-4 p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.2em] italic">Scan with GPay / PhonePe / Any UPI</p>
                                        <div className="bg-white p-3 rounded-2xl shadow-md">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${selectedStaff.upi_id}&pn=${selectedStaff.name}&am=${parseFloat(payAmount) + parseFloat(payAdjustment || 0)}&cu=INR`)}`} 
                                                alt="UPI QR Code"
                                                className="w-28 h-28"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-black text-slate-900">{selectedStaff.upi_id}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setShowPayModal(false)}
                                        className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-widest hover:bg-slate-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            const finalAmount = parseFloat(payAmount) + parseFloat(payAdjustment || 0);
                                            setPayAmount(finalAmount.toString());
                                            handleConfirmPayout();
                                        }}
                                        className="flex-[2] px-4 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-600/20 active:scale-95"
                                    >
                                        Log & Confirm ₹{parseFloat(payAmount) + parseFloat(payAdjustment || 0)}
                                    </button>
                                </div>
                            </div>
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
                                    <p className="text-slate-600 font-bold">Remaining Balance: <span className="text-slate-900 font-black">₹{parseFloat(attendanceSummary.remainingBalance || 0).toLocaleString()}</span></p>
                                    <p className="text-slate-600 font-bold">Entered Amount: <span className="text-rose-600 font-black">₹{parseFloat(payAmount).toLocaleString()}</span></p>
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
                                        disabled={!overpaymentForm.approvedBy || !overpaymentForm.reason || loading}
                                        onClick={() => submitPaymentTransaction(true, parseFloat(payAmount))}
                                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs py-4 rounded-xl transition active:scale-95 text-center flex items-center justify-center"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                        Yes, Continue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Dynamic Staff ID Card Modal */}
                {showIdCardModal && selectedStaff && (
                    <StaffIdCardModal 
                        staff={selectedStaff}
                        onClose={() => {
                            setShowIdCardModal(false);
                            setSelectedStaff(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminStaff;

