import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { 
  Users, UserPlus, Search, Filter, Mail, Phone, Shield, 
  Trash2, Edit, X, Check, Loader2, AlertCircle, Calendar, Briefcase, DollarSign,
  Truck, ArrowLeftRight, UserCheck, UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterClassification, setFilterClassification] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'staff',
        staffClassification: 'Staff',
        phone: '',
        status: 'active',
        staff_id: '',
        department: '',
        designation: '',
        base_salary: '',
        bloodGroup: ''
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (filterRole) params.role = filterRole;
            if (filterClassification) params.classification = filterClassification;
            if (filterStatus) params.status = filterStatus;

            const res = await api.get('/auth/admin/users', { params });
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterRole, filterClassification, filterStatus]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/admin/users', formData);
            fetchUsers();
            setShowAddModal(false);
            resetForm();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add user.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/auth/admin/users/${selectedUser._id}`, formData);
            fetchUsers();
            setShowEditModal(false);
            resetForm();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update user.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleClassification = async (user) => {
        const nextState = user.staffClassification === 'Staff' ? 'Non-Staff' : 'Staff';
        const confirmMsg = `Are you sure you want to change ${user.name}'s account classification to "${nextState}"?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await api.put(`/auth/admin/users/${user._id}/classification`, { staffClassification: nextState });
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update classification.");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await api.delete(`/auth/admin/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete user.");
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            username: '',
            password: '',
            role: 'staff',
            staffClassification: 'Staff',
            phone: '',
            status: 'active',
            staff_id: '',
            department: '',
            designation: '',
            base_salary: '',
            bloodGroup: ''
        });
        setSelectedUser(null);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        const resolvedClassification = user.staffClassification || (user.role === 'customer' ? 'Non-Staff' : 'Staff');
        setFormData({
            name: user.name || '',
            email: user.email || '',
            username: user.username || '',
            password: '', 
            role: user.role || 'customer',
            staffClassification: resolvedClassification,
            phone: user.phone || user.phoneNumber || '',
            status: user.status || 'active',
            staff_id: user.staff_id || '',
            department: user.department || (user.role === 'driver' ? 'Logistics & Fleet' : ''),
            designation: user.designation || (user.role === 'driver' ? 'Driver' : ''),
            base_salary: user.base_salary || '',
            bloodGroup: user.bloodGroup || ''
        });
        setShowEditModal(true);
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
            case 'driver':
                return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900';
            case 'staff':
                return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900';
            case 'customer':
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        }
    };

    const getClassificationBadge = (user) => {
        const isNonStaff = user.staffClassification === 'Non-Staff' || (!user.staffClassification && user.role === 'customer');
        if (isNonStaff) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    NON-STAFF
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <Shield className="w-3 h-3 text-emerald-500" />
                STAFF ACCOUNT
            </span>
        );
    };

    const getStatusBadge = (status) => {
        return status === 'active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    };

    const isStaffEligible = formData.role === 'staff' || formData.role === 'driver' || formData.staffClassification === 'Staff';

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 dark:bg-[#0A0A0B] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic uppercase tracking-tighter">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-[#2563EB]" />
                        User Accounts Management
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest opacity-60">
                        Manage Admins, Staff, Drivers & Customer Classifications
                    </p>
                </div>
                
                <button 
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95 self-start md:self-auto"
                >
                    <UserPlus className="w-5 h-5" /> Add New User
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search name, email, username or staff ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                    {/* Classification Filter */}
                    <div className="relative">
                        <Filter className="absolute left-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
                        <select 
                            value={filterClassification}
                            onChange={(e) => setFilterClassification(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">All Classifications</option>
                            <option value="staff">Staff Accounts Only</option>
                            <option value="non-staff">Non-Staff Accounts Only</option>
                        </select>
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <Filter className="absolute left-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
                        <select 
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Administrator</option>
                            <option value="staff">Staff Member</option>
                            <option value="driver">Driver</option>
                            <option value="customer">Customer / Client</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-4 top-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Data Display */}
            {loading ? (
                <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Synchronizing User Ledger...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No User Accounts Found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Adjust your search parameters or register a new system profile.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                                        <th className="py-4 px-6">User / Account</th>
                                        <th className="py-4 px-6">Classification</th>
                                        <th className="py-4 px-6">System Role</th>
                                        <th className="py-4 px-6">Designation / Staff Details</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {users.map((user) => {
                                        const isStaffUser = user.role === 'staff' || user.role === 'driver' || user.staffClassification === 'Staff';
                                        return (
                                            <tr key={user._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-black text-sm uppercase">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">@{user.username || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    {getClassificationBadge(user)}
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${getRoleBadge(user.role)}`}>
                                                        {user.role === 'driver' ? 'Driver 🚚' : user.role}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6">
                                                    {isStaffUser ? (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                                {user.role === 'driver' ? (
                                                                    <Truck className="w-3.5 h-3.5 text-cyan-500" />
                                                                ) : (
                                                                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                                                )}
                                                                {user.designation || (user.role === 'driver' ? 'Driver' : 'Staff')} ({user.department || (user.role === 'driver' ? 'Logistics & Fleet' : 'General')})
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                {user.staff_id && (
                                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                                                        ID: {user.staff_id}
                                                                    </p>
                                                                )}
                                                                {user.bloodGroup && (
                                                                    <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                                                                        🩸 {user.bloodGroup}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                                                            Excluded from Staff List
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(user.status)}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                        {user.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleToggleClassification(user)}
                                                            title={`Switch to ${user.staffClassification === 'Staff' ? 'Non-Staff' : 'Staff'} Classification`}
                                                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 text-[11px] font-bold"
                                                        >
                                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">{user.staffClassification === 'Staff' ? 'Make Non-Staff' : 'Make Staff'}</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => openEditModal(user)}
                                                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 transition-all"
                                                            title="Edit User"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        {user._id !== "00000000000000000000ad14" && (
                                                            <button 
                                                                onClick={() => handleDeleteUser(user._id)}
                                                                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-all"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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

                    {/* Mobile Card Grid View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
                        {users.map((user) => {
                            const isStaffUser = user.role === 'staff' || user.role === 'driver' || user.staffClassification === 'Staff';
                            return (
                                <div key={user._id} className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm uppercase">
                                                {user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{user.name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[180px]">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getRoleBadge(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400">Classification:</span>
                                            {getClassificationBadge(user)}
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Username:</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">@{user.username || 'N/A'}</span>
                                        </div>
                                        {user.phone && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Phone:</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{user.phone}</span>
                                            </div>
                                        )}
                                        {isStaffUser && (
                                            <>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Staff Detail:</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {user.designation || (user.role === 'driver' ? 'Driver' : 'Staff')} ({user.department || (user.role === 'driver' ? 'Logistics & Fleet' : 'General')})
                                                    </span>
                                                </div>
                                                {user.staff_id && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Staff ID:</span>
                                                        <span className="font-mono text-slate-700 dark:text-slate-300">{user.staff_id}</span>
                                                    </div>
                                                )}
                                                {user.bloodGroup && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Blood Group:</span>
                                                        <span className="font-bold text-rose-600 dark:text-rose-400">🩸 {user.bloodGroup}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div className="flex justify-between items-center text-xs pt-1">
                                            <span className="text-slate-400">Status:</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(user.status)}`}>
                                                {user.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            onClick={() => handleToggleClassification(user)}
                                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                            <span>{user.staffClassification === 'Staff' ? 'Make Non-Staff' : 'Make Staff'}</span>
                                        </button>
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Edit className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        {user._id !== "00000000000000000000ad14" && (
                                            <button 
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl text-xs font-bold transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Modals */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#050506]/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-3xl md:rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto max-h-[92dvh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 shrink-0">
                                <div className="min-w-0 pr-2">
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic truncate">
                                        {showAddModal ? "Register System User" : "Modify User Account"}
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 uppercase font-bold tracking-widest opacity-60 truncate">
                                        Configure authentication role and staff/non-staff classification
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                                >
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={showAddModal ? handleAddUser : handleEditUser} className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
                                
                                {/* 1. Staff / Non-Staff Account Classification Selection */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <label className="block text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider mb-2">
                                        Account Classification *
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                                            formData.staffClassification === 'Staff' 
                                                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm' 
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="modalClassification" 
                                                value="Staff"
                                                checked={formData.staffClassification === 'Staff'}
                                                onChange={() => setFormData({ ...formData, staffClassification: 'Staff' })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-extrabold text-xs uppercase flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                    <Shield className="w-3.5 h-3.5" /> Staff Account
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                    Included in Staff Management, eligible for Driver/Staff ID card, attendance and shifts.
                                                </p>
                                            </div>
                                        </label>

                                        <label className={`cursor-pointer flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                                            formData.staffClassification === 'Non-Staff' 
                                                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100 shadow-sm' 
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="modalClassification" 
                                                value="Non-Staff"
                                                checked={formData.staffClassification === 'Non-Staff'}
                                                onChange={() => setFormData({ ...formData, staffClassification: 'Non-Staff' })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-extrabold text-xs uppercase flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Non-Staff Account
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                    External account (Client, Customer, Vendor). Excluded from normal staff records.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Full Name *</label>
                                        <input 
                                            type="text" 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Email Address *</label>
                                        <input 
                                            type="email" 
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Username</label>
                                        <input 
                                            type="text" 
                                            value={formData.username}
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            placeholder="defaults to email"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                                            {showAddModal ? "Password *" : "Reset Password"}
                                        </label>
                                        <input 
                                            type="password" 
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            placeholder={showEditModal ? "Leave blank to keep current" : ""}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                            required={showAddModal}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">System Role *</label>
                                        <select 
                                            value={formData.role}
                                            onChange={(e) => {
                                                const nextRole = e.target.value;
                                                const update = { ...formData, role: nextRole };
                                                if (nextRole === 'driver') {
                                                    if (!formData.designation) update.designation = 'Driver';
                                                    if (!formData.department) update.department = 'Logistics & Fleet';
                                                }
                                                setFormData(update);
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="staff">Staff Member</option>
                                            <option value="driver">Driver (Logistics & Fleet)</option>
                                            <option value="admin">System Administrator</option>
                                            <option value="customer">Customer / Client</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Account Status</label>
                                        <select 
                                            value={formData.status}
                                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Conditional Staff Fields (shown for Staff, Driver, or any Staff Classification) */}
                                {isStaffEligible && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6 space-y-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#2563EB]">
                                                {formData.role === 'driver' ? 'Driver & Staff Details' : 'Enterprise Staff Parameters'}
                                            </h4>
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                                Staff Management Linked
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Staff / Employee ID</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.staff_id}
                                                    onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                                    placeholder={formData.role === 'driver' ? 'DRV-XXXX' : 'EMP-XXXX'}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                                    placeholder={formData.role === 'driver' ? 'Logistics & Fleet' : 'e.g. Operations, Fabrication'}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.designation}
                                                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                                    placeholder={formData.role === 'driver' ? 'Driver' : 'e.g. Site Supervisor, Welder'}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Base Salary (INR)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">₹</span>
                                                    <input 
                                                        type="number" 
                                                        value={formData.base_salary}
                                                        onChange={(e) => setFormData({...formData, base_salary: e.target.value})}
                                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center justify-between">
                                                    <span>Blood Group</span>
                                                    <span className="text-[9px] font-bold text-rose-500 uppercase">ID Card & Emergency</span>
                                                </label>
                                                <select 
                                                    value={formData.bloodGroup}
                                                    onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Select Blood Group</option>
                                                    <option value="A+">A+ (A Positive)</option>
                                                    <option value="A-">A- (A Negative)</option>
                                                    <option value="B+">B+ (B Positive)</option>
                                                    <option value="B-">B- (B Negative)</option>
                                                    <option value="AB+">AB+ (AB Positive)</option>
                                                    <option value="AB-">AB- (AB Negative)</option>
                                                    <option value="O+">O+ (O Positive)</option>
                                                    <option value="O-">O- (O Negative)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Form Action Buttons */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 sm:p-6 md:p-8 -mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8">
                                    <button 
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                        className="w-full sm:w-auto px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-full sm:w-auto px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        {showAddModal ? "Create Account" : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminUsers;
