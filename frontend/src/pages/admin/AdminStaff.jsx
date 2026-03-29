import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FaceCapture from '../../components/FaceCapture';
import { 
  Users, UserPlus, Search, Filter, Mail, Phone, Briefcase, 
  Trash2, Edit, Camera, X, Check, Loader2, AlertCircle, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminStaff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('');

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
        status: 'active'
    });

    useEffect(() => {
        fetchStaff();
    }, [searchQuery, filterDept]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/staff?search=${searchQuery}&department=${filterDept}`);
            setStaff(res.data);
        } catch (err) {
            setError("Failed to fetch staff data.");
        } finally {
            setLoading(false);
        }
    };

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
            role: 'staff', status: 'active'
        });
        setSelectedStaff(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this staff member? All related data will be lost.")) return;
        try {
            await api.delete(`/staff/${id}`);
            fetchStaff();
        } catch (err) {
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
        if (!window.confirm("Are you sure you want to remove the registered face? The user will need to re-register to use face attendance.")) return;
        try {
            await api.delete(`/staff/${id}/face`);
            alert("Face data removed.");
            fetchStaff();
        } catch (err) {
            alert("Failed to remove face data.");
        }
    };

    const departments = [...new Set(staff.map(s => s.department))];

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                        <Users className="w-10 h-10 text-indigo-600" />
                        Staff Management
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your workforce, track attendance, and register biometrics.</p>
                </div>
                
                <button 
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                    <UserPlus className="w-5 h-5" /> Add New Staff
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Staff', value: staff.length, color: 'indigo' },
                    { label: 'Active', value: staff.filter(s => s.status === 'active').length, color: 'emerald' },
                    { label: 'Face Registered', value: staff.filter(s => s.faceDescriptor?.length > 0).length, color: 'amber' },
                    { label: 'Departments', value: departments.length, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-3xl font-black text-${stat.color}-600 mt-1`}>{stat.value}</p>
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
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
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        No staff members found matching your search criteria.
                                    </td>
                                </tr>
                            ) : staff.map((member) => (
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
                                                        password: ''
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
                                {!showEditModal && (
                                    <div className="space-y-2 md:col-span-2">
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
            </AnimatePresence>
        </div>
    );
};

export default AdminStaff;
