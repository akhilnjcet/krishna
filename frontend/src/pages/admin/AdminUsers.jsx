import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { 
  Users, UserPlus, Search, Filter, Mail, Phone, Shield, 
  Trash2, Edit, X, Check, Loader2, AlertCircle, Calendar, Briefcase, DollarSign
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
    const [filterStatus, setFilterStatus] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'customer',
        phone: '',
        status: 'active',
        staff_id: '',
        department: '',
        designation: '',
        base_salary: ''
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/auth/admin/users?search=${searchQuery}&role=${filterRole}&status=${filterStatus}`);
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterRole, filterStatus]);

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
            role: 'customer',
            phone: '',
            status: 'active',
            staff_id: '',
            department: '',
            designation: '',
            base_salary: ''
        });
        setSelectedUser(null);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            username: user.username || '',
            password: '', 
            role: user.role || 'customer',
            phone: user.phone || '',
            status: user.status || 'active',
            staff_id: user.staff_id || '',
            department: user.department || '',
            designation: user.designation || '',
            base_salary: user.base_salary || ''
        });
        setShowEditModal(true);
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50';
            case 'staff':
                return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50';
            case 'customer':
            default:
                return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50';
        }
    };

    const getStatusBadge = (status) => {
        return status === 'active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' 
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 dark:bg-slate-800/50 dark:text-slate-400';
    };

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 dark:bg-slate-800 dark:bg-[#0A0A0B] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic uppercase tracking-tighter">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-[#2563EB]" />
                        User Accounts Management
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 dark:text-dark-muted mt-2 font-bold uppercase tracking-widest opacity-60">Manage Admins, Staff, and Customer Logins</p>
                </div>
                
                <button 
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-95 self-start md:self-auto"
                >
                    <UserPlus className="w-5 h-5" /> Add New User
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface p-6 rounded-3xl border border-[#E2E8F0] dark:border-dark-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search name, email, username or staff ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                    />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <Filter className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
                        <select 
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Administrator</option>
                            <option value="staff">Staff</option>
                            <option value="customer">Customer / Client</option>
                        </select>
                    </div>

                    <div className="relative flex-1 md:w-48">
                        <Filter className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border rounded-3xl p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-dark-muted font-bold uppercase tracking-wider">Synchronizing User Ledger...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 dark:text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text">No User Accounts Found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-dark-muted mt-1 max-w-xs">Adjust your search parameters or register a new system profile.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white dark:bg-slate-900 dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 dark:border-dark-border text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-800/50 dark:bg-dark-bg/30">
                                        <th className="py-4 px-6">User / Account</th>
                                        <th className="py-4 px-6">System Role</th>
                                        <th className="py-4 px-6">Designation / Staff Details</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Registered On</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                                    {users.map((user) => (
                                        <tr key={user._id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-dark-bg/25 transition-colors">
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-black text-sm uppercase">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-dark-muted mt-0.5">{user.email}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-dark-muted font-mono mt-0.5">@{user.username || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${getRoleBadge(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                {user.role === 'staff' ? (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text flex items-center gap-1">
                                                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                                            {user.designation || 'Staff'} ({user.department || 'General'})
                                                        </p>
                                                        {user.staff_id && (
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-dark-muted font-mono">
                                                                ID: {user.staff_id}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-dark-muted italic">Non-Staff Account</span>
                                                )}
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(user.status)}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                    {user.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-xs text-slate-600 dark:text-slate-400 dark:text-dark-muted font-semibold">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all dark:bg-dark-bg dark:border-dark-border dark:text-dark-muted dark:hover:text-blue-400"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {user._id !== "00000000000000000000ad14" && (
                                                        <button 
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 transition-all dark:bg-dark-bg dark:border-dark-border dark:text-dark-muted dark:hover:text-rose-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card Grid View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:hidden">
                        {users.map((user) => (
                            <div key={user._id} className="bg-white dark:bg-slate-900 dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border p-6 rounded-3xl space-y-4 shadow-sm">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm uppercase">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{user.name}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-dark-muted mt-0.5 truncate max-w-[180px]">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                    </span>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-800 dark:border-dark-border pt-3 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 dark:text-dark-muted">Username:</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300 dark:text-dark-text">@{user.username || 'N/A'}</span>
                                    </div>
                                    {user.phone && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 dark:text-dark-muted">Phone:</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text">{user.phone}</span>
                                        </div>
                                    )}
                                    {user.role === 'staff' && (
                                        <>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400 dark:text-dark-muted">Staff Detail:</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text">{user.designation || 'Staff'} ({user.department || 'General'})</span>
                                            </div>
                                            {user.staff_id && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400 dark:text-dark-muted">Staff ID:</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-300 dark:text-dark-text">{user.staff_id}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="flex justify-between items-center text-xs pt-1">
                                        <span className="text-slate-400 dark:text-dark-muted">Status:</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(user.status)}`}>
                                            {user.status || 'Active'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 dark:border-dark-border">
                                    <button 
                                        onClick={() => openEditModal(user)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border text-slate-600 dark:text-slate-400 dark:text-dark-text hover:text-blue-600 rounded-xl text-xs font-bold transition-all"
                                    >
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    {user._id !== "00000000000000000000ad14" && (
                                        <button 
                                            onClick={() => handleDeleteUser(user._id)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 dark:border-dark-border text-slate-600 dark:text-slate-400 dark:text-dark-text hover:text-rose-600 rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
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
                            className="bg-white dark:bg-slate-900 dark:bg-dark-surface border border-[#E2E8F0] dark:border-dark-border rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative my-8"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg/25">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                        {showAddModal ? "Register System User" : "Modify User Account"}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest opacity-60">
                                        {showAddModal ? "Configure new authentication credentials" : "Edit credential settings and parameters"}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-dark-bg rounded-xl transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={showAddModal ? handleAddUser : handleEditUser} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Full Name *</label>
                                        <input 
                                            type="text" 
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Email Address *</label>
                                        <input 
                                            type="email" 
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
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
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
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
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                            required={showAddModal}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">System Role *</label>
                                        <select 
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="customer">Customer / Client</option>
                                            <option value="staff">Staff Member</option>
                                            <option value="admin">System Administrator</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Account Status</label>
                                        <select 
                                            value={formData.status}
                                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-dark-text focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Conditional Staff Fields */}
                                {formData.role === 'staff' && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-slate-100 dark:border-slate-800 dark:border-dark-border pt-6 mt-6 space-y-6"
                                    >
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#2563EB] mb-4">Enterprise Staff Parameters</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Staff Employee ID</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.staff_id}
                                                    onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                                    placeholder="EMP-XXXX"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Department</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                                    placeholder="e.g. Engineering, Sales, Admin"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Designation</label>
                                                <input 
                                                    type="text" 
                                                    value={formData.designation}
                                                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                                    placeholder="e.g. Chief Engineer, Site Manager"
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
                                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg border border-[#E2E8F0] dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-dark-text"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Form Action Buttons */}
                                <div className="border-t border-slate-100 dark:border-slate-800 dark:border-dark-border pt-6 flex justify-end gap-4 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg/25 p-6 -mx-8 -mb-8">
                                    <button 
                                        type="button"
                                        onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                        className="px-6 py-3 border border-slate-200 dark:border-slate-700 dark:border-dark-border hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-dark-bg text-slate-500 dark:text-slate-400 dark:text-dark-muted font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
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
