import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import FaceCapture from '../../components/FaceCapture';
import { 
  Users, UserPlus, Search, Filter, Mail, Phone, Briefcase, 
  Trash2, Edit, Camera, X, Check, Loader2, AlertCircle, ChevronRight,
  Banknote, BadgeIndianRupee, Download
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
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [attendanceSummary, setAttendanceSummary] = useState({ totalMinutes: 0, shifts: 0, estimatedSalary: 0 });
    const [payAdjustment, setPayAdjustment] = useState(0); 

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
        generateGeneralReportPDF(data, 'Enterprise Resource Roster', columns);
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
        base_salary: ''
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
            ifsc_code: '', base_salary: ''
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
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            
            // Get completed shifts (OUT logs) for the current month
            const res = await api.get(`/attendance?staff_id=${staffId}&type=OUT`);
            const logs = res.data.filter(l => l.date >= firstDay && l.date <= lastDay);
            
            const totalMinutes = logs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
            const shifts = logs.length;
            
            // Calculate Based on Base Salary (Assuming 8-hour shift standard)
            // Hourly Rate = Base Salary / 160 (assuming 20 days x 8 hours)
            const hourlyRate = (baseSalary || 0) / 160;
            const calculated = Math.round((totalMinutes / 60) * hourlyRate);

            setAttendanceSummary({ totalMinutes, shifts, estimatedSalary: calculated });
            setPayAmount(calculated.toString());
            setPayAdjustment(0);
        } catch (err) {
            console.error("Stats Error:", err);
        }
    };
    const handleConfirmPayout = async () => {
        if (!payAmount) return alert("Please enter an amount.");
        setLoading(true);
        try {
            const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // 1. Record in General Finance Ledger
            await api.post('/finance/expenses', {
                title: `Salary: ${selectedStaff.name} (${selectedStaff.staff_id})`,
                amount: parseFloat(payAmount),
                category: 'staff',
                description: `Salary disbursement for ${selectedStaff.name} via Digital Payout`
            });

            // 2. Record in Specific Staff Salary History
            await api.post('/finance/salaries', {
                staffId: selectedStaff._id,
                month: currentMonth,
                salaryAmount: parseFloat(payAmount),
                paymentStatus: 'paid'
            });

            alert("Salary Payout Logged & Staff History Updated!");
            setShowPayModal(false);
            setPayAmount('');
            fetchStaff(); // Refresh staff list
        } catch (err) {
            console.error("Payout error:", err);
            alert("Digital Payout recorded on gateway, but ledger sync failed.");
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
                        <Download className="w-5 h-5" /> Export Roster
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
                                                        base_salary: member.base_salary || ''
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

                                {/* --- Financial Data Section --- */}
                                <div className="md:col-span-2 pt-6 border-t border-slate-100 mt-4">
                                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Financial Protocol Registry</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1 uppercase tracking-wider">Base Salary (INR)</label>
                                    <input type="number" placeholder="25000" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})} />
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
                            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 flex flex-col"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex-shrink-0 flex items-center justify-center">
                                    <BadgeIndianRupee className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="text-left text-balance">
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Salary Disburser</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mt-1">Recipient: {selectedStaff?.name}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Shifts</p>
                                        <p className="text-xl font-black text-slate-900">{attendanceSummary.shifts}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Hours</p>
                                        <p className="text-xl font-black text-slate-900">{(attendanceSummary.totalMinutes / 60).toFixed(1)}h</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-start relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Calculated Salary (Auto + Adjustments)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            value={parseFloat(payAmount) + parseFloat(payAdjustment || 0)}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setPayAmount(val.toString());
                                                setPayAdjustment(0); // Reset adjustment when manually typing
                                            }}
                                            className="text-4xl font-black text-slate-900 bg-transparent w-full outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-2 -ml-2"
                                        />
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200 w-full flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Quick Adjust:</span>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setPayAdjustment(prev => prev - 500)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all"
                                            >-</button>
                                            <span className={`text-xs font-black min-w-[50px] text-center ${payAdjustment < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {payAdjustment > 0 ? '+' : ''}{payAdjustment}
                                            </span>
                                            <button 
                                                onClick={() => setPayAdjustment(prev => prev + 500)}
                                                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>

                                {selectedStaff?.upi_id ? (
                                    <div className="flex flex-col items-center gap-6 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] italic">Scan with GPay / PhonePe / Any UPI</p>
                                        <div className="bg-white p-4 rounded-3xl shadow-lg">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${selectedStaff.upi_id}&pn=${selectedStaff.name}&am=${parseFloat(payAmount) + parseFloat(payAdjustment || 0)}&cu=INR`)}`} 
                                                alt="UPI QR Code"
                                                className="w-36 h-36"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-black text-slate-900">{selectedStaff.upi_id}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">{selectedStaff.bank_name || 'REGISTERED BANK PORTAL'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center text-center gap-4">
                                        <AlertCircle className="w-10 h-10 text-amber-500" />
                                        <p className="text-sm font-bold text-amber-800">No UPI Registered</p>
                                        <div className="text-xs font-medium text-amber-600"> {selectedStaff?.account_number ? `Acc: X-${selectedStaff.account_number.slice(-4)}` : 'No Bank Data'}</div>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={() => setShowPayModal(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            const finalAmount = parseFloat(payAmount) + parseFloat(payAdjustment || 0);
                                            setPayAmount(finalAmount.toString());
                                            handleConfirmPayout();
                                        }}
                                        className="flex-[2] px-6 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition shadow-xl shadow-emerald-600/20 active:scale-95"
                                    >
                                        Log & Confirm ₹{parseFloat(payAmount) + parseFloat(payAdjustment || 0)}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminStaff;
