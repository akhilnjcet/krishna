import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Filter, Edit3, ShieldAlert, 
    MessageCircle, Mail, Phone, CheckCircle, XCircle,
    UserPlus, Download, Trash2, LayoutGrid, List
} from 'lucide-react';
import api from '../../services/api';

const AdminClients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    
    // Modal for editing
    const [editClient, setEditClient] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', status: 'active', password: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/users?role=customer');
            setClients(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/auth/${editClient._id}/admin-edit`, formData);
            alert('Krisha Buildings: Client Identity Updated.');
            setEditClient(null);
            fetchClients();
        } catch (err) {
            alert('Krisha Buildings: Identity Synchronization Failed');
        }
    };

    const filteredClients = clients.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Client Registry...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-3">
                        <Users className="w-4 h-4" /> Enterprise CRM
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Client Registry</h1>
                    <p className="text-slate-500 font-medium mt-2">Manage all registered customer identities across Lodge and Industrial sectors.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            placeholder="Search identities..." 
                            className="bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Clients Display */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(c => (
                        <div key={c._id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16"></div>
                            
                            <div className="flex items-center gap-5 mb-8 relative z-10">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-lg ${c.status === 'inactive' ? 'bg-rose-50 text-rose-600' : 'bg-blue-600 text-white'}`}>
                                    {c.name?.charAt(0) || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl font-black text-slate-900 truncate">{c.name}</h3>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block mt-1 ${c.status === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {c.status || 'active'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                                    <Mail className="w-4 h-4 text-slate-400" /> {c.email}
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                                    <Phone className="w-4 h-4 text-slate-400" /> {c.phone || c.phoneNumber || 'No Number'}
                                </div>
                            </div>

                            <div className="flex gap-2 relative z-10">
                                <button 
                                    onClick={() => {
                                        setEditClient(c);
                                        setFormData({ name: c.name, phone: c.phone || c.phoneNumber || '', email: c.email || '', status: c.status || 'active', password: '' });
                                    }}
                                    className="flex-1 bg-slate-50 text-slate-700 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                                >
                                    Edit Profile
                                </button>
                                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Client Identity</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Stream</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredClients.map(c => (
                                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100">
                                                {c.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{c.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {c._id.slice(-8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-slate-700">{c.email}</p>
                                        <p className="text-xs text-slate-400 font-medium">{c.phone || c.phoneNumber || 'N/A'}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.status === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {c.status || 'active'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => {
                                                setEditClient(c);
                                                setFormData({ name: c.name, phone: c.phone || c.phoneNumber || '', email: c.email || '', status: c.status || 'active', password: '' });
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editClient && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <form onSubmit={handleUpdate} className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-300">
                        <button type="button" onClick={() => setEditClient(null)} className="absolute top-10 right-10 text-slate-400 hover:text-rose-500 p-2 bg-slate-50 rounded-full transition-all">
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-10">
                            <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl shadow-blue-600/30">
                                {formData.name?.charAt(0) || 'U'}
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Edit Client Identity</h3>
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mt-2">Manual CRM Override</p>
                        </div>

                        <div className="space-y-4 mb-10">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Display Name</label>
                                <input 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                                <input 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone / WhatsApp</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Reset Passcode (Optional)</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="w-full bg-rose-50/50 border border-rose-100 p-5 rounded-2xl font-bold text-rose-900 outline-none focus:ring-2 focus:ring-rose-500 transition-all" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                />
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex-grow">Access Status</p>
                                <select 
                                    className="bg-white border border-slate-200 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-blue-600 outline-none" 
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Restricted</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                            Synchronize Identity Changes
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminClients;
